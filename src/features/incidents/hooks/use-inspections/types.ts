// Types for inspection templates and asset inspections

export interface InspectionTemplate {
    id: string;
    tenant_id: string;
    code: string;
    name: string;
    name_ar: string | null;
    description: string | null;
    // Area inspection fields
    template_type: 'asset' | 'area' | 'audit';
    scope_description: string | null;
    estimated_duration_minutes: number | null;
    requires_photos: boolean;
    requires_gps: boolean;
    // Location filters
    category_id: string | null;
    type_id: string | null;
    branch_id: string | null;
    site_id: string | null;
    version: number;
    is_active: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    items?: TemplateItem[];
    category?: { name: string; name_ar: string | null };
    type?: { name: string; name_ar: string | null };
    branch?: { name: string };
    site?: { name: string };
}

export interface TemplateItem {
    id: string;
    template_id: string;
    tenant_id: string;
    sort_order: number;
    question: string;
    question_ar: string | null;
    response_type: 'pass_fail' | 'yes_no' | 'rating' | 'numeric' | 'text';
    min_value: number | null;
    max_value: number | null;
    rating_scale: number;
    is_critical: boolean;
    is_required: boolean;
    instructions: string | null;
    instructions_ar: string | null;
    created_at: string;
}

export interface AssetInspection {
    id: string;
    tenant_id: string;
    asset_id: string;
    template_id: string;
    reference_id: string;
    status: 'in_progress' | 'completed' | 'cancelled';
    inspection_date: string;
    inspector_id: string;
    overall_result: 'pass' | 'fail' | 'partial' | null;
    summary_notes: string | null;
    linked_incident_id: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
    template?: InspectionTemplate;
    inspector?: { full_name: string };
    asset?: { name: string; asset_code: string };
}

export interface InspectionResponse {
    id: string;
    inspection_id: string;
    template_item_id: string;
    tenant_id: string;
    response_value: string | null;
    result: 'pass' | 'fail' | 'na' | null;
    notes: string | null;
    photo_path: string | null;
    responded_at: string;
    template_item?: TemplateItem;
}
