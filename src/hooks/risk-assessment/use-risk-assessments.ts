import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface RiskAssessment {
  id: string;
  tenant_id: string;
  assessment_number: string;
  contractor_id: string | null;
  project_id: string | null;
  template_id: string | null;
  activity_name: string;
  activity_name_ar: string | null;
  activity_description: string | null;
  location: string | null;
  assessment_date: string;
  status: 'draft' | 'under_review' | 'approved' | 'rejected' | 'expired';
  ai_risk_score: number | null;
  ai_confidence_level: number | null;
  overall_risk_rating: 'low' | 'medium' | 'high' | 'critical' | null;
  valid_until: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RiskAssessmentFilters {
  search?: string;
  status?: string;
  projectId?: string;
  contractorId?: string;
  riskRating?: string;
}

export function useRiskAssessments(filters: RiskAssessmentFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["risk-assessments", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("risk_assessments")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.search) {
        query = query.or(`activity_name.ilike.%${filters.search}%,assessment_number.ilike.%${filters.search}%`);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.projectId) {
        query = query.eq("project_id", filters.projectId);
      }
      if (filters.contractorId) {
        query = query.eq("contractor_id", filters.contractorId);
      }
      if (filters.riskRating) {
        query = query.eq("overall_risk_rating", filters.riskRating);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching risk assessments:", error);
        throw error;
      }

      return data as RiskAssessment[];
    },
    enabled: !!tenantId,
  });
}

export function useRiskAssessment(assessmentId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["risk-assessment", tenantId, assessmentId],
    queryFn: async () => {
      if (!tenantId || !assessmentId) return null;

      const { data, error } = await supabase
        .from("risk_assessments")
        .select("*")
        .eq("id", assessmentId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

      if (error) {
        console.error("Error fetching risk assessment:", error);
        throw error;
      }

      return data as RiskAssessment;
    },
    enabled: !!tenantId && !!assessmentId,
  });
}

export interface CreateRiskAssessmentData {
  activity_name: string;
  activity_name_ar?: string;
  activity_description?: string;
  location?: string;
  project_id?: string;
  contractor_id?: string;
  template_id?: string;
  overall_risk_rating?: 'low' | 'medium' | 'high' | 'critical';
  ai_risk_score?: number;
  ai_confidence_level?: number;
  valid_until?: string;
}

export function useCreateRiskAssessment() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (data: CreateRiskAssessmentData) => {
      if (!tenantId || !user?.id) throw new Error("Not authenticated");

      const { data: result, error } = await supabase
        .from("risk_assessments")
        .insert({
          ...data,
          tenant_id: tenantId,
          created_by: user.id,
          assessment_number: '',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-assessments"] });
      toast.success("Risk assessment created successfully");
    },
    onError: (error) => {
      console.error("Error creating risk assessment:", error);
      toast.error("Failed to create risk assessment");
    },
  });
}

export function useUpdateRiskAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<RiskAssessment> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("risk_assessments")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["risk-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["risk-assessment", variables.id] });
      toast.success("Risk assessment updated");
    },
    onError: (error) => {
      console.error("Error updating risk assessment:", error);
      toast.error("Failed to update risk assessment");
    },
  });
}

export function useApproveRiskAssessment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, validUntil }: { id: string; validUntil?: string }) => {
      const { data, error } = await supabase
        .from("risk_assessments")
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          valid_until: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-assessments"] });
      toast.success("Risk assessment approved");
    },
    onError: (error) => {
      console.error("Error approving risk assessment:", error);
      toast.error("Failed to approve risk assessment");
    },
  });
}

export function useRejectRiskAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from("risk_assessments")
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-assessments"] });
      toast.success("Risk assessment rejected");
    },
    onError: (error) => {
      console.error("Error rejecting risk assessment:", error);
      toast.error("Failed to reject risk assessment");
    },
  });
}

export function useDeleteRiskAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessmentId: string) => {
      // Use SECURITY DEFINER function to bypass RLS issues
      // This also cascades soft-delete to team and details
      const { error } = await supabase
        .rpc('soft_delete_risk_assessment', { p_assessment_id: assessmentId });

      if (error) throw error;
      return assessmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-assessments"] });
      toast.success("Risk assessment deleted");
    },
    onError: (error) => {
      console.error("Error deleting risk assessment:", error);
      toast.error("Failed to delete risk assessment");
    },
  });
}
