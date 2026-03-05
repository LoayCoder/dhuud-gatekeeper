export interface ClosureRequest {
    id: string;
    reference_id: string;
    title: string;
    status: string;
    closure_requested_by: string | null;
    closure_requested_at: string | null;
    closure_request_notes: string | null;
    requester_name?: string;
}

export interface ClosureCheckResult {
    can_close: boolean;
    total_actions: number;
    verified_actions: number;
    pending_actions: { id: string; title: string; status: string }[];
    blocking_reasons?: string[];
}
