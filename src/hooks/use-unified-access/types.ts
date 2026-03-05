import { startOfDay } from 'date-fns';

export type EntityType = 'visitor' | 'worker' | 'contractor' | 'employee' | 'vehicle';

export interface UnifiedAccessEntry {
    id: string;
    entity_type: EntityType;
    person_name: string;
    entry_time: string;
    exit_time: string | null;
    visitor_id?: string | null;
    mobile_number?: string | null;
    car_plate?: string | null;
    destination_name?: string | null;
    purpose?: string | null;
    nationality?: string | null;
    worker_id?: string | null;
    project_id?: string | null;
    validation_status?: string | null;
    validation_errors?: string[] | null;
    material_gate_pass_id?: string | null;
    site_id?: string | null;
    guard_id?: string | null;
    notes?: string | null;
    created_at: string;
    worker?: {
        id: string;
        full_name: string;
        full_name_ar?: string | null;
        photo_path?: string | null;
        national_id?: string;
        company?: { company_name: string } | null;
    } | null;
    project?: {
        project_name: string;
    } | null;
}

export interface UnifiedAccessStats {
    totalOnSite: number;
    visitorsOnSite: number;
    workersOnSite: number;
    todayEntries: number;
    pendingVisitorApprovals: number;
    pendingWorkerApprovals: number;
    pendingGatePassApprovals: number;
}

export interface UnifiedAccessFilters {
    search?: string;
    entityType?: EntityType | 'all';
    siteId?: string;
    dateFrom?: string;
    dateTo?: string;
    onlyActive?: boolean;
}
