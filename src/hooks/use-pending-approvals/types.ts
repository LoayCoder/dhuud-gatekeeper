// Types for pending approval hooks

// Pending incident approvals for managers
export interface PendingIncidentApproval {
    id: string;
    reference_id: string | null;
    title: string;
    status: string | null;
    severity: string | null;
    event_type: string | null;
    created_at: string | null;
    reporter?: { id: string; full_name: string | null } | null;
    // Location fields
    location?: string | null;
    location_city?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    site?: { id: string; name: string; latitude?: number | null; longitude?: number | null } | null;
    branch?: { id: string; name: string } | null;
}

export interface PendingActionApproval {
    id: string;
    reference_id: string | null;
    title: string;
    description: string | null;
    status: string | null;
    priority: string | null;
    category: string | null;
    due_date: string | null;
    completed_date: string | null;
    incident_id: string | null;
    assigned_to: string | null;
    responsible_department_id: string | null;
    created_at: string | null;
    linked_cause_type: string | null;
    linked_root_cause_id: string | null;
    completion_notes: string | null;
    // Joined data
    assigned_user?: { id: string; full_name: string | null } | null;
    department?: { id: string; name: string } | null;
    incident?: { id: string; reference_id: string | null; title: string; event_type?: string | null } | null;
}

export interface PendingSeverityApproval {
    id: string;
    reference_id: string | null;
    title: string;
    severity_v2: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | null;
    original_severity_v2: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | null;
    severity_change_justification: string | null;
    severity_pending_approval: boolean;
    created_at: string | null;
    reporter?: { id: string; full_name: string | null } | null;
}

export interface PendingPotentialSeverityApproval {
    id: string;
    reference_id: string | null;
    title: string;
    potential_severity_v2: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | null;
    original_potential_severity_v2: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | null;
    potential_severity_justification: string | null;
    potential_severity_pending_approval: boolean;
    created_at: string | null;
    reporter?: { id: string; full_name: string | null } | null;
}
