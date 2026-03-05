import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import type { CreateRiskDetailData } from '@/features/risk-assessment';

export interface RiskAssessmentDetail {
  id: string;
  tenant_id: string;
  risk_assessment_id: string;
  hazard_description: string;
  hazard_description_ar: string | null;
  hazard_category: string | null;
  likelihood: number | null;
  severity: number | null;
  initial_risk_score: number | null;
  existing_controls: Json[];
  additional_controls: Json[];
  responsible_person: string | null;
  target_completion_date: string | null;
  residual_likelihood: number | null;
  residual_severity: number | null;
  residual_risk_score: number | null;
  ai_suggested: boolean;
  ai_confidence: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export function useRiskAssessmentDetails(assessmentId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["risk-assessment-details", tenantId, assessmentId],
    queryFn: async () => {
      if (!tenantId || !assessmentId) return [];

      const { getRiskAssessmentDetails } = await import("@/services/risk-assessment/riskAssessmentService");
      return getRiskAssessmentDetails(assessmentId, tenantId) as Promise<RiskAssessmentDetail[]>;
    },
    enabled: !!tenantId && !!assessmentId,
  });
}

export function useCreateRiskDetail() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (data: CreateRiskDetailData) => {
      if (!tenantId) throw new Error("Not authenticated");
      const { createRiskDetail } = await import("@/services/risk-assessment/riskAssessmentService");
      return createRiskDetail(data, tenantId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["risk-assessment-details", variables.risk_assessment_id]
      });
    },
    onError: (error) => {
      console.error("Error creating risk detail:", error);
      toast.error("Failed to add hazard");
    },
  });
}

export function useUpdateRiskDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, assessmentId, ...data }: Partial<RiskAssessmentDetail> & { id: string; assessmentId: string }) => {
      const { updateRiskDetail } = await import("@/services/risk-assessment/riskAssessmentService");
      return updateRiskDetail(id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["risk-assessment-details", variables.assessmentId]
      });
    },
    onError: (error) => {
      console.error("Error updating risk detail:", error);
      toast.error("Failed to update hazard");
    },
  });
}

export function useDeleteRiskDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, assessmentId }: { id: string; assessmentId: string }) => {
      const { deleteRiskDetail } = await import("@/services/risk-assessment/riskAssessmentService");
      return deleteRiskDetail(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["risk-assessment-details", variables.assessmentId]
      });
      toast.success("Hazard removed");
    },
    onError: (error) => {
      console.error("Error deleting risk detail:", error);
      toast.error("Failed to remove hazard");
    },
  });
}

export function useBulkCreateRiskDetails() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async ({ assessmentId, hazards }: {
      assessmentId: string;
      hazards: Array<Omit<CreateRiskDetailData, 'risk_assessment_id'>>
    }) => {
      if (!tenantId) throw new Error("Not authenticated");
      const { bulkCreateRiskDetails } = await import("@/services/risk-assessment/riskAssessmentService");
      return bulkCreateRiskDetails(assessmentId, hazards, tenantId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["risk-assessment-details", variables.assessmentId]
      });
      toast.success(`${variables.hazards.length} hazards added`);
    },
    onError: (error) => {
      console.error("Error bulk creating risk details:", error);
      toast.error("Failed to add hazards");
    },
  });
}

