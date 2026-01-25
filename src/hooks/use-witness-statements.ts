import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from '@/lib/logger';

export type StatementType = "upload" | "text" | "voice";
// Strictly using the new enum from V1.1 migration
export type WitnessStatus = "pending" | "review" | "approved" | "returned";

export interface WitnessStatement {
  id: string;
  incident_id: string | null;
  tenant_id: string;
  name: string;
  contact: string | null;
  relationship: string | null;
  statement: string;
  statement_method: StatementType;
  audio_url: string | null;
  ai_transcription_text: string | null;
  original_transcription: string | null;
  transcription_edited: boolean;
  transcription_approved: boolean;
  ai_analysis: Record<string, unknown> | null;
  assigned_witness_id: string | null;
  status: WitnessStatus | null;
  created_by: string | null;
  created_at: string | null;
  deleted_at: string | null;
  return_reason: string | null;
  return_count: number;
  returned_by: string | null;
  returned_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export function useWitnessStatements(incidentId: string | null) {
  const query = useQuery({
    queryKey: ["witness-statements", incidentId],
    queryFn: async () => {
      if (!incidentId) return [];

      const { data, error } = await supabase
        .from("witness_statements")
        .select("id, incident_id, tenant_id, witness_name, witness_contact, relationship, statement_text, statement_method, audio_url, ai_transcription_text, original_transcription, transcription_edited, transcription_approved, ai_analysis, assigned_witness_id, status, created_by, created_at, deleted_at, return_reason, return_count, returned_by, returned_at, reviewed_by, reviewed_at")
        .eq("incident_id", incidentId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        incident_id: row.incident_id,
        tenant_id: row.tenant_id,
        name: row.witness_name,
        contact: row.witness_contact,
        relationship: row.relationship,
        statement: row.statement_text,
        statement_method: (row.statement_method as StatementType) || 'text',
        audio_url: row.audio_url,
        ai_transcription_text: row.ai_transcription_text,
        original_transcription: row.original_transcription,
        transcription_edited: row.transcription_edited || false,
        transcription_approved: row.transcription_approved || false,
        ai_analysis: row.ai_analysis as Record<string, unknown> | null,
        assigned_witness_id: row.assigned_witness_id,
        status: row.status as WitnessStatus, // Map new column
        created_by: row.created_by,
        created_at: row.created_at,
        deleted_at: row.deleted_at,
        return_reason: row.return_reason,
        return_count: row.return_count || 0,
        returned_by: row.returned_by,
        returned_at: row.returned_at,
        reviewed_by: row.reviewed_by,
        reviewed_at: row.reviewed_at,
      })) as WitnessStatement[];
    },
    enabled: !!incidentId,
  });

  return {
    statements: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateWitnessStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      incident_id: string;
      name: string;
      contact?: string;
      relationship?: string;
      statement: string;
      statement_method: StatementType;
      audio_url?: string;
      ai_transcription_text?: string;
      original_transcription?: string;
      assigned_witness_id?: string;
      status?: WitnessStatus;
    }) => {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (!freshUser?.id) throw new Error("No authenticated user");

      const { data: freshProfile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', freshUser.id)
        .single();

      if (profileError || !freshProfile?.tenant_id) {
        throw new Error("No tenant ID found");
      }

      const { data, error } = await supabase
        .from("witness_statements")
        .insert({
          incident_id: input.incident_id,
          witness_name: input.name,
          witness_contact: input.contact,
          relationship: input.relationship,
          statement_text: input.statement,
          statement_method: input.statement_method,
          audio_url: input.audio_url,
          ai_transcription_text: input.ai_transcription_text,
          original_transcription: input.original_transcription,
          assigned_witness_id: input.assigned_witness_id,
          status: input.status || 'pending', // Use new status column
          tenant_id: freshProfile.tenant_id,
          created_by: freshUser.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["witness-statements", data.incident_id] });
      toast.success("Witness statement created");
    },
    onError: (error) => {
      logger.error("Error creating witness statement:", error);
      toast.error("Failed to create witness statement");
    },
  });
}

export function useUpdateWitnessStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      contact?: string;
      relationship?: string;
      statement?: string;
      status?: WitnessStatus;
    }) => {
      const { id, ...updates } = input;

      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.witness_name = updates.name;
      if (updates.contact !== undefined) updateData.witness_contact = updates.contact;
      if (updates.relationship !== undefined) updateData.relationship = updates.relationship;
      if (updates.statement !== undefined) updateData.statement_text = updates.statement;
      if (updates.status !== undefined) updateData.status = updates.status;

      const { data, error } = await supabase
        .from("witness_statements")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["witness-statements", data.incident_id] });
      queryClient.invalidateQueries({ queryKey: ["my-witness-tasks"] });
      toast.success("Statement updated");
    },
    onError: (error) => {
      logger.error("Error updating witness statement:", error);
      toast.error("Failed to update statement");
    },
  });
}

export function useMyAssignedWitnessStatements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-witness-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("witness_statements")
        .select("id, incident_id, witness_name, witness_contact, statement_text, statement_method, status, created_at, return_reason, return_count, returned_at")
        .eq("assigned_witness_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        incident_id: row.incident_id,
        name: row.witness_name,
        contact: row.witness_contact,
        statement: row.statement_text,
        statement_method: (row.statement_method as StatementType) || 'text',
        status: row.status as WitnessStatus,
        created_at: row.created_at,
        return_reason: row.return_reason,
        return_count: row.return_count || 0,
        returned_at: row.returned_at,
      }));
    },
    enabled: !!user?.id,
  });
}

// Hook for reviewing (approving/returning) witness statements
export function useReviewWitnessStatement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      action: "approve" | "return";
      returnReason?: string;
    }) => {
      const { id, action, returnReason } = input;

      if (action === "approve") {
        const { data, error } = await supabase
          .from("witness_statements")
          .update({
            status: "approved", // Update new column
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("id, incident_id, assigned_witness_id")
          .single();

        if (error) throw error;
        return { ...data, action: "approve" };
      } else {
        // Return for correction - increment return_count
        const { data: current } = await supabase
          .from("witness_statements")
          .select("return_count")
          .eq("id", id)
          .single();

        const newReturnCount = (current?.return_count || 0) + 1;

        const { data, error } = await supabase
          .from("witness_statements")
          .update({
            status: "returned", // Update new column
            return_reason: returnReason,
            return_count: newReturnCount,
            returned_by: user?.id,
            returned_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("id, incident_id, assigned_witness_id")
          .single();

        if (error) throw error;
        return { ...data, action: "return", returnReason, returnCount: newReturnCount };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["witness-statements", data.incident_id] });
      queryClient.invalidateQueries({ queryKey: ["my-witness-tasks"] });
      
      if (data.action === "approve") {
        toast.success("Statement approved successfully");
      } else {
        toast.success("Statement returned for corrections");
      }
    },
    onError: (error) => {
      logger.error("Error reviewing witness statement:", error);
      toast.error("Failed to process statement review");
    },
  });
}

// Hook for starting work on a witness statement (pending -> review? No, likely just pending with content)
// Note: 'in_progress' is removed from V1.1 enum. Logic implies 'pending' until submitted for review.
// We will deprecate this or map to 'pending' if it was used to lock assignment.
// For now, removing to force alignment with V1.1 enum or keeping it as 'pending'.
// User said "Strictly Use status".
export function useStartWitnessWork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (statementId: string) => {
      // In V1.1, we might not have 'in_progress'.
      // If we need to mark it as started, we might need another way or just keep it 'pending'.
      // For now, let's assuming 'pending' is the state while working.
      // But to be safe and avoid errors, I will simply NOT update the status if 'in_progress' is invalid.
      // If the UI relies on this, we might need to change the UI to not require 'in_progress'.
      // I will keep the hook but make it a no-op or just log, or update to 'pending' (redundant).
      // Actually, if I look at the WitnessFlow, "WitDraft --> WitStatus[Status: Pending]".
      // So 'pending' is correct.

      return { id: statementId }; // No-op
    },
    onSuccess: (data) => {
      // queryClient.invalidateQueries({ queryKey: ["witness-statements", ...] });
      // toast.success("Work started");
    },
  });
}

export function useCreateWitnessAttachment() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      statement_id: string;
      file_name: string;
      file_size?: number;
      mime_type?: string;
      storage_path: string;
    }) => {
      if (!profile?.tenant_id) throw new Error("No tenant ID");

      const { data, error } = await supabase
        .from("witness_attachments")
        .insert({ ...input, tenant_id: profile.tenant_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["witness-attachments", data.statement_id] });
    },
  });
}

// AI Analysis functions
export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<{ transcription: string; confidence: number }> {
  const { data, error } = await supabase.functions.invoke("transcribe-audio", {
    body: { audio: audioBase64, mimeType },
  });

  if (error) throw error;
  if (data.error) throw new Error(data.error);
  return data;
}

export async function analyzeStatement(
  statement: string, 
  analysisType: "rewrite" | "summarize" | "detect_missing" | "full_analysis",
  context?: string
): Promise<{ result?: string; analysis?: Record<string, unknown> }> {
  const { data, error } = await supabase.functions.invoke("analyze-witness-statement", {
    body: { statement, analysisType, context },
  });

  if (error) throw error;
  if (data.error) throw new Error(data.error);
  return data;
}
