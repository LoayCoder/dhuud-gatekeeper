// Types for inspection sessions

export interface InspectionSession {
    id: string;
    tenant_id: string;
    session_type: 'asset' | 'area' | 'audit';
    template_id: string;
    period: string;
    site_id: string | null;
    building_id: string | null;
    floor_zone_id: string | null;
    category_id: string | null;
    type_id: string | null;
    status: 'draft' | 'in_progress' | 'completed_with_open_actions' | 'closed';
    started_at: string | null;
    completed_at: string | null;
    closed_at: string | null;
    total_assets: number;
    inspected_count: number;
    passed_count: number;
    failed_count: number;
    not_accessible_count: number;
    compliance_percentage: number | null;
    ai_summary: string | null;
    ai_summary_generated_at: string | null;
    inspector_id: string;
    reference_id: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Area inspection extended fields
    scope_notes: string | null;
    weather_conditions: string | null;
    attendees: unknown; // JSON type from DB - cast as needed
    gps_boundary: unknown; // JSON type from DB - cast as needed
    // Report fields
    report_url: string | null;
    report_generated_at: string | null;
    // Joined data
    template?: { name: string; name_ar: string | null };
    site?: { name: string };
    category?: { name: string; name_ar: string | null };
    type?: { name: string; name_ar: string | null };
    inspector?: { full_name: string };
}

export interface SessionAsset {
    id: string;
    tenant_id: string;
    session_id: string;
    asset_id: string;
    quick_result: 'good' | 'not_good' | 'not_accessible' | null;
    failure_reason: string | null;
    notes: string | null;
    gps_lat: number | null;
    gps_lng: number | null;
    photo_paths: string[];
    inspected_at: string | null;
    inspected_by: string | null;
    created_at: string;
    updated_at: string;
    // Joined asset data
    asset?: {
        id: string;
        name: string;
        asset_code: string;
        serial_number: string | null;
        status: string;
        last_inspection_date: string | null;
        subtype_id: string | null;
        category?: { name: string; name_ar: string | null };
        type?: { id: string; name: string; name_ar: string | null };
        building?: { name: string };
        floor_zone?: { name: string };
    };
}

export interface InspectionFinding {
    id: string;
    tenant_id: string;
    session_id: string;
    session_asset_id: string | null;
    asset_id: string | null;
    classification: 'minor_nc' | 'major_nc' | 'critical_nc' | 'observation' | 'ofi';
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    ai_generated_description: string | null;
    action_id: string | null;
    status: 'open' | 'action_assigned' | 'action_completed' | 'closed';
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Joined data
    asset?: { name: string; asset_code: string };
}

export interface CreateSessionInput {
    session_type: 'asset' | 'area' | 'audit';
    template_id: string;
    period: string;
    site_id?: string | null;
    building_id?: string | null;
    floor_zone_id?: string | null;
    category_id?: string | null;
    type_id?: string | null;
}

export interface RecordInspectionInput {
    session_asset_id: string;
    quick_result: 'good' | 'not_good' | 'not_accessible';
    failure_reason?: string | null;
    notes?: string | null;
    gps_lat?: number | null;
    gps_lng?: number | null;
    photo_paths?: string[];
}
