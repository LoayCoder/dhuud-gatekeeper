export interface InspectionAction {
    id: string;
    reference_id: string | null;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    assigned_to: string | null;
    session_id: string | null;
    source_finding_id: string | null;
    verified_by: string | null;
    verified_at: string | null;
    verification_notes: string | null;
    created_at: string;
    // Workflow fields (matching incident actions)
    completed_date?: string | null;
    return_count?: number | null;
    rejection_notes?: string | null;
    last_return_reason?: string | null;
    rejected_at?: string | null;
    started_at?: string | null;
    progress_notes?: string | null;
    completion_notes?: string | null;
    overdue_justification?: string | null;
    // Joined data
    assigned_user?: { full_name: string } | null;
    rejected_by_profile?: { id: string; full_name: string } | null;
    finding?: {
        reference_id: string;
        classification: string;
        description: string | null;
    } | null;
    session?: {
        reference_id: string;
        name: string | null;
    } | null;
}
