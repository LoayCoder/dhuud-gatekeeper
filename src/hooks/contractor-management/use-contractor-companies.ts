import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ContractorCompany {
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
  assigned_client_pm_id: string | null;
  suspension_reason: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  assigned_client_pm?: { full_name: string } | null;
}

export interface ContractorCompanyFilters {
  search?: string;
  status?: string;
  city?: string;
}

export function useContractorCompanies(filters: ContractorCompanyFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-companies", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("contractor_companies")
        .select(`
          id, tenant_id, company_name, company_name_ar, commercial_registration_number,
          vat_number, email, phone, address, city, status, assigned_client_pm_id,
          suspension_reason, suspended_at, created_at, updated_at
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("company_name", { ascending: true });

      if (filters.search) {
        query = query.or(
          `company_name.ilike.%${filters.search}%,company_name_ar.ilike.%${filters.search}%`
        );
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContractorCompany[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateContractorCompany() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<ContractorCompany> & Record<string, any>) => {
      if (!profile?.tenant_id) throw new Error("No tenant");

      const { data: result, error } = await supabase
        .from("contractor_companies")
        .insert({
          company_name: data.company_name!,
          company_name_ar: data.company_name_ar,
          commercial_registration_number: data.commercial_registration_number,
          vat_number: data.vat_number,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          tenant_id: profile.tenant_id,
          status: "active",
          scope_of_work: data.scope_of_work,
          contract_start_date: data.contract_start_date,
          contract_end_date: data.contract_end_date,
          total_workers: data.total_workers || 0,
          safety_officers_count: data.safety_officers_count || 0,
          contractor_site_rep_name: data.contractor_site_rep_name,
          contractor_site_rep_phone: data.contractor_site_rep_phone,
          contractor_site_rep_email: data.contractor_site_rep_email,
          contractor_safety_officer_name: data.contractor_safety_officer_name,
          contractor_safety_officer_phone: data.contractor_safety_officer_phone,
          contractor_safety_officer_email: data.contractor_safety_officer_email,
          client_site_rep_id: data.client_site_rep_id,
          assigned_branch_id: data.assigned_branch_id,
          assigned_department_id: data.assigned_department_id,
          assigned_section_id: data.assigned_section_id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-companies"] });
      toast.success("Company created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateContractorCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContractorCompany> & Record<string, any> }) => {
      const { data: result, error } = await supabase
        .from("contractor_companies")
        .update({
          company_name: data.company_name,
          company_name_ar: data.company_name_ar,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          scope_of_work: data.scope_of_work,
          contract_start_date: data.contract_start_date,
          contract_end_date: data.contract_end_date,
          total_workers: data.total_workers,
          safety_officers_count: data.safety_officers_count,
          contractor_site_rep_name: data.contractor_site_rep_name,
          contractor_site_rep_phone: data.contractor_site_rep_phone,
          contractor_site_rep_email: data.contractor_site_rep_email,
          contractor_safety_officer_name: data.contractor_safety_officer_name,
          contractor_safety_officer_phone: data.contractor_safety_officer_phone,
          contractor_safety_officer_email: data.contractor_safety_officer_email,
          client_site_rep_id: data.client_site_rep_id,
          assigned_branch_id: data.assigned_branch_id,
          assigned_department_id: data.assigned_department_id,
          assigned_section_id: data.assigned_section_id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-companies"] });
      queryClient.invalidateQueries({ queryKey: ["contractor-company-details"] });
      toast.success("Company updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSuspendContractorCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from("contractor_companies")
        .update({
          status: "suspended",
          suspension_reason: reason,
          suspended_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-companies"] });
      toast.success("Company suspended");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useActivateContractorCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("contractor_companies")
        .update({
          status: "active",
          suspension_reason: null,
          suspended_at: null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-companies"] });
      toast.success("Company activated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
