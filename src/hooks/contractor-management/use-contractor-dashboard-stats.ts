import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ContractorDashboardStats {
  // Companies
  companies: {
    total: number;
    active: number;
    suspended: number;
    inactive: number;
    expired: number;
  };

  // Workers
  workers: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    blacklisted: number;
  };

  // Projects
  projects: {
    total: number;
    active: number;
    planned: number;
    completed: number;
    suspended: number;
  };

  // Gate Passes
  gatePasses: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    expired: number;
  };

  // Safety Officers
  safetyOfficers: {
    total: number;
    ratio: number;
    ratioDisplay: string;
    coveragePercent: number;
    status: "good" | "warning" | "critical";
  };

  // HSSE Events (Incidents)
  hsseEvents: {
    total: number;
    open: number;
    investigating: number;
    closed: number;
  };

  // PTW (Permit to Work)
  permits: {
    active: number;
    pending: number;
    expired: number;
    total: number;
  };

  // Risk Assessments
  riskAssessments: {
    total: number;
    approved: number;
    pending: number;
    expired: number;
    highRisk: number;
  };

  // Onsite Workers (real-time)
  onsiteWorkers: {
    count: number;
  };

  // Blacklist
  blacklist: {
    total: number;
    recentCount: number;
  };

  // Expiring Contracts
  expiringContracts: number;
}

// Safety officer coverage thresholds (workers per officer)
const COVERAGE_THRESHOLDS = {
  GOOD: 20, // 1:20 or better is good
  WARNING: 50, // 1:21-50 is warning
  // Above 50 is critical
};

export function useContractorDashboardStats() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-dashboard-stats", tenantId],
    queryFn: async (): Promise<ContractorDashboardStats> => {
      if (!tenantId) {
        throw new Error("No tenant ID");
      }

      // Fetch all data in parallel
      const [
        companiesResult,
        workersResult,
        projectsResult,
        gatePassesResult,
        safetyOfficersResult,
        incidentsResult,
        permitsResult,
        riskAssessmentsResult,
        onsiteResult,
        blacklistResult,
      ] = await Promise.all([
        // Companies
        supabase
          .from("contractor_companies")
          .select("id, status")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null),

        // Workers
        supabase
          .from("contractor_workers")
          .select("id, approval_status")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null),

        // Projects
        supabase
          .from("contractor_projects")
          .select("id, status")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null),

        // Gate Passes
        supabase
          .from("material_gate_passes")
          .select("id, status, pass_date")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null),

        // Safety Officers (all non-deleted are considered active)
        supabase
          .from("contractor_safety_officers")
          .select("id")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null),

        // Incidents (HSSE Events) - contractor related
        supabase
          .from("incidents")
          .select("id, status")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null),

        // PTW Permits - use correct columns: planned_end_time instead of valid_until
        supabase
          .from("ptw_permits")
          .select("id, status, planned_end_time")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null),

        // Risk Assessments - use correct columns: overall_risk_rating, valid_until
        supabase
          .from("risk_assessments")
          .select("id, status, overall_risk_rating, valid_until")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null),

        // Onsite Workers (gate entries without exit)
        supabase
          .from("gate_entry_logs")
          .select("id")
          .eq("tenant_id", tenantId)
          .is("exit_time", null),

        // Blacklist - use listed_at instead of created_at
        supabase
          .from("security_blacklist")
          .select("id, listed_at")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null),
      ]);

      // Process companies
      const companies = companiesResult.data || [];
      const companiesStats = {
        total: companies.length,
        active: companies.filter((c) => c.status === "active").length,
        suspended: companies.filter((c) => c.status === "suspended").length,
        inactive: companies.filter((c) => c.status === "inactive").length,
        expired: companies.filter((c) => c.status === "expired").length,
      };

      // Process workers
      const workers = workersResult.data || [];
      const workersStats = {
        total: workers.length,
        approved: workers.filter((w) => w.approval_status === "approved").length,
        pending: workers.filter((w) => w.approval_status === "pending").length,
        rejected: workers.filter((w) => w.approval_status === "rejected").length,
        blacklisted: 0, // Will be set from blacklist count
      };

      // Process projects
      const projects = projectsResult.data || [];
      const projectsStats = {
        total: projects.length,
        active: projects.filter((p) => p.status === "active").length,
        planned: projects.filter((p) => p.status === "planned").length,
        completed: projects.filter((p) => p.status === "completed").length,
        suspended: projects.filter((p) => p.status === "suspended" || p.status === "on_hold").length,
      };

      // Process gate passes
      const gatePasses = gatePassesResult.data || [];
      const now = new Date();
      const gatePassesStats = {
        total: gatePasses.length,
        approved: gatePasses.filter((g) => g.status === "approved").length,
        pending: gatePasses.filter((g) => g.status === "pending").length,
        rejected: gatePasses.filter((g) => g.status === "rejected").length,
        expired: gatePasses.filter((g) => {
          if (g.status === "expired") return true;
          if (g.pass_date && new Date(g.pass_date) < now && g.status !== "approved") return true;
          return false;
        }).length,
      };

      // Process safety officers
      const safetyOfficers = safetyOfficersResult.data || [];
      const officerCount = safetyOfficers.length;
      const workerCount = workersStats.approved;

      let ratio = 0;
      let ratioDisplay = "N/A";
      let coveragePercent = 0;
      let status: "good" | "warning" | "critical" = "critical";

      if (officerCount > 0 && workerCount > 0) {
        ratio = workerCount / officerCount;
        ratioDisplay = `1:${Math.round(ratio)}`;
        
        // Calculate coverage percentage (inverse - lower ratio is better)
        if (ratio <= COVERAGE_THRESHOLDS.GOOD) {
          coveragePercent = 100;
          status = "good";
        } else if (ratio <= COVERAGE_THRESHOLDS.WARNING) {
          coveragePercent = Math.round(70 + (30 * (COVERAGE_THRESHOLDS.WARNING - ratio) / (COVERAGE_THRESHOLDS.WARNING - COVERAGE_THRESHOLDS.GOOD)));
          status = "warning";
        } else {
          coveragePercent = Math.max(10, Math.round(70 * (COVERAGE_THRESHOLDS.WARNING / ratio)));
          status = "critical";
        }
      } else if (officerCount === 0 && workerCount > 0) {
        ratioDisplay = "No Officers";
        status = "critical";
        coveragePercent = 0;
      } else if (workerCount === 0) {
        ratioDisplay = "No Workers";
        coveragePercent = 100;
        status = "good";
      }

      const safetyOfficersStats = {
        total: officerCount,
        ratio,
        ratioDisplay,
        coveragePercent,
        status,
      };

      // Process incidents (HSSE Events)
      const incidents = incidentsResult.data || [];
      const openStatuses = ["reported", "open", "pending_review"];
      const investigatingStatuses = ["investigation_in_progress", "under_investigation"];
      const closedStatuses = ["closed", "resolved", "no_action_required"];

      const hsseEventsStats = {
        total: incidents.length,
        open: incidents.filter((i) => openStatuses.includes(i.status || "")).length,
        investigating: incidents.filter((i) => investigatingStatuses.includes(i.status || "")).length,
        closed: incidents.filter((i) => closedStatuses.includes(i.status || "")).length,
      };

      // Process PTW permits - use planned_end_time
      const permits = permitsResult.data || [];
      const permitsStats = {
        total: permits.length,
        active: permits.filter((p) => p.status === "active" || p.status === "approved").length,
        pending: permits.filter((p) => p.status === "pending" || p.status === "draft").length,
        expired: permits.filter((p) => {
          if (p.status === "expired" || p.status === "closed") return true;
          if (p.planned_end_time && new Date(p.planned_end_time) < now) return true;
          return false;
        }).length,
      };

      // Process risk assessments - use overall_risk_rating, valid_until
      const riskAssessments = riskAssessmentsResult.data || [];
      const riskAssessmentsStats = {
        total: riskAssessments.length,
        approved: riskAssessments.filter((r) => r.status === "approved" || r.status === "active").length,
        pending: riskAssessments.filter((r) => r.status === "draft" || r.status === "pending_review").length,
        expired: riskAssessments.filter((r) => {
          if (r.status === "expired") return true;
          if (r.valid_until && new Date(r.valid_until) < now) return true;
          return false;
        }).length,
        highRisk: riskAssessments.filter((r) => r.overall_risk_rating === "high" || r.overall_risk_rating === "critical").length,
      };

      // Process onsite workers
      const onsiteStats = {
        count: onsiteResult.data?.length || 0,
      };

      // Process blacklist - use listed_at
      const blacklist = blacklistResult.data || [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const blacklistStats = {
        total: blacklist.length,
        recentCount: blacklist.filter((b) => b.listed_at && new Date(b.listed_at) > sevenDaysAgo).length,
      };

      // Update workers blacklisted count
      workersStats.blacklisted = blacklistStats.total;

      // Calculate expiring contracts (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: expiringCompanies } = await supabase
        .from("contractor_companies")
        .select("id")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .lt("contract_end_date", thirtyDaysFromNow.toISOString())
        .gt("contract_end_date", now.toISOString());

      return {
        companies: companiesStats,
        workers: workersStats,
        projects: projectsStats,
        gatePasses: gatePassesStats,
        safetyOfficers: safetyOfficersStats,
        hsseEvents: hsseEventsStats,
        permits: permitsStats,
        riskAssessments: riskAssessmentsStats,
        onsiteWorkers: onsiteStats,
        blacklist: blacklistStats,
        expiringContracts: expiringCompanies?.length || 0,
      };
    },
    enabled: !!tenantId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute for real-time feel
  });
}
