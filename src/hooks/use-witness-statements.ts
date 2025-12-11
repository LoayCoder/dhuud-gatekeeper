import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type StatementType = "document_upload" | "direct_entry" | "voice_recording";
export type AssignmentStatus = "pending" | "in_progress" | "completed" | "approved";

export interface WitnessStatement {
  id: string;
  incident_id: string | null;
  tenant_id: string;
  name: string;
  contact: string | null;
  relationship: string | null;
  statement: string;
  statement_type: string;
  audio_url: string | null;
  original_transcription: string | null;
  transcription_edited: boolean;
  transcription_approved: boolean;
  ai_analysis: Record<string, unknown> | null;
  assigned_witness_id: string | null;
  assignment_status: string | null;
  created_by: string | null;
  created_at: string | null;
  deleted_at: string | null;
}

export function useWitnessStatements(incidentId: string | null) {
  const query = useQuery({
    queryKey: ["witness-statements", incidentId],
    queryFn: async () => {
      if (!incidentId) return [];

      const { data, error } = await supabase
        .from("witness_statements")
        .select("id, incident_id, tenant_id, witness_name, witness_contact, relationship, statement_text, statement_type, audio_url, original_transcription, transcription_edited, transcription_approved, ai_analysis, assigned_witness_id, assignment_status, created_by, created_at, deleted_at")
        .eq("incident_id", incidentId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map database columns to interface
      return (data || []).map(row => ({
        id: row.id,
        incident_id: row.incident_id,
        tenant_id: row.tenant_id,
        name: row.witness_name,
        contact: row.witness_contact,
        relationship: row.relationship,
        statement: row.statement_text,
        statement_type: row.statement_type,
        audio_url: row.audio_url,
        original_transcription: row.original_transcription,
        transcription_edited: row.transcription_edited || false,
        transcription_approved: row.transcription_approved || false,
        ai_analysis: row.ai_analysis as Record<string, unknown> | null,
        assigned_witness_id: row.assigned_witness_id,
        assignment_status: row.assignment_status,
        created_by: row.created_by,
        created_at: row.created_at,
        deleted_at: row.deleted_at,
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
      statement_type: StatementType;
      audio_url?: string;
      original_transcription?: string;
      assigned_witness_id?: string;
      assignment_status?: AssignmentStatus;
    }) => {
      // Get fresh user at execution time to avoid stale closure
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (!freshUser?.id) throw new Error("No authenticated user");

      // Get fresh profile at execution time
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
          statement_type: input.statement_type,
          audio_url: input.audio_url,
          original_transcription: input.original_transcription,
          assigned_witness_id: input.assigned_witness_id,
          assignment_status: input.assignment_status,
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
      console.error("Error creating witness statement:", error);
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
      assignment_status?: AssignmentStatus;
    }) => {
      const { id, ...updates } = input;

      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.witness_name = updates.name;
      if (updates.contact !== undefined) updateData.witness_contact = updates.contact;
      if (updates.relationship !== undefined) updateData.relationship = updates.relationship;
      if (updates.statement !== undefined) updateData.statement_text = updates.statement;
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
      queryClient.invalidateQueries({ queryKey: ["my-witness-tasks"] });
      toast.success("Statement updated");
    },
    onError: (error) => {
      console.error("Error updating witness statement:", error);
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
        .select("id, incident_id, witness_name, witness_contact, statement_text, statement_type, assignment_status, created_at")
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
        statement_type: row.statement_type,
        assignment_status: row.assignment_status,
        created_at: row.created_at,
      }));
    },
    enabled: !!user?.id,
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
