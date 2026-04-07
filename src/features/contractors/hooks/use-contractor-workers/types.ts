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
    worker_type?: string;
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
    // Edit re-approval tracking
    edit_pending_approval?: boolean;
    edited_by?: string | null;
    edited_at?: string | null;
    // Photo verification fields
    photo_verified_by?: string | null;
    photo_verified_at?: string | null;
    // Extended profile fields
    id_type?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    email?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    worker_role?: string | null;
    fitness_to_work?: string | null;
    fitness_acknowledged?: boolean | null;
    medical_check_date?: string | null;
    fitness_expiry_date?: string | null;
    medical_certificate_path?: string | null;
    training_certifications?: string[] | null;
}

export interface ContractorWorkerFilters {
    search?: string;
    companyId?: string;
    approvalStatus?: string;
}
