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
  // Approval workflow fields
  approval_status?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  approval_requested_at?: string | null;
  rejection_reason?: string | null;
  created_by?: string | null;
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
  const { profile, user } = useAuth();

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
          status: "pending_approval",
          approval_requested_at: new Date().toISOString(),
          created_by: user?.id, // Track who created the company for rejection notification
          scope_of_work: data.scope_of_work,
          contract_start_date: data.contract_start_date,
          contract_end_date: data.contract_end_date,
          total_workers: data.total_workers || 0,
          safety_officers_count: data.safety_officers_count || 0,
          contractor_site_rep_name: data.contractor_site_rep_name,
          contractor_site_rep_phone: data.contractor_site_rep_phone,
          contractor_site_rep_email: data.contractor_site_rep_email,
          contractor_site_rep_national_id: data.contractor_site_rep_national_id,
          contractor_site_rep_mobile: data.contractor_site_rep_mobile,
          contractor_site_rep_nationality: data.contractor_site_rep_nationality,
          contractor_site_rep_photo: data.contractor_site_rep_photo,
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
          contractor_site_rep_national_id: data.contractor_site_rep_national_id,
          contractor_site_rep_mobile: data.contractor_site_rep_mobile,
          contractor_site_rep_nationality: data.contractor_site_rep_nationality,
          contractor_site_rep_photo: data.contractor_site_rep_photo,
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

export function useChangeContractorStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, any> = { status };
      
      // Clear suspension data when activating
      if (status === "active") {
        updateData.suspension_reason = null;
        updateData.suspended_at = null;
      }

      const { data, error } = await supabase
        .from("contractor_companies")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-companies"] });
      toast.success("Status updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook to check and update expired contracts
export function useCheckExpiredContracts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("contractor_companies")
        .update({ status: "expired" })
        .lt("contract_end_date", today)
        .eq("status", "active")
        .is("deleted_at", null)
        .select("id");

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["contractor-companies"] });
        toast.info(`${data.length} contract(s) marked as expired`);
      }
    },
  });
}

export function useDeleteContractorCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      // Use SECURITY DEFINER function to bypass RLS issues
      // This also cascades soft-delete to workers, documents, and representatives
      const { error } = await supabase
        .rpc('soft_delete_contractor_company', { p_company_id: companyId });

      if (error) throw error;
      return companyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-companies"] });
      toast.success("Company deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============= HSSE MANAGER ACCESS CHECK =============

export function useHasHSSEManagerAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["hsse-manager-access", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase.rpc("has_hsse_manager_access", {
        p_user_id: user.id,
      });
      
      if (error) {
        console.error("Failed to check HSSE Manager access:", error);
        return false;
      }
      
      return data === true;
    },
    enabled: !!user?.id,
  });
}

// ============= COMPANY APPROVAL WORKFLOW HOOKS =============

export function usePendingCompanyApprovals() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["pending-company-approvals", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("contractor_companies")
        .select(`
          id, tenant_id, company_name, company_name_ar, commercial_registration_number,
          vat_number, email, phone, address, city, status, assigned_client_pm_id,
          suspension_reason, suspended_at, created_at, updated_at, created_by,
          contractor_site_rep_name, contractor_site_rep_email, contractor_site_rep_phone,
          scope_of_work, contract_start_date, contract_end_date,
          approval_requested_at, approved_by, approved_at, rejection_reason
        `)
        .eq("tenant_id", tenantId)
        .eq("status", "pending_approval")
        .is("deleted_at", null)
        .order("approval_requested_at", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as ContractorCompany[];
    },
    enabled: !!tenantId,
  });
}

export function useApproveCompany() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (companyId: string) => {
      // Validate HSSE Manager role before approving
      const { data: hasAccess } = await supabase.rpc("has_hsse_manager_access", {
        p_user_id: user?.id,
      });

      if (!hasAccess) {
        throw new Error("Only HSSE Managers can approve company registrations");
      }

      const { data, error } = await supabase
        .from("contractor_companies")
        .update({
          status: "active",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", companyId)
        .select("id, company_name, tenant_id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-companies"] });
      queryClient.invalidateQueries({ queryKey: ["pending-company-approvals"] });
      toast.success("Company approved and activated");

      // Trigger post-approval automation (user creation, role assignment)
      try {
        await supabase.functions.invoke("process-company-approval", {
          body: {
            company_id: data.id,
            action: "approved",
            tenant_id: data.tenant_id,
          },
        });
      } catch (e) {
        console.error("Failed to process post-approval:", e);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRejectCompany() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ companyId, reason }: { companyId: string; reason: string }) => {
      // Validate HSSE Manager role before rejecting
      const { data: hasAccess } = await supabase.rpc("has_hsse_manager_access", {
        p_user_id: user?.id,
      });

      if (!hasAccess) {
        throw new Error("Only HSSE Managers can reject company registrations");
      }

      // Get the company details including who created it
      const { data: companyData } = await supabase
        .from("contractor_companies")
        .select("id, company_name, tenant_id, created_by")
        .eq("id", companyId)
        .single();

      const { data, error } = await supabase
        .from("contractor_companies")
        .update({
          status: "rejected",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", companyId)
        .select("id, company_name, tenant_id")
        .single();

      if (error) throw error;
      return { ...data, reason, createdBy: companyData?.created_by };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-companies"] });
      queryClient.invalidateQueries({ queryKey: ["pending-company-approvals"] });
      toast.success("Company rejected");

      // Send rejection notification to the requestor
      if (data.createdBy && profile?.tenant_id) {
        try {
          await supabase.functions.invoke("send-contractor-notification", {
            body: {
              workerId: data.id, // Reusing field for company ID
              workerName: data.company_name,
              action: "company_rejected",
              rejectionReason: data.reason,
              tenant_id: profile.tenant_id,
              targetUserId: data.createdBy, // Notify the original requestor
            },
          });
        } catch (e) {
          console.error("Failed to send rejection notification:", e);
        }
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
