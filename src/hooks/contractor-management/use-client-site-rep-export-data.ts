import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ExportWorker {
  id: string;
  full_name: string;
  full_name_ar: string | null;
  national_id: string;
  nationality: string | null;
  mobile_number: string | null;
  approval_status: string;
  company_name: string;
  created_at: string;
}

export interface ExportIncident {
  id: string;
  reference_id: string;
  title: string;
  event_type: string | null;
  severity: string | null;
  status: string;
  location: string | null;
  occurred_at: string;
  company_name: string;
}

export interface ExportViolation {
  id: string;
  violation_type: string;
  severity: string;
  status: string;
  company_name: string;
  reported_at: string;
}

export function useClientSiteRepExportData() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const fetchWorkersForExport = async (companyIds: string[]): Promise<ExportWorker[]> => {
    if (!companyIds.length || !tenantId) return [];

    const { data, error } = await supabase
      .from("contractor_workers")
      .select(`
        id, full_name, full_name_ar, national_id, nationality, 
        mobile_number, approval_status, created_at,
        company:contractor_companies!contractor_workers_company_id_fkey(company_name)
      `)
      .in("company_id", companyIds)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map(w => ({
      id: w.id,
      full_name: w.full_name,
      full_name_ar: w.full_name_ar,
      national_id: w.national_id,
      nationality: w.nationality,
      mobile_number: w.mobile_number,
      approval_status: w.approval_status || "pending",
      company_name: (w.company as any)?.company_name || "",
      created_at: w.created_at,
    }));
  };

  const fetchIncidentsForExport = async (companyIds: string[]): Promise<ExportIncident[]> => {
    if (!companyIds.length || !tenantId) return [];

    const { data, error } = await supabase
      .from("incidents")
      .select(`
        id, reference_id, title, event_type, severity, status, 
        location, occurred_at,
        company:contractor_companies!incidents_related_contractor_company_id_fkey(company_name)
      `)
      .in("related_contractor_company_id", companyIds)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false });

    if (error) throw error;

    return (data || []).map(i => ({
      id: i.id,
      reference_id: i.reference_id || "",
      title: i.title,
      event_type: i.event_type,
      severity: i.severity,
      status: i.status,
      location: i.location,
      occurred_at: i.occurred_at,
      company_name: (i.company as any)?.company_name || "",
    }));
  };

  const fetchViolationsForExport = async (companyIds: string[]): Promise<ExportViolation[]> => {
    // Violations table may not exist yet, return empty array
    if (!companyIds.length || !tenantId) return [];
    return [];
  };

  return {
    fetchWorkersForExport,
    fetchIncidentsForExport,
    fetchViolationsForExport,
  };
}
