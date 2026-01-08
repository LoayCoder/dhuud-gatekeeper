import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ClientSiteRepCompany {
  id: string;
  company_name: string;
  company_name_ar: string | null;
  status: string;
  contract_start_date: string | null;
  contract_end_date: string | null;
  total_workers: number | null;
  email: string | null;
  phone: string | null;
}

export interface ClientSiteRepWorkerSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  blacklisted: number;
}

export interface ClientSiteRepProjectSummary {
  total: number;
  active: number;
  planned: number;
  completed: number;
  on_hold: number;
}

export interface ClientSiteRepGatePassSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
}

export interface ClientSiteRepIncidentSummary {
  total: number;
  open: number;
  under_investigation: number;
  closed: number;
}

export interface ClientSiteRepViolation {
  id: string;
  violation_type: string;
  severity: string;
  status: string;
  company_name: string;
  reported_at: string;
}

export interface ClientSiteRepPersonnel {
  safetyOfficers: {
    id: string;
    full_name: string;
    company_name: string;
  }[];
  contractorReps: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company_name: string;
  }[];
}

export function useClientSiteRepCompanies() {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["client-site-rep-companies", userId],
    queryFn: async () => {
      if (!userId || !tenantId) return [];

      const { data, error } = await supabase
        .from("contractor_companies")
        .select(`
          id, company_name, company_name_ar, status, 
          contract_start_date, contract_end_date, total_workers,
          email, phone
        `)
        .eq("client_site_rep_id", userId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("company_name");

      if (error) throw error;
      return data as ClientSiteRepCompany[];
    },
    enabled: !!userId && !!tenantId,
  });
}

export function useClientSiteRepWorkers(companyIds: string[]) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["client-site-rep-workers", companyIds],
    queryFn: async () => {
      if (!companyIds.length || !tenantId) {
        return { total: 0, approved: 0, pending: 0, rejected: 0, blacklisted: 0 };
      }

      const { data, error } = await supabase
        .from("contractor_workers")
        .select("id, approval_status")
        .in("company_id", companyIds)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (error) throw error;

      const summary: ClientSiteRepWorkerSummary = {
        total: data.length,
        approved: data.filter(w => w.approval_status === "approved").length,
        pending: data.filter(w => w.approval_status === "pending").length,
        rejected: data.filter(w => w.approval_status === "rejected").length,
        blacklisted: data.filter(w => w.approval_status === "blacklisted").length,
      };

      return summary;
    },
    enabled: companyIds.length > 0 && !!tenantId,
  });
}

export function useClientSiteRepProjects(companyIds: string[]) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["client-site-rep-projects", companyIds],
    queryFn: async () => {
      if (!companyIds.length || !tenantId) {
        return { total: 0, active: 0, planned: 0, completed: 0, on_hold: 0 };
      }

      const { data, error } = await supabase
        .from("contractor_projects")
        .select("id, status")
        .in("company_id", companyIds)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (error) throw error;

      const summary: ClientSiteRepProjectSummary = {
        total: data.length,
        active: data.filter(p => p.status === "active").length,
        planned: data.filter(p => p.status === "planned").length,
        completed: data.filter(p => p.status === "completed").length,
        on_hold: data.filter(p => p.status === "on_hold").length,
      };

      return summary;
    },
    enabled: companyIds.length > 0 && !!tenantId,
  });
}

export function useClientSiteRepGatePasses(companyIds: string[]) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["client-site-rep-gate-passes", companyIds],
    queryFn: async () => {
      if (!companyIds.length || !tenantId) {
        return { total: 0, pending: 0, approved: 0, rejected: 0, expired: 0 };
      }

      const { data, error } = await supabase
        .from("material_gate_passes")
        .select("id, status")
        .in("contractor_company_id", companyIds)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (error) throw error;

      const summary: ClientSiteRepGatePassSummary = {
        total: data.length,
        pending: data.filter(g => g.status === "pending").length,
        approved: data.filter(g => g.status === "approved").length,
        rejected: data.filter(g => g.status === "rejected").length,
        expired: data.filter(g => g.status === "expired").length,
      };

      return summary;
    },
    enabled: companyIds.length > 0 && !!tenantId,
  });
}

export function useClientSiteRepIncidents(companyIds: string[]) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["client-site-rep-incidents", companyIds],
    queryFn: async () => {
      if (!companyIds.length || !tenantId) {
        return { total: 0, open: 0, under_investigation: 0, closed: 0 };
      }

      const { data, error } = await supabase
        .from("incidents")
        .select("id, status")
        .in("related_contractor_company_id", companyIds)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (error) throw error;

      const summary: ClientSiteRepIncidentSummary = {
        total: data.length,
        open: data.filter(i => i.status === "submitted" || i.status === "pending_acknowledgment").length,
        under_investigation: data.filter(i => i.status === "investigation_in_progress").length,
        closed: data.filter(i => i.status === "closed" || i.status === "investigation_closed").length,
      };

      return summary;
    },
    enabled: companyIds.length > 0 && !!tenantId,
  });
}

export function useClientSiteRepViolations(companyIds: string[]) {
  // Violations feature - return empty for now if table doesn't exist
  return useQuery({
    queryKey: ["client-site-rep-violations", companyIds],
    queryFn: async () => {
      return [] as ClientSiteRepViolation[];
    },
    enabled: companyIds.length > 0,
  });
}

export function useClientSiteRepPersonnel(companyIds: string[]) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["client-site-rep-personnel", companyIds],
    queryFn: async () => {
      if (!companyIds.length || !tenantId) {
        return { safetyOfficers: [], contractorReps: [] };
      }

      // Fetch safety officers from contractor_workers with safety officer trade
      const { data: workers, error: workersError } = await supabase
        .from("contractor_workers")
        .select(`
          id, full_name, 
          company:contractor_companies!contractor_workers_company_id_fkey(company_name)
        `)
        .in("company_id", companyIds)
        .eq("tenant_id", tenantId)
        .eq("approval_status", "approved")
        .ilike("trade_name", "%safety%")
        .is("deleted_at", null);

      if (workersError) throw workersError;

      // Fetch contractor representatives
      const { data: reps, error: repsError } = await supabase
        .from("contractor_representatives")
        .select(`
          id, full_name, email, mobile_number,
          company:contractor_companies!contractor_representatives_company_id_fkey(company_name)
        `)
        .in("company_id", companyIds)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (repsError) throw repsError;

      return {
        safetyOfficers: (workers || []).map(w => ({
          id: w.id,
          full_name: w.full_name,
          company_name: (w.company as any)?.company_name || "Unknown",
        })),
        contractorReps: (reps || []).map(r => ({
          id: r.id,
          name: r.full_name,
          email: r.email,
          phone: r.mobile_number,
          company_name: (r.company as any)?.company_name || "Unknown",
        })),
      };
    },
    enabled: companyIds.length > 0 && !!tenantId,
  });
}

export function useClientSiteRepData() {
  const { data: companies = [], isLoading: companiesLoading } = useClientSiteRepCompanies();
  const companyIds = companies.map(c => c.id);

  const { data: workerSummary, isLoading: workersLoading } = useClientSiteRepWorkers(companyIds);
  const { data: projectSummary, isLoading: projectsLoading } = useClientSiteRepProjects(companyIds);
  const { data: gatePassSummary, isLoading: gatePassesLoading } = useClientSiteRepGatePasses(companyIds);
  const { data: incidentSummary, isLoading: incidentsLoading } = useClientSiteRepIncidents(companyIds);
  const { data: violations = [], isLoading: violationsLoading } = useClientSiteRepViolations(companyIds);
  const { data: personnel, isLoading: personnelLoading } = useClientSiteRepPersonnel(companyIds);

  return {
    companies,
    companyIds,
    workerSummary: workerSummary || { total: 0, approved: 0, pending: 0, rejected: 0, blacklisted: 0 },
    projectSummary: projectSummary || { total: 0, active: 0, planned: 0, completed: 0, on_hold: 0 },
    gatePassSummary: gatePassSummary || { total: 0, pending: 0, approved: 0, rejected: 0, expired: 0 },
    incidentSummary: incidentSummary || { total: 0, open: 0, under_investigation: 0, closed: 0 },
    violations,
    personnel: personnel || { safetyOfficers: [], contractorReps: [] },
    isLoading: companiesLoading || workersLoading || projectsLoading || gatePassesLoading || incidentsLoading || violationsLoading || personnelLoading,
  };
}
