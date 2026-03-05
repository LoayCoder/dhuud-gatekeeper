export interface ClientSiteRepCompany {
    id: string;
    company_name: string;
    company_name_ar: string | null;
    status: string;
    contract_start_date: string | null;
    contract_end_date: string | null;
    total_workers: number;
    email: string | null;
    phone: string | null;
}

export interface ClientSiteRepWorkerSummary {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    blacklisted: number;
}

export interface ClientSiteRepWorkerDetail {
    id: string;
    full_name: string;
    worker_id: string | null;
    mobile_number: string | null;
    approval_status: string;
    company_name: string;
}

export interface ClientSiteRepGatePassDetail {
    id: string;
    pass_number: string;
    status: string;
    pass_date: string | null;
    material_description: string | null;
    company_name: string;
}

export interface ClientSiteRepIncidentDetail {
    id: string;
    incident_number: string;
    description: string | null;
    status: string;
    event_type: string;
    occurred_at: string | null;
}

export interface ClientSiteRepProjectDetail {
    id: string;
    project_name: string;
    status: string;
    start_date: string | null;
    company_name: string;
}

export interface ClientSiteRepProjectSummary {
    total: number;
    active: number;
    planned: number;
    completed: number;
    on_hold: number;
}

export interface ClientSiteRepGatePassSummary {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
}

export interface ClientSiteRepIncidentSummary {
    total: number;
    open: number;
    under_investigation: number;
    closed: number;
}

export interface ClientSiteRepViolation {
    id: string;
    violation_type: string;
    severity: string;
    status: string;
    company_name: string;
    reported_at: string;
}

export interface ClientSiteRepPersonnel {
    safetyOfficers: {
        id: string;
        full_name: string;
        phone: string | null;
        email: string | null;
        is_primary: boolean;
        is_onsite: boolean;
        last_entry_at: string | null;
        company_name: string;
    }[];
    contractorReps: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        is_primary: boolean;
        is_onsite: boolean;
        last_entry_at: string | null;
        company_name: string;
    }[];
}

// Validation helper for data sources
export function validateWidgetData(name: string, data: unknown): boolean {
    if (data === null || data === undefined) {
        console.error(`[Dashboard Validation] ${name}: No data source connected`);
        return false;
    }
    return true;
}
