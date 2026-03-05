export interface InspectionSchedule {
    id: string;
    tenant_id: string;
    reference_id: string;
    name: string;
    name_ar: string | null;
    schedule_type: 'asset' | 'area' | 'audit';
    template_id: string;
    frequency_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annually' | 'annually' | 'custom';
    frequency_value: number;
    day_of_week: number | null;
    day_of_month: number | null;
    month_of_year: number | null;
    site_id: string | null;
    building_id: string | null;
    floor_zone_id: string | null;
    category_id: string | null;
    type_id: string | null;
    assigned_inspector_id: string | null;
    assigned_team: string[];
    start_date: string;
    end_date: string | null;
    next_due: string | null;
    last_generated: string | null;
    reminder_days_before: number;
    is_active: boolean;
    auto_generate_session: boolean;
    sessions_generated_count: number;
    created_at: string;
    template?: { id: string; name: string; name_ar: string | null; template_type: string; };
    assigned_inspector?: { id: string; full_name: string; };
    site?: { id: string; name: string };
    building?: { id: string; name: string };
}

export interface ScheduleFilters {
    type?: 'asset' | 'area' | 'audit';
    isActive?: boolean;
    siteId?: string;
}

export interface CreateScheduleInput {
    name: string;
    name_ar?: string;
    schedule_type: 'asset' | 'area' | 'audit';
    template_id: string;
    frequency_type: string;
    frequency_value: number;
    day_of_week?: number | null;
    day_of_month?: number | null;
    month_of_year?: number | null;
    site_id?: string | null;
    building_id?: string | null;
    floor_zone_id?: string | null;
    category_id?: string | null;
    type_id?: string | null;
    assigned_inspector_id?: string | null;
    assigned_team?: string[];
    start_date: string;
    end_date?: string | null;
    reminder_days_before?: number;
}
