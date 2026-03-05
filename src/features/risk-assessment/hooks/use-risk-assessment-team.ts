import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { AddTeamMemberData } from '@/features/risk-assessment';

export interface RiskAssessmentTeamMember {
  id: string;
  tenant_id: string;
  risk_assessment_id: string;
  worker_id: string | null;
  user_id: string | null;
  role: string;
  role_ar: string | null;
  signature_data: string | null;
  signed_at: string | null;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export function useRiskAssessmentTeam(assessmentId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["risk-assessment-team", tenantId, assessmentId],
    queryFn: async () => {
      if (!tenantId || !assessmentId) return [];

      const { getRiskAssessmentTeam } = await import("@/services/risk-assessment/riskAssessmentService");
      return getRiskAssessmentTeam(assessmentId, tenantId) as Promise<RiskAssessmentTeamMember[]>;
    },
    enabled: !!tenantId && !!assessmentId,
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (data: AddTeamMemberData) => {
      if (!tenantId) throw new Error("Not authenticated");
      const { addTeamMember } = await import("@/services/risk-assessment/riskAssessmentService");
      return addTeamMember(data, tenantId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["risk-assessment-team", variables.risk_assessment_id]
      });
      toast.success("Team member added");
    },
    onError: (error) => {
      console.error("Error adding team member:", error);
      toast.error("Failed to add team member");
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, assessmentId }: { id: string; assessmentId: string }) => {
      const { removeTeamMember } = await import("@/services/risk-assessment/riskAssessmentService");
      return removeTeamMember(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["risk-assessment-team", variables.assessmentId]
      });
      toast.success("Team member removed");
    },
    onError: (error) => {
      console.error("Error removing team member:", error);
      toast.error("Failed to remove team member");
    },
  });
}

export function useSignAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamMemberId,
      assessmentId,
      signatureData
    }: {
      teamMemberId: string;
      assessmentId: string;
      signatureData: string;
    }) => {
      const { signAssessment } = await import("@/services/risk-assessment/riskAssessmentService");
      return signAssessment(teamMemberId, signatureData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["risk-assessment-team", variables.assessmentId]
      });
      toast.success("Signature recorded");
    },
    onError: (error) => {
      console.error("Error recording signature:", error);
      toast.error("Failed to record signature");
    },
  });
}

