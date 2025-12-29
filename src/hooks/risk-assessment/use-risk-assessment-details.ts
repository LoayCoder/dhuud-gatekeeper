import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  existing_controls: any[];
  additional_controls: any[];
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

      const { data, error } = await supabase
        .from("risk_assessment_details")
        .select("*")
        .eq("risk_assessment_id", assessmentId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching risk assessment details:", error);
        throw error;
      }

      return data as RiskAssessmentDetail[];
    },
    enabled: !!tenantId && !!assessmentId,
  });
}

export interface CreateRiskDetailData {
  risk_assessment_id: string;
  hazard_description: string;
  hazard_description_ar?: string;
  hazard_category?: string;
  likelihood?: number;
  severity?: number;
  existing_controls?: any[];
  additional_controls?: any[];
  responsible_person?: string;
  target_completion_date?: string;
  residual_likelihood?: number;
  residual_severity?: number;
  ai_suggested?: boolean;
  ai_confidence?: number;
  sort_order?: number;
}

export function useCreateRiskDetail() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (data: CreateRiskDetailData) => {
      if (!tenantId) throw new Error("Not authenticated");

      const { data: result, error } = await supabase
        .from("risk_assessment_details")
        .insert({
          ...data,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
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
      const { data: result, error } = await supabase
        .from("risk_assessment_details")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
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
      const { error } = await supabase
        .from("risk_assessment_details")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
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

      const detailsToInsert = hazards.map((hazard, index) => ({
        ...hazard,
        risk_assessment_id: assessmentId,
        tenant_id: tenantId,
        sort_order: index,
      }));

      const { data, error } = await supabase
        .from("risk_assessment_details")
        .insert(detailsToInsert)
        .select();

      if (error) throw error;
      return data;
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
