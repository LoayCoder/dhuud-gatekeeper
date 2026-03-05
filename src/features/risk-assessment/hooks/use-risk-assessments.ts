import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { RiskAssessmentFilters, CreateRiskAssessmentData } from '@/features/risk-assessment';

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

export { type RiskAssessmentFilters };

export function useRiskAssessments(filters: RiskAssessmentFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["risk-assessments", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      const { getRiskAssessments } = await import("@/services/risk-assessment/riskAssessmentService");
      return getRiskAssessments(tenantId, filters) as Promise<RiskAssessment[]>;
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

      const { getRiskAssessment } = await import("@/services/risk-assessment/riskAssessmentService");
      return getRiskAssessment(assessmentId, tenantId) as Promise<RiskAssessment>;
    },
    enabled: !!tenantId && !!assessmentId,
  });
}

export { type CreateRiskAssessmentData };

export function useCreateRiskAssessment() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (data: CreateRiskAssessmentData) => {
      if (!tenantId || !user?.id) throw new Error("Not authenticated");
      const { createRiskAssessment } = await import("@/services/risk-assessment/riskAssessmentService");
      return createRiskAssessment(data, tenantId, user.id);
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
      const { updateRiskAssessment } = await import("@/services/risk-assessment/riskAssessmentService");
      return updateRiskAssessment(id, data);
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
      if (!user?.id) throw new Error("Not authenticated");
      const { approveRiskAssessment } = await import("@/services/risk-assessment/riskAssessmentService");
      return approveRiskAssessment(id, user.id, validUntil);
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
      const { rejectRiskAssessment } = await import("@/services/risk-assessment/riskAssessmentService");
      return rejectRiskAssessment(id, reason);
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
      const { deleteRiskAssessment } = await import("@/services/risk-assessment/riskAssessmentService");
      return deleteRiskAssessment(assessmentId);
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

