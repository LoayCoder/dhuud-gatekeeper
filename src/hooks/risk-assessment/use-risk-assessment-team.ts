import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

      const { data, error } = await supabase
        .from("risk_assessment_team")
        .select("*")
        .eq("risk_assessment_id", assessmentId)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching risk assessment team:", error);
        throw error;
      }

      return data as RiskAssessmentTeamMember[];
    },
    enabled: !!tenantId && !!assessmentId,
  });
}

export interface AddTeamMemberData {
  risk_assessment_id: string;
  worker_id?: string;
  user_id?: string;
  role: string;
  role_ar?: string;
  is_required?: boolean;
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (data: AddTeamMemberData) => {
      if (!tenantId) throw new Error("Not authenticated");

      const { data: result, error } = await supabase
        .from("risk_assessment_team")
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
      const { error } = await supabase
        .from("risk_assessment_team")
        .delete()
        .eq("id", id);

      if (error) throw error;
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
      const { data, error } = await supabase
        .from("risk_assessment_team")
        .update({
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
        })
        .eq("id", teamMemberId)
        .select()
        .single();

      if (error) throw error;
      return data;
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
