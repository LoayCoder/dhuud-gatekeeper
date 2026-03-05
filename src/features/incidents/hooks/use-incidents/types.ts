import type { Database } from '@/integrations/supabase/types';
import type { SeverityLevelV2 } from '@/lib/hsse-severity-levels';

export type Incident = Database['public']['Tables']['incidents']['Row'];
export type IncidentInsert = Database['public']['Tables']['incidents']['Insert'];

export interface ClosedOnSpotPayload {
    closed_on_spot: boolean;
    photo_paths?: string[];
}

export interface IncidentFormData {
    title: string;
    description: string;
    event_type: string;
    subtype?: string;
    occurred_at: string;
    location?: string;
    department?: string;
    severity?: SeverityLevelV2;
    severity_override_reason?: string;
    erp_activated?: boolean;
    injury_classification?: string;
    risk_rating?: 'low' | 'medium' | 'high';
    immediate_actions?: string;
    closed_on_spot_data?: ClosedOnSpotPayload;
    has_injury: boolean;
    injury_details?: {
        count?: number;
        description?: string;
    };
    has_damage: boolean;
    damage_details?: {
        description?: string;
        estimated_cost?: number;
    };
    site_id?: string;
    branch_id?: string;
    department_id?: string;
    latitude?: number;
    longitude?: number;
    location_country?: string;
    location_city?: string;
    location_district?: string;
    location_street?: string;
    location_formatted?: string;
    special_event_id?: string;
    recognition_type?: 'individual' | 'department' | 'contractor';
    recognized_user_id?: string;
    recognized_contractor_worker_id?: string;
    related_contractor_company_id?: string;
    tags?: string[];
    tag_contractor_id?: string;
    tag_department_id?: string;
}

export interface UseIncidentsOptions {
    page?: number;
    pageSize?: number;
    filters?: {
        search?: string;
        status?: string;
        severity?: string;
        eventType?: string;
        branchId?: string;
        contractorId?: string;
        dateRange?: { from: Date; to?: Date };
        tags?: string[];
    };
}

export interface IncidentWithDetails {
    id: string;
    reference_id: string | null;
    title: string;
    description: string;
    event_type: string;
    subtype: string | null;
    occurred_at: string | null;
    location: string | null;
    severity: 'low' | 'medium' | 'high' | 'critical' | null;
    severity_v2: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | null;
    original_severity_v2: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | null;
    severity_override_reason: string | null;
    status: 'submitted' | 'pending_review' | 'investigation_pending' | 'investigation_in_progress' | 'closed' | null;
    immediate_actions: string | null;
    has_injury: boolean | null;
    injury_details: Record<string, unknown> | null;
    has_damage: boolean | null;
    damage_details: Record<string, unknown> | null;
    latitude: number | null;
    longitude: number | null;
    location_country: string | null;
    location_city: string | null;
    location_district: string | null;
    location_street: string | null;
    location_formatted: string | null;
    media_attachments: unknown[] | null;
    ai_analysis_result: Record<string, unknown> | null;
    created_at: string | null;
    updated_at: string | null;
    tenant_id: string;
    reporter_id: string | null;
    branch_id: string | null;
    site_id: string | null;
    department_id: string | null;
    special_event_id: string | null;
    approved_by: string | null;
    approved_at: string | null;
    approval_notes: string | null;
    investigation_locked: boolean | null;
    original_severity: 'low' | 'medium' | 'high' | 'critical' | null;
    severity_change_justification: string | null;
    severity_approved_by: string | null;
    severity_approved_at: string | null;
    severity_pending_approval: boolean | null;
    potential_severity_v2: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | null;
    original_potential_severity_v2: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | null;
    potential_severity_pending_approval: boolean | null;
    potential_severity_justification: string | null;
    potential_severity_approved_by: string | null;
    potential_severity_approved_at: string | null;
    closure_requested_by: string | null;
    closure_requested_at: string | null;
    closure_request_notes: string | null;
    reporter?: { id: string; full_name: string | null } | null;
    closure_requester?: { id: string; full_name: string | null } | null;
    branch?: { id: string; name: string } | null;
    site?: { id: string; name: string; latitude?: number | null; longitude?: number | null } | null;
    department_info?: { id: string; name: string } | null;
    special_event?: { id: string; name: string } | null;
    approval_manager?: { id: string; full_name: string | null; job_title: string | null } | null;
    investigations?: { investigator?: { id: string; full_name: string | null; job_title: string | null } | null }[] | null;
    related_contractor_company_id?: string | null;
    related_contractor_company?: { id: string; company_name: string } | null;
    approval_manager_id?: string | null;
    consultant_screening_notes?: string | null;
}
