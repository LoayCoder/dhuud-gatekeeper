import type { Json } from "@/integrations/supabase/types";

export interface RootCauseEntry {
    id: string;
    text: string;
    category?: string;
    added_at?: string;
    added_by?: string;
}

export interface ContributingFactorEntry {
    id: string;
    text: string;
}

export interface Investigation {
    id: string;
    incident_id: string;
    investigator_id: string | null;
    started_at: string | null;
    completed_at: string | null;
    immediate_cause: string | null;
    underlying_cause: string | null;
    root_cause: string | null;
    contributing_factors: string | null;
    findings_summary: string | null;
    five_whys: FiveWhyEntry[] | null;
    root_causes: RootCauseEntry[] | null;
    contributing_factors_list: ContributingFactorEntry[] | null;
    ai_summary: string | null;
    ai_summary_generated_at: string | null;
    ai_summary_language: string | null;
    tenant_id: string;
    created_at: string;
    updated_at: string;
    assigned_by: string | null;
    assigned_at: string | null;
    assignment_notes: string | null;
    rca_id?: string;
    is_rca_locked?: boolean;
    rca_locked_by?: string | null;
    rca_locked_at?: string | null;
}

export interface FiveWhyEntry {
    why: string;
    answer: string;
}

export interface CorrectiveAction {
    id: string;
    incident_id: string;
    title: string;
    description: string | null;
    assigned_to: string | null;
    responsible_department_id: string | null;
    start_date: string | null;
    due_date: string | null;
    priority: string | null;
    status: string | null;
    action_type: string | null;
    category: string | null;
    linked_root_cause_id: string | null;
    linked_cause_type: string | null;
    completed_date: string | null;
    verified_by: string | null;
    verified_at: string | null;
    verification_notes: string | null;
    rejected_by: string | null;
    rejected_at: string | null;
    rejection_notes: string | null;
    tenant_id: string;
    created_at: string;
    assignee?: { id: string; full_name: string | null; job_title: string | null } | null;
    department?: { id: string; name: string } | null;
}

export interface IncidentAuditLog {
    id: string;
    incident_id: string;
    actor_id: string | null;
    action: string;
    old_value: Json | null;
    new_value: Json | null;
    details: Json | null;
    ip_address: string | null;
    created_at: string;
}
