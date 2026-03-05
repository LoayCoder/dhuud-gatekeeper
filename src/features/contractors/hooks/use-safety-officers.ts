import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ProjectSafetyOfficer {
  id: string;
  project_id: string;
  representative_id: string | null;
  worker_id: string | null;
  full_name: string;
  mobile_number: string | null;
  safety_officer_type: string;
  certification_number: string | null;
  certification_expiry: string | null;
  assigned_at: string;
  created_by: string | null;
}

export interface SafetyOfficerRequirement {
  projectId: string;
  workerCount: number;
  requiredOfficers: number;
  assignedOfficers: number;
  isMet: boolean;
}

// Business rule: 1 safety officer per 20 workers
// <20 workers = 0 required, 20-39 = 1, 40-59 = 2, etc.
function calculateRequiredSafetyOfficers(workerCount: number): number {
  if (workerCount < 20) return 0;
  return Math.ceil(workerCount / 20);
}

export function useProjectSafetyOfficers(projectId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["project-safety-officers", tenantId, projectId],
    queryFn: async () => {
      if (!tenantId || !projectId) return [];

      const { data, error } = await supabase
        .from("project_safety_officers")
        .select(`
          id, project_id, representative_id, worker_id, full_name,
          mobile_number, safety_officer_type, certification_number,
          certification_expiry, assigned_at, created_by
        `)
        .eq("tenant_id", tenantId)
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ProjectSafetyOfficer[];
    },
    enabled: !!tenantId && !!projectId,
  });
}

export function useSafetyOfficerRequirement(projectId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["safety-officer-requirement", tenantId, projectId],
    queryFn: async (): Promise<SafetyOfficerRequirement | null> => {
      if (!tenantId || !projectId) return null;

      // Get worker count
      const { count: workerCount } = await supabase
        .from("project_worker_assignments")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("project_id", projectId)
        .eq("is_active", true)
        .is("deleted_at", null);

      // Get assigned officers count
      const { count: officerCount } = await supabase
        .from("project_safety_officers")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("project_id", projectId)
        .is("deleted_at", null);

      const workers = workerCount || 0;
      const required = calculateRequiredSafetyOfficers(workers);
      const assigned = officerCount || 0;

      return {
        projectId,
        workerCount: workers,
        requiredOfficers: required,
        assignedOfficers: assigned,
        isMet: assigned >= required,
      };
    },
    enabled: !!tenantId && !!projectId,
  });
}

export function useEligibleSafetyOfficers(companyId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["eligible-safety-officers", tenantId, companyId],
    queryFn: async () => {
      if (!tenantId || !companyId) return [];

      const { data, error } = await supabase
        .from("contractor_representatives")
        .select("id, full_name, full_name_ar, mobile_number, email, is_safety_officer_eligible")
        .eq("tenant_id", tenantId)
        .eq("company_id", companyId)
        .eq("is_safety_officer_eligible", true)
        .is("deleted_at", null)
        .order("full_name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && !!companyId,
  });
}

export function useAssignSafetyOfficer() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      fullName, 
      mobileNumber,
      safetyOfficerType = "internal",
      representativeId,
      workerId,
    }: { 
      projectId: string; 
      fullName: string;
      mobileNumber?: string;
      safetyOfficerType?: string;
      representativeId?: string;
      workerId?: string;
    }) => {
      if (!tenantId || !user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("project_safety_officers")
        .insert({
          tenant_id: tenantId,
          project_id: projectId,
          full_name: fullName,
          mobile_number: mobileNumber || null,
          safety_officer_type: safetyOfficerType,
          representative_id: representativeId || null,
          worker_id: workerId || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project-safety-officers", tenantId, projectId] });
      queryClient.invalidateQueries({ queryKey: ["safety-officer-requirement", tenantId, projectId] });
      toast.success("Safety officer assigned");
    },
    onError: (error) => {
      toast.error(`Failed to assign safety officer: ${error.message}`);
    },
  });
}

export function useRemoveSafetyOfficer() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async ({ officerId }: { officerId: string }) => {
      if (!tenantId) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("project_safety_officers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", officerId);

      if (error) throw error;
      return { officerId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-safety-officers"] });
      queryClient.invalidateQueries({ queryKey: ["safety-officer-requirement"] });
      toast.success("Safety officer removed");
    },
    onError: (error) => {
      toast.error(`Failed to remove officer: ${error.message}`);
    },
  });
}
