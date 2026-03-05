export type StatementType = "upload" | "text" | "voice";
export type WitnessStatus = "pending" | "review" | "approved" | "returned";

export interface WitnessStatement {
    id: string; incident_id: string | null; tenant_id: string;
    name: string; contact: string | null; relationship: string | null;
    statement: string; statement_method: StatementType;
    audio_url: string | null; ai_transcription_text: string | null;
    original_transcription: string | null; transcription_edited: boolean;
    transcription_approved: boolean; ai_analysis: Record<string, unknown> | null;
    assigned_witness_id: string | null; assignment_status: string | null;
    status: WitnessStatus | null; created_by: string | null;
    created_at: string | null; deleted_at: string | null;
    return_reason: string | null; return_count: number;
    returned_by: string | null; returned_at: string | null;
    reviewed_by: string | null; reviewed_at: string | null;
}
