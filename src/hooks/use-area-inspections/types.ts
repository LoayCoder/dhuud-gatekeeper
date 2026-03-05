// Types for area inspection hooks

import type { TemplateItem } from '../use-inspections';

export interface AreaInspectionResponse {
    id: string;
    tenant_id: string;
    session_id: string;
    template_item_id: string;
    response_value: string | null;
    result: 'pass' | 'fail' | 'na' | null;
    notes: string | null;
    photo_paths: string[];
    gps_lat: number | null;
    gps_lng: number | null;
    gps_accuracy: number | null;
    responded_by: string | null;
    responded_at: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    template_item?: TemplateItem;
    responder?: { full_name: string };
}

export interface AreaTemplate {
    id: string;
    tenant_id: string;
    code: string;
    name: string;
    name_ar: string | null;
    description: string | null;
    template_type: 'asset' | 'area' | 'audit';
    scope_description: string | null;
    estimated_duration_minutes: number | null;
    requires_photos: boolean;
    requires_gps: boolean;
    category_id: string | null;
    type_id: string | null;
    branch_id: string | null;
    site_id: string | null;
    version: number;
    is_active: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    category?: { name: string; name_ar: string | null };
    type?: { name: string; name_ar: string | null };
    branch?: { name: string };
    site?: { name: string };
}

export interface CreateAreaSessionInput {
    template_id: string;
    period: string;
    site_id?: string | null;
    building_id?: string | null;
    floor_zone_id?: string | null;
    scope_notes?: string | null;
    weather_conditions?: string | null;
    attendees?: { name: string; role?: string }[];
    gps_boundary?: { lat: number; lng: number }[];
}

export interface SaveAreaResponseInput {
    session_id: string;
    template_item_id: string;
    result?: 'pass' | 'fail' | 'na';
    response_value?: string;
    notes?: string;
    photo_paths?: string[];
    gps_lat?: number;
    gps_lng?: number;
    gps_accuracy?: number;
}

export interface AreaChecklistProgress {
    total: number;
    responded: number;
    passed: number;
    failed: number;
    na: number;
    percentage: number;
}
