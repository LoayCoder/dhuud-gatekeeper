export interface AreaFinding {
    id: string;
    tenant_id: string;
    session_id: string;
    response_id: string;
    reference_id: string;
    classification: 'minor_nc' | 'major_nc' | 'critical_nc' | 'observation' | 'ofi';
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    description: string | null;
    recommendation: string | null;
    corrective_action_id: string | null;
    status: 'open' | 'action_assigned' | 'closed';
    created_by: string | null;
    created_at: string;
    closed_at: string | null;
    closed_by: string | null;
    // SLA fields
    due_date: string | null;
    escalation_level: number;
    escalation_notes: string | null;
    last_escalated_at: string | null;
    warning_sent_at: string | null;
    // Joined data
    creator?: { full_name: string };
    closer?: { full_name: string };
    corrective_action?: {
        id: string;
        title: string;
        status: string;
    };
    response?: {
        template_item?: {
            question: string;
            question_ar: string | null;
        };
    };
}

export interface CreateAreaFindingInput {
    session_id: string;
    response_id: string;
    classification?: 'minor_nc' | 'major_nc' | 'critical_nc' | 'observation' | 'ofi';
    risk_level?: 'low' | 'medium' | 'high' | 'critical';
    description?: string;
    recommendation?: string;
}

export interface CreateActionFromFindingInput {
    findingId: string;
    sessionId: string;
    title: string;
    description: string;
    assigned_to?: string;
    responsible_department_id?: string;
    due_date: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    action_type: 'corrective' | 'preventive';
    category: 'operations' | 'maintenance' | 'training' | 'procedural' | 'equipment';
}
