export interface WorkerInduction {
    id: string;
    status: string;
    expires_at: string | null;
}

export interface ContractorWorker {
    id: string;
    tenant_id: string;
    company_id: string;
    full_name: string;
    full_name_ar: string | null;
    national_id: string;
    nationality: string | null;
    mobile_number: string;
    photo_path: string | null;
    preferred_language: string;
    approval_status: string;
    approved_at: string | null;
    approved_by?: string | null;
    rejection_reason: string | null;
    created_at: string;
    worker_type?: string; // 'worker' | 'site_representative' | 'safety_officer'
    safety_officer_id?: string | null;
    company?: { company_name: string } | null;
    latest_induction?: WorkerInduction | null;
    // Security approval stage fields
    security_approval_status?: string;
    security_approved_by?: string | null;
    security_approved_at?: string | null;
    security_rejection_reason?: string | null;
    // Who submitted the worker
    submitted_by?: string | null;
}

export interface ContractorWorkerFilters {
    search?: string;
    companyId?: string;
    approvalStatus?: string;
}
