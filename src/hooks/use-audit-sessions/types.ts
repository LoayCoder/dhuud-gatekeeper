// Types for audit session hooks

export interface AuditTemplate {
    id: string;
    tenant_id: string;
    code: string;
    name: string;
    name_ar: string | null;
    description: string | null;
    template_type: 'audit';
    scope_description: string | null;
    estimated_duration_minutes: number | null;
    requires_photos: boolean;
    requires_gps: boolean;
    standard_reference: string | null;
    passing_score_percentage: number | null;
    version: number;
    is_active: boolean;
    created_at: string;
}

export interface AuditTemplateItem {
    id: string;
    template_id: string;
    question: string;
    question_ar: string | null;
    response_type: string;
    clause_reference: string | null;
    scoring_weight: number;
    nc_category: 'minor' | 'major' | 'critical' | null;
    is_critical: boolean;
    is_required: boolean;
    instructions: string | null;
    instructions_ar: string | null;
    sort_order: number;
}

export interface AuditResponse {
    id: string;
    session_id: string;
    template_item_id: string;
    result: 'conforming' | 'non_conforming' | 'na' | null;
    response_value: string | null;
    notes: string | null;
    objective_evidence: string | null;
    nc_category: 'minor' | 'major' | 'critical' | null;
    photo_paths: string[];
    responded_at: string | null;
}

export interface CreateAuditSessionInput {
    template_id: string;
    period: string;
    site_id?: string | null;
    building_id?: string | null;
    floor_zone_id?: string | null;
    scope_notes?: string | null;
    audit_objective?: string | null;
    lead_auditor_id?: string | null;
    audit_team?: { name: string; role?: string }[];
}

export interface AuditProgress {
    total: number;
    responded: number;
    conforming: number;
    nonConforming: number;
    na: number;
    weightedScore: number;
    maxScore: number;
    percentage: number;
    passingThreshold: number;
    isPassing: boolean;
    hasBlockingNC: boolean;
}

export interface NCCounts {
    minor: number;
    major: number;
    critical: number;
    total: number;
}
