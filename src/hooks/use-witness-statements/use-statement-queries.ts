import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { StatementType, WitnessStatus, WitnessStatement } from './types';

export function useWitnessStatements(incidentId: string | null) {
    const query = useQuery({
        queryKey: ["witness-statements", incidentId],
        queryFn: async () => {
            if (!incidentId) return [];

            const { data, error } = await supabase
                .from("witness_statements")
                .select("id, incident_id, tenant_id, witness_name, witness_contact, relationship, statement_text, audio_url, ai_transcription_text, original_transcription, transcription_edited, transcription_approved, ai_analysis, assigned_witness_id, status, created_by, created_at, deleted_at, return_reason, return_count, returned_by, returned_at, reviewed_by, reviewed_at")
                .eq("incident_id", incidentId)
                .is("deleted_at", null)
                .order("created_at", { ascending: false });

            if (error) throw error;

            return ((data as unknown as Record<string, unknown>[]) || []).map((row) => ({
                id: row.id as string,
                incident_id: row.incident_id as string,
                tenant_id: row.tenant_id as string,
                name: row.witness_name as string,
                contact: row.witness_contact as string,
                relationship: row.relationship as string,
                statement: row.statement_text as string,
                statement_method: 'text' as StatementType,
                audio_url: row.audio_url as string,
                ai_transcription_text: row.ai_transcription_text as string,
                original_transcription: row.original_transcription as string,
                transcription_edited: (row.transcription_edited as boolean) || false,
                transcription_approved: (row.transcription_approved as boolean) || false,
                ai_analysis: row.ai_analysis as Record<string, unknown> | null,
                assigned_witness_id: row.assigned_witness_id as string,
                assignment_status: null,
                status: row.status as WitnessStatus,
                created_by: row.created_by as string,
                created_at: row.created_at as string,
                deleted_at: row.deleted_at as string,
                return_reason: row.return_reason as string,
                return_count: (row.return_count as number) || 0,
                returned_by: row.returned_by as string,
                returned_at: row.returned_at as string,
                reviewed_by: row.reviewed_by as string,
                reviewed_at: row.reviewed_at as string,
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

export function useMyAssignedWitnessStatements() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["my-witness-tasks", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];

            const { data, error } = await supabase
                .from("witness_statements")
                .select("id, incident_id, witness_name, witness_contact, statement_text, assignment_status, created_at, return_reason, return_count, returned_at")
                .eq("assigned_witness_id", user.id)
                .is("deleted_at", null)
                .order("created_at", { ascending: false });

            if (error) throw error;

            return ((data as unknown as Record<string, unknown>[]) || []).map((row) => ({
                id: row.id as string,
                incident_id: row.incident_id as string,
                name: row.witness_name as string,
                contact: row.witness_contact as string,
                statement: row.statement_text as string,
                statement_method: 'text' as StatementType,
                status: (row.assignment_status || 'pending') as WitnessStatus,
                created_at: row.created_at as string,
                return_reason: row.return_reason as string,
                return_count: (row.return_count as number) || 0,
                returned_at: row.returned_at as string,
            }));
        },
        enabled: !!user?.id,
    });
}
