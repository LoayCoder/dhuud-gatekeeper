import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type StatementType = "document_upload" | "direct_entry" | "voice_recording";
export type AssignmentStatus = "pending" | "in_progress" | "completed" | "approved";

export interface WitnessStatement {
  id: string;
  incident_id: string;
  tenant_id: string;
  witness_name: string;
  witness_contact: string | null;
  relationship: string | null;
  statement_text: string | null;
  statement_type: StatementType;
  audio_url: string | null;
  original_transcription: string | null;
  transcription_edited: boolean;
  transcription_approved: boolean;
  ai_analysis: Record<string, unknown> | null;
  assigned_witness_id: string | null;
  assignment_status: AssignmentStatus | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WitnessAttachment {
  id: string;
  tenant_id: string;
  statement_id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string;
  created_at: string;
  deleted_at: string | null;
}

export interface CreateWitnessStatementInput {
  incident_id: string;
  witness_name: string;
  witness_contact?: string;
  relationship?: string;
  statement_text?: string;
  statement_type: StatementType;
  audio_url?: string;
  original_transcription?: string;
  assigned_witness_id?: string;
  assignment_status?: AssignmentStatus;
}

export interface UpdateWitnessStatementInput {
  id: string;
  witness_name?: string;
  witness_contact?: string;
  relationship?: string;
  statement_text?: string;
  audio_url?: string;
  original_transcription?: string;
  transcription_edited?: boolean;
  transcription_approved?: boolean;
  ai_analysis?: Record<string, unknown>;
  assignment_status?: AssignmentStatus;
}

export function useWitnessStatements(incidentId: string | null) {
  return useQuery({
    queryKey: ["witness-statements", incidentId],
    queryFn: async () => {
      if (!incidentId) return [];

      const { data, error } = await supabase
        .from("witness_statements")
        .select("id, incident_id, tenant_id, witness_name, witness_contact, relationship, statement_text, statement_type, audio_url, original_transcription, transcription_edited, transcription_approved, ai_analysis, assigned_witness_id, assignment_status, created_at, updated_at, deleted_at")
        .eq("incident_id", incidentId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WitnessStatement[];
    },
    enabled: !!incidentId,
  });
}

export function useWitnessAttachments(statementId: string | null) {
  return useQuery({
    queryKey: ["witness-attachments", statementId],
    queryFn: async () => {
      if (!statementId) return [];

      const { data, error } = await supabase
        .from("witness_attachments")
        .select("id, tenant_id, statement_id, file_name, file_size, mime_type, storage_path, created_at, deleted_at")
        .eq("statement_id", statementId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WitnessAttachment[];
    },
    enabled: !!statementId,
  });
}

export function useCreateWitnessStatement() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateWitnessStatementInput) => {
      if (!profile?.tenant_id) throw new Error("No tenant ID");

      const { data, error } = await supabase
        .from("witness_statements")
        .insert({
          incident_id: input.incident_id,
          witness_name: input.witness_name,
          witness_contact: input.witness_contact,
          relationship: input.relationship,
          statement_text: input.statement_text,
          statement_type: input.statement_type,
          audio_url: input.audio_url,
          original_transcription: input.original_transcription,
          assigned_witness_id: input.assigned_witness_id,
          assignment_status: input.assignment_status,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["witness-statements", data.incident_id] });
      toast.success("Witness statement created successfully");
    },
    onError: (error) => {
      console.error("Error creating witness statement:", error);
      toast.error("Failed to create witness statement");
    },
  });
}

export function useUpdateWitnessStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWitnessStatementInput) => {
      const { id, ...updates } = input;

      const updateData: Record<string, unknown> = {};
      if (updates.witness_name !== undefined) updateData.witness_name = updates.witness_name;
      if (updates.witness_contact !== undefined) updateData.witness_contact = updates.witness_contact;
      if (updates.relationship !== undefined) updateData.relationship = updates.relationship;
      if (updates.statement_text !== undefined) updateData.statement_text = updates.statement_text;
      if (updates.audio_url !== undefined) updateData.audio_url = updates.audio_url;
      if (updates.original_transcription !== undefined) updateData.original_transcription = updates.original_transcription;
      if (updates.transcription_edited !== undefined) updateData.transcription_edited = updates.transcription_edited;
      if (updates.transcription_approved !== undefined) updateData.transcription_approved = updates.transcription_approved;
      if (updates.ai_analysis !== undefined) updateData.ai_analysis = updates.ai_analysis;
      if (updates.assignment_status !== undefined) updateData.assignment_status = updates.assignment_status;

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
      toast.success("Witness statement updated successfully");
    },
    onError: (error) => {
      console.error("Error updating witness statement:", error);
      toast.error("Failed to update witness statement");
    },
  });
}

export function useDeleteWitnessStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, incidentId }: { id: string; incidentId: string }) => {
      const { error } = await supabase
        .from("witness_statements")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      return { id, incidentId };
    },
    onSuccess: ({ incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ["witness-statements", incidentId] });
      toast.success("Witness statement deleted");
    },
    onError: (error) => {
      console.error("Error deleting witness statement:", error);
      toast.error("Failed to delete witness statement");
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
        .insert({
          ...input,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["witness-attachments", data.statement_id] });
      toast.success("Attachment uploaded successfully");
    },
    onError: (error) => {
      console.error("Error creating attachment:", error);
      toast.error("Failed to upload attachment");
    },
  });
}

// Hook for assigned witness tasks (My Actions integration)
export function useMyWitnessTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-witness-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("witness_statements")
        .select(`
          id, 
          incident_id, 
          witness_name, 
          statement_type, 
          assignment_status, 
          created_at,
          incidents!inner(reference_id, title)
        `)
        .eq("assigned_witness_id", user.id)
        .in("assignment_status", ["pending", "in_progress"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
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
