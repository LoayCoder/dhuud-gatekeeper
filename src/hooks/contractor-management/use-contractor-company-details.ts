import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ContractorCompanyDetails {
  id: string;
  tenant_id: string;
  company_name: string;
  company_name_ar: string | null;
  commercial_registration_number: string | null;
  vat_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  status: string;
  // New fields
  scope_of_work: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  total_workers: number;
  safety_officers_count: number;
  // Contractor personnel - site rep
  contractor_site_rep_name: string | null;
  contractor_site_rep_phone: string | null;
  contractor_site_rep_email: string | null;
  contractor_site_rep_national_id: string | null;
  contractor_site_rep_mobile: string | null;
  contractor_site_rep_nationality: string | null;
  contractor_site_rep_photo: string | null;
  // Contractor personnel - safety officer (legacy single)
  contractor_safety_officer_name: string | null;
  contractor_safety_officer_phone: string | null;
  contractor_safety_officer_email: string | null;
  // Client representative
  client_site_rep_id: string | null;
  client_site_rep?: { id: string; full_name: string; email: string | null } | null;
  // Assignment
  assigned_branch_id: string | null;
  assigned_department_id: string | null;
  assigned_section_id: string | null;
  branch?: { id: string; name: string; name_ar: string | null } | null;
  department?: { id: string; name: string; name_ar: string | null } | null;
  section?: { id: string; name: string; name_ar: string | null } | null;
  // Metadata
  created_at: string;
  updated_at: string;
}

export function useContractorCompanyDetails(companyId: string | null) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-company-details", companyId],
    queryFn: async () => {
      if (!companyId || !tenantId) return null;

      const { data, error } = await supabase
        .from("contractor_companies")
        .select(`
          id, tenant_id, company_name, company_name_ar, commercial_registration_number,
          vat_number, email, phone, address, city, status,
          scope_of_work, contract_start_date, contract_end_date,
          total_workers, safety_officers_count,
          contractor_site_rep_name, contractor_site_rep_phone, contractor_site_rep_email,
          contractor_site_rep_national_id, contractor_site_rep_mobile, contractor_site_rep_nationality, contractor_site_rep_photo,
          contractor_safety_officer_name, contractor_safety_officer_phone, contractor_safety_officer_email,
          client_site_rep_id, assigned_branch_id, assigned_department_id, assigned_section_id,
          created_at, updated_at
        `)
        .eq("id", companyId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

      if (error) throw error;

      // Count actual workers from contractor_workers table (excluding site_rep and safety_officer types)
      const { count: actualWorkerCount } = await supabase
        .from("contractor_workers")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .not("worker_type", "in", '("site_rep","safety_officer")');

      // Fetch related data
      let clientRep = null;
      let branch = null;
      let department = null;
      let section = null;

      if (data.client_site_rep_id) {
        const { data: repData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", data.client_site_rep_id)
          .single();
        clientRep = repData;
      }

      if (data.assigned_branch_id) {
        const { data: branchData } = await supabase
          .from("branches")
          .select("id, name, name_ar")
          .eq("id", data.assigned_branch_id)
          .single();
        branch = branchData;
      }

      if (data.assigned_department_id) {
        const { data: deptData } = await supabase
          .from("departments")
          .select("id, name, name_ar")
          .eq("id", data.assigned_department_id)
          .single();
        department = deptData;
      }

      if (data.assigned_section_id) {
        const { data: sectionData } = await supabase
          .from("sections")
          .select("id, name, name_ar")
          .eq("id", data.assigned_section_id)
          .single();
        section = sectionData;
      }

      return {
        ...data,
        // Use actual count if available, otherwise fallback to stored value
        total_workers: actualWorkerCount ?? data.total_workers ?? 0,
        client_site_rep: clientRep,
        branch,
        department,
        section,
      } as ContractorCompanyDetails;
    },
    enabled: !!companyId && !!tenantId,
  });
}

export function useBranches() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["branches", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .eq("tenant_id", profile?.tenant_id!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useDepartments(branchId?: string | null) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["departments", profile?.tenant_id, branchId],
    queryFn: async () => {
      let query = supabase
        .from("departments")
        .select("id, name")
        .eq("tenant_id", profile?.tenant_id!)
        .is("deleted_at", null)
        .order("name");

      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useSections(departmentId?: string | null) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["sections", profile?.tenant_id, departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id, name")
        .eq("tenant_id", profile?.tenant_id!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useClientRepresentatives() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["client-representatives", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("tenant_id", profile?.tenant_id!)
        .order("full_name");
      if (error) throw error;
      return data as { id: string; full_name: string; email: string | null }[];
    },
    enabled: !!profile?.tenant_id,
  });
}
