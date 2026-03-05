export interface AssetTypePart {
    id: string; tenant_id: string; type_id: string | null; subtype_id: string | null;
    code: string; name: string; name_ar: string | null; description: string | null; description_ar: string | null;
    is_critical: boolean; default_response_type: 'pass_fail' | 'condition_rating' | 'numeric';
    sort_order: number; is_active: boolean; is_system: boolean;
    content_count: number | null; content_count_label: string | null;
    created_at: string; updated_at: string; deleted_at: string | null; branch_id: string | null;
}

export interface CreateAssetTypePartInput {
    type_id?: string | null; subtype_id?: string | null; code?: string;
    name: string; name_ar?: string; description?: string; description_ar?: string;
    is_critical?: boolean; default_response_type?: 'pass_fail' | 'condition_rating' | 'numeric';
    sort_order?: number; content_count?: number | null; content_count_label?: string | null;
}

export interface UpdateAssetTypePartInput {
    id: string; code?: string; name?: string; name_ar?: string; description?: string; description_ar?: string;
    is_critical?: boolean; default_response_type?: 'pass_fail' | 'condition_rating' | 'numeric';
    sort_order?: number; is_active?: boolean; content_count?: number | null; content_count_label?: string | null;
}
