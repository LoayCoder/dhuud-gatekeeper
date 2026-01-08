import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ClientSiteRepCompany {
  id: string;
  company_name: string;
  company_name_ar: string | null;
  status: string;
  contract_start_date: string | null;
  contract_end_date: string | null;
  total_workers: number;
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

export interface ClientSiteRepWorkerDetail {
  id: string;
  full_name: string;
  worker_id: string | null;
  mobile_number: string | null;
  approval_status: string;
  company_name: string;
}

export interface ClientSiteRepGatePassDetail {
  id: string;
  pass_number: string;
  status: string;
  pass_date: string | null;
  material_description: string | null;
  company_name: string;
}

export interface ClientSiteRepIncidentDetail {
  id: string;
  incident_number: string;
  description: string | null;
  status: string;
  event_type: string;
  occurred_at: string | null;
}

export interface ClientSiteRepProjectDetail {
  id: string;
  project_name: string;
  status: string;
  start_date: string | null;
  company_name: string;
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

// Validation helper for data sources
function validateWidgetData(name: string, data: unknown): boolean {
  if (data === null || data === undefined) {
    console.error(`[Dashboard Validation] ${name}: No data source connected`);
    return false;
  }
  return true;
}

export function useClientSiteRepCompanies() {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["client-site-rep-companies", userId],
    queryFn: async () => {
      if (!userId || !tenantId) return [];

      // First fetch companies
      const { data: companies, error } = await supabase
        .from("contractor_companies")
        .select(`
          id, company_name, company_name_ar, status, 
          contract_start_date, contract_end_date,
          email, phone
        `)
        .eq("client_site_rep_id", userId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("company_name");

      if (error) throw error;
      if (!companies?.length) return [];

      const companyIds = companies.map(c => c.id);

      // Fetch worker counts per company dynamically
      const { data: workerCounts, error: workerError } = await supabase
        .from("contractor_workers")
        .select("company_id")
        .in("company_id", companyIds)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (workerError) {
        console.error("Error fetching worker counts:", workerError);
      }

      // Count workers per company
      const countMap = (workerCounts || []).reduce((acc, w) => {
        acc[w.company_id] = (acc[w.company_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Map companies with dynamic worker counts
      return companies.map(c => ({
        ...c,
        total_workers: countMap[c.id] || 0,
      })) as ClientSiteRepCompany[];
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
        return { 
          summary: { total: 0, approved: 0, pending: 0, rejected: 0, blacklisted: 0 },
          recentWorkers: [] as ClientSiteRepWorkerDetail[]
        };
      }

      const { data, error } = await supabase
        .from("contractor_workers")
        .select(`
          id, full_name, national_id, mobile_number, approval_status,
          company:contractor_companies!contractor_workers_company_id_fkey(company_name)
        `)
        .in("company_id", companyIds)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      type WorkerRow = {
        id: string;
        full_name: string;
        national_id: string | null;
        mobile_number: string | null;
        approval_status: string;
        company: { company_name?: string } | null;
      };
      const rows = (data || []) as unknown as WorkerRow[];

      const summary: ClientSiteRepWorkerSummary = {
        total: rows.length,
        approved: rows.filter(w => w.approval_status === "approved").length,
        pending: rows.filter(w => w.approval_status === "pending").length,
        rejected: rows.filter(w => w.approval_status === "rejected").length,
        blacklisted: rows.filter(w => w.approval_status === "blacklisted").length,
      };

      const recentWorkers: ClientSiteRepWorkerDetail[] = rows.slice(0, 5).map(w => ({
        id: w.id,
        full_name: w.full_name,
        worker_id: w.national_id,
        mobile_number: w.mobile_number,
        approval_status: w.approval_status,
        company_name: w.company?.company_name || "Unknown",
      }));

      return { summary, recentWorkers };
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
        return { 
          summary: { total: 0, active: 0, planned: 0, completed: 0, on_hold: 0 },
          recentProjects: [] as ClientSiteRepProjectDetail[]
        };
      }

      const { data, error } = await supabase
        .from("contractor_projects")
        .select(`
          id, project_name, status, start_date,
          company:contractor_companies!contractor_projects_company_id_fkey(company_name)
        `)
        .in("company_id", companyIds)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Include 'suspended' in on_hold count
      const summary: ClientSiteRepProjectSummary = {
        total: data.length,
        active: data.filter(p => p.status === "active").length,
        planned: data.filter(p => p.status === "planned").length,
        completed: data.filter(p => p.status === "completed").length,
        on_hold: data.filter(p => p.status === "on_hold" || p.status === "suspended").length,
      };

      const recentProjects: ClientSiteRepProjectDetail[] = data.slice(0, 5).map(p => ({
        id: p.id,
        project_name: p.project_name,
        status: p.status,
        start_date: p.start_date,
        company_name: (p.company as { company_name?: string })?.company_name || "Unknown",
      }));

      return { summary, recentProjects };
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
        return { 
          summary: { total: 0, pending: 0, approved: 0, rejected: 0, expired: 0 },
          recentGatePasses: [] as ClientSiteRepGatePassDetail[]
        };
      }

      type GatePassRow = { 
        id: string; 
        reference_number: string;
        status: string; 
        pass_date: string | null;
        material_description: string | null;
        company: { company_name?: string } | null;
      };
      
      const { data, error } = await supabase
        .from("material_gate_passes")
        .select(`
          id, reference_number, status, pass_date, material_description,
          company:contractor_companies!material_gate_passes_company_id_fkey(company_name)
        `)
        .filter("company_id", "in", `(${companyIds.join(",")})`)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      const rows = (data || []) as unknown as GatePassRow[];
      const today = new Date().toISOString().split('T')[0];

      const terminalStatuses = ['completed', 'rejected', 'expired'];
      const expiredCount = rows.filter(g => 
        g.status === "expired" || 
        (g.pass_date && g.pass_date < today && !terminalStatuses.includes(g.status))
      ).length;

      const summary: ClientSiteRepGatePassSummary = {
        total: rows.length,
        pending: rows.filter(g => g.status === "pending").length,
        approved: rows.filter(g => g.status === "approved").length,
        rejected: rows.filter(g => g.status === "rejected").length,
        expired: expiredCount,
      };

      const recentGatePasses: ClientSiteRepGatePassDetail[] = rows.slice(0, 5).map(g => ({
        id: g.id,
        pass_number: g.reference_number,
        status: g.status,
        pass_date: g.pass_date,
        material_description: g.material_description,
        company_name: g.company?.company_name || "Unknown",
      }));

      return { summary, recentGatePasses };
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
        return { 
          summary: { total: 0, open: 0, under_investigation: 0, closed: 0 },
          recentIncidents: [] as ClientSiteRepIncidentDetail[]
        };
      }

      type IncidentRow = {
        id: string;
        incident_number: string;
        description: string | null;
        status: string;
        event_type: string;
        occurred_at: string | null;
      };

      const { data, error } = await supabase
        .from("incidents")
        .select("id, incident_number, description, status, event_type, occurred_at")
        .in("related_contractor_company_id", companyIds)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }) as { data: IncidentRow[] | null; error: unknown };

      if (error) throw error;
      const rows = data || [];

      const openStatuses = [
        "submitted", 
        "pending_review", 
        "pending_dept_rep_approval", 
        "pending_manager_approval"
      ];

      const summary: ClientSiteRepIncidentSummary = {
        total: rows.length,
        open: rows.filter(i => openStatuses.includes(i.status)).length,
        under_investigation: rows.filter(i => i.status === "investigation_in_progress").length,
        closed: rows.filter(i => i.status === "closed" || i.status === "investigation_closed").length,
      };

      const recentIncidents: ClientSiteRepIncidentDetail[] = rows.slice(0, 5).map(i => ({
        id: i.id,
        incident_number: i.incident_number,
        description: i.description,
        status: i.status,
        event_type: i.event_type || "incident",
        occurred_at: i.occurred_at,
      }));

      return { summary, recentIncidents };
    },
    enabled: companyIds.length > 0 && !!tenantId,
  });
}

export function useClientSiteRepViolations(companyIds: string[]) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["client-site-rep-violations", companyIds],
    queryFn: async () => {
      if (!companyIds.length || !tenantId) return [];

      // Query from incident_violation_lifecycle table
      const { data, error } = await supabase
        .from("incident_violation_lifecycle")
        .select(`
          id, 
          contractor_company_id,
          final_status,
          identified_at,
          violation_type:violation_types(name, name_ar, severity_level),
          company:contractor_companies(company_name)
        `)
        .in("contractor_company_id", companyIds)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("identified_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching violations:", error);
        return [];
      }
      
      return (data || []).map(v => ({
        id: v.id,
        violation_type: (v.violation_type as { name?: string })?.name || "Unknown",
        severity: (v.violation_type as { severity_level?: string })?.severity_level || "medium",
        status: v.final_status || "open",
        company_name: (v.company as { company_name?: string })?.company_name || "Unknown",
        reported_at: v.identified_at || new Date().toISOString(),
      })) as ClientSiteRepViolation[];
    },
    enabled: companyIds.length > 0 && !!tenantId,
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

      // Fetch safety officers - workers with safety_officer_id set (they ARE the safety officer)
      // or workers linked to companies' safety officers
      const { data: workers, error: workersError } = await supabase
        .from("contractor_workers")
        .select(`
          id, full_name, worker_type,
          company:contractor_companies!contractor_workers_company_id_fkey(company_name)
        `)
        .in("company_id", companyIds)
        .eq("tenant_id", tenantId)
        .eq("approval_status", "approved")
        .is("deleted_at", null);

      if (workersError) {
        console.error("Error fetching workers:", workersError);
      }

      // Filter for safety-related worker types
      const safetyWorkers = (workers || []).filter(w => 
        w.worker_type === 'safety_officer' || 
        w.worker_type === 'hse_officer' ||
        (w.worker_type && w.worker_type.toLowerCase().includes('safety'))
      );

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

      if (repsError) {
        console.error("Error fetching contractor reps:", repsError);
      }

      return {
        safetyOfficers: safetyWorkers.map(w => ({
          id: w.id,
          full_name: w.full_name,
          company_name: (w.company as { company_name?: string })?.company_name || "Unknown",
        })),
        contractorReps: (reps || []).map(r => ({
          id: r.id,
          name: r.full_name,
          email: r.email,
          phone: r.mobile_number,
          company_name: (r.company as { company_name?: string })?.company_name || "Unknown",
        })),
      };
    },
    enabled: companyIds.length > 0 && !!tenantId,
  });
}

export function useClientSiteRepData() {
  const { data: companies = [], isLoading: companiesLoading } = useClientSiteRepCompanies();
  const companyIds = companies.map(c => c.id);

  const { data: workerData, isLoading: workersLoading } = useClientSiteRepWorkers(companyIds);
  const { data: projectData, isLoading: projectsLoading } = useClientSiteRepProjects(companyIds);
  const { data: gatePassData, isLoading: gatePassesLoading } = useClientSiteRepGatePasses(companyIds);
  const { data: incidentData, isLoading: incidentsLoading } = useClientSiteRepIncidents(companyIds);
  const { data: violations = [], isLoading: violationsLoading } = useClientSiteRepViolations(companyIds);
  const { data: personnel, isLoading: personnelLoading } = useClientSiteRepPersonnel(companyIds);

  // Data validation logging
  useEffect(() => {
    if (!companiesLoading && !workersLoading && !projectsLoading && !gatePassesLoading && !incidentsLoading && !violationsLoading && !personnelLoading) {
      const validations = [
        { name: 'companies', data: companies, valid: validateWidgetData('companies', companies) },
        { name: 'workerData', data: workerData, valid: validateWidgetData('workerData', workerData) },
        { name: 'projectData', data: projectData, valid: validateWidgetData('projectData', projectData) },
        { name: 'gatePassData', data: gatePassData, valid: validateWidgetData('gatePassData', gatePassData) },
        { name: 'incidentData', data: incidentData, valid: validateWidgetData('incidentData', incidentData) },
        { name: 'violations', data: violations, valid: validateWidgetData('violations', violations) },
        { name: 'personnel', data: personnel, valid: validateWidgetData('personnel', personnel) },
      ];
      
      const invalid = validations.filter(v => !v.valid);
      if (invalid.length > 0) {
        console.warn('[Dashboard] Widgets without data sources:', invalid.map(v => v.name).join(', '));
      }
    }
  }, [companies, workerData, projectData, gatePassData, incidentData, violations, personnel, companiesLoading, workersLoading, projectsLoading, gatePassesLoading, incidentsLoading, violationsLoading, personnelLoading]);

  const defaultWorkerData = { summary: { total: 0, approved: 0, pending: 0, rejected: 0, blacklisted: 0 }, recentWorkers: [] as ClientSiteRepWorkerDetail[] };
  const defaultProjectData = { summary: { total: 0, active: 0, planned: 0, completed: 0, on_hold: 0 }, recentProjects: [] as ClientSiteRepProjectDetail[] };
  const defaultGatePassData = { summary: { total: 0, pending: 0, approved: 0, rejected: 0, expired: 0 }, recentGatePasses: [] as ClientSiteRepGatePassDetail[] };
  const defaultIncidentData = { summary: { total: 0, open: 0, under_investigation: 0, closed: 0 }, recentIncidents: [] as ClientSiteRepIncidentDetail[] };

  return {
    companies,
    companyIds,
    workerSummary: workerData?.summary || defaultWorkerData.summary,
    recentWorkers: workerData?.recentWorkers || defaultWorkerData.recentWorkers,
    projectSummary: projectData?.summary || defaultProjectData.summary,
    recentProjects: projectData?.recentProjects || defaultProjectData.recentProjects,
    gatePassSummary: gatePassData?.summary || defaultGatePassData.summary,
    recentGatePasses: gatePassData?.recentGatePasses || defaultGatePassData.recentGatePasses,
    incidentSummary: incidentData?.summary || defaultIncidentData.summary,
    recentIncidents: incidentData?.recentIncidents || defaultIncidentData.recentIncidents,
    violations,
    personnel: personnel || { safetyOfficers: [], contractorReps: [] },
    isLoading: companiesLoading || workersLoading || projectsLoading || gatePassesLoading || incidentsLoading || violationsLoading || personnelLoading,
  };
}
