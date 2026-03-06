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
    assigned_branch_id?: string | null;
    // Approval workflow fields
    approval_status?: string;
    approved_by?: string | null;
    approved_at?: string | null;
    approval_requested_at?: string | null;
    rejection_reason?: string | null;
    created_by?: string | null;
    // Extended fields (exist in DB but not always selected)
    scope_of_work?: string | null;
    contract_start_date?: string | null;
    contract_end_date?: string | null;
    total_workers?: number | null;
    safety_officers_count?: number | null;
    client_site_rep_id?: string | null;
    assigned_department_id?: string | null;
    assigned_section_id?: string | null;
    // Site rep fields (from joined/extended queries)
    contractor_site_rep_name?: string | null;
    contractor_site_rep_email?: string | null;
    contractor_site_rep_phone?: string | null;
}

export interface ContractorCompanyFilters {
    search?: string;
    status?: string;
    city?: string;
}
