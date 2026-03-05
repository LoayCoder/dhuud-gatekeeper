import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from '@/lib/logger';
import type { StatementType, WitnessStatus } from './types';

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
                    status: input.status || 'pending',
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

// Hook for reviewing (approving/returning) witness statements
export function useReviewWitnessStatement() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (input: {
            id: string;
            action: "approve" | "return";
            returnReason?: string;
            incidentReference?: string;
            incidentTitle?: string;
            tenantName?: string;
        }) => {
            const { id, action, returnReason, incidentReference, incidentTitle, tenantName } = input;

            if (action === "approve") {
                const { data, error } = await supabase
                    .from("witness_statements")
                    .update({
                        status: "approved",
                        reviewed_by: user?.id,
                        reviewed_at: new Date().toISOString(),
                    })
                    .eq("id", id)
                    .select("id, incident_id, assigned_witness_id")
                    .single();

                if (error) throw error;
                return { ...data, action: "approve" };
            } else {
                const { data: current } = await supabase
                    .from("witness_statements")
                    .select("return_count")
                    .eq("id", id)
                    .single();

                const newReturnCount = (current?.return_count || 0) + 1;

                const { data, error } = await supabase
                    .from("witness_statements")
                    .update({
                        status: "returned",
                        return_reason: returnReason,
                        return_count: newReturnCount,
                        returned_by: user?.id,
                        returned_at: new Date().toISOString(),
                    })
                    .eq("id", id)
                    .select("id, incident_id, assigned_witness_id")
                    .single();

                if (error) throw error;

                if (data.assigned_witness_id) {
                    try {
                        await supabase.functions.invoke('send-action-email', {
                            body: {
                                type: 'witness_statement_returned',
                                recipient_id: data.assigned_witness_id,
                                incident_reference: incidentReference,
                                incident_title: incidentTitle,
                                return_reason: returnReason,
                                return_count: newReturnCount,
                                tenant_name: tenantName,
                            }
                        });
                    } catch (notifyError) {
                        console.error('Failed to send return notification:', notifyError);
                    }
                }

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

export function useStartWitnessWork() {
    return useMutation({
        mutationFn: async (statementId: string) => {
            return { id: statementId }; // No-op
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
