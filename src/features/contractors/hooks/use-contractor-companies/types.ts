export interface ContractorCompany {
    id: string;
    tenant_id: string;
    company_name: string;
    company_name_ar: string | null;
    commercial_registration_number: string | null;
    vat_number: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    status: string;
    assigned_client_pm_id: string | null;
    suspension_reason: string | null;
    suspended_at: string | null;
    suspended_by: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    assigned_client_pm?: { full_name: string } | null;
    // Approval workflow fields
    approval_status?: string;
    approved_by?: string | null;
    approved_at?: string | null;
    approval_requested_at?: string | null;
    rejection_reason?: string | null;
    created_by?: string | null;
}

export interface ContractorCompanyFilters {
    search?: string;
    status?: string;
    city?: string;
}
