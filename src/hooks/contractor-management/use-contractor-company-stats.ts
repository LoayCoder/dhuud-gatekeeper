import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ContractorCompanyStats {
  // Company counts by status
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  inactiveCompanies: number;
  expiredCompanies: number;
  
  // Worker counts
  totalWorkers: number;
  approvedWorkers: number;
  pendingWorkers: number;
  rejectedWorkers: number;
  
  // Contract health
  expiringContracts: number; // within 30 days
  
  // Distribution data
  statusDistribution: { name: string; value: number; fill: string }[];
  cityDistribution: { city: string; count: number }[];
  topCompaniesByWorkers: { name: string; approved: number; pending: number; total: number }[];
}

export function useContractorCompanyStats() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-company-stats", tenantId],
    queryFn: async (): Promise<ContractorCompanyStats> => {
      if (!tenantId) throw new Error("No tenant ID");

      // Fetch all companies with their status
      const { data: companies, error: companiesError } = await supabase
        .from("contractor_companies")
        .select("id, status, city, contract_end_date, company_name")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (companiesError) throw companiesError;

      // Fetch all workers with their approval_status
      const { data: workers, error: workersError } = await supabase
        .from("contractor_workers")
        .select("id, approval_status, company_id")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (workersError) throw workersError;

      // Create company name map
      const companyNameMap = new Map(
        companies?.map((c) => [c.id, c.company_name]) || []
      );

      // Calculate company counts by status
      const statusCounts = {
        active: 0,
        suspended: 0,
        inactive: 0,
        expired: 0,
      };

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      let expiringContracts = 0;

      const cityMap = new Map<string, number>();

      companies?.forEach((company) => {
        const status = company.status as keyof typeof statusCounts;
        if (status in statusCounts) {
          statusCounts[status]++;
        }

        // Check for expiring contracts
        if (company.contract_end_date) {
          const endDate = new Date(company.contract_end_date);
          if (endDate > now && endDate <= thirtyDaysFromNow) {
            expiringContracts++;
          }
        }

        // City distribution
        const city = company.city || "Unknown";
        cityMap.set(city, (cityMap.get(city) || 0) + 1);
      });

      // Calculate worker counts based on approval_status
      const workerCounts = {
        approved: 0,
        pending: 0,
        rejected: 0,
      };

      const workersByCompany = new Map<string, { approved: number; pending: number }>();

      workers?.forEach((worker) => {
        const status = worker.approval_status as keyof typeof workerCounts;
        if (status in workerCounts) {
          workerCounts[status]++;
        }

        // Workers by company
        const companyId = worker.company_id;
        if (!workersByCompany.has(companyId)) {
          workersByCompany.set(companyId, { approved: 0, pending: 0 });
        }
        const companyWorkers = workersByCompany.get(companyId)!;
        if (worker.approval_status === "approved") {
          companyWorkers.approved++;
        } else if (worker.approval_status === "pending") {
          companyWorkers.pending++;
        }
      });

      // Status distribution for pie chart with HSSA colors
      const statusDistribution = [
        { name: "Active", value: statusCounts.active, fill: "hsl(142 71% 45%)" },
        { name: "Suspended", value: statusCounts.suspended, fill: "hsl(0 84% 60%)" },
        { name: "Inactive", value: statusCounts.inactive, fill: "hsl(215 16% 47%)" },
        { name: "Expired", value: statusCounts.expired, fill: "hsl(27 96% 61%)" },
      ].filter(item => item.value > 0);

      // City distribution for bar chart
      const cityDistribution = Array.from(cityMap.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top companies by workers
      const topCompaniesByWorkers = Array.from(workersByCompany.entries())
        .map(([companyId, counts]) => ({
          name: companyNameMap.get(companyId) || "Unknown",
          approved: counts.approved,
          pending: counts.pending,
          total: counts.approved + counts.pending,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      return {
        totalCompanies: companies?.length || 0,
        activeCompanies: statusCounts.active,
        suspendedCompanies: statusCounts.suspended,
        inactiveCompanies: statusCounts.inactive,
        expiredCompanies: statusCounts.expired,
        totalWorkers: workers?.length || 0,
        approvedWorkers: workerCounts.approved,
        pendingWorkers: workerCounts.pending,
        rejectedWorkers: workerCounts.rejected,
        expiringContracts,
        statusDistribution,
        cityDistribution,
        topCompaniesByWorkers,
      };
    },
    enabled: !!tenantId,
  });
}
