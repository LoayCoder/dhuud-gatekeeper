export interface ApprovalConfig {
    id: string;
    tenant_id: string;
    workflow_type: "transfer" | "disposal" | "purchase";
    name: string;
    description?: string;
    auto_approve_below_amount?: number;
    currency: string;
    is_active: boolean;
    escalation_enabled: boolean;
    escalation_hours: number;
    created_at: string;
    updated_at: string;
}

export interface ApprovalLevel {
    id: string;
    config_id: string;
    tenant_id: string;
    level_order: number;
    name: string;
    required_role?: string;
    specific_user_id?: string;
    timeout_hours: number;
    min_amount?: number;
    max_amount?: number;
}

export interface PurchaseRequest {
    id: string;
    tenant_id: string;
    request_number: string;
    title: string;
    description?: string;
    asset_category_id?: string;
    asset_type_id?: string;
    quantity: number;
    estimated_cost: number;
    currency: string;
    budget_code?: string;
    justification?: string;
    vendor_name?: string;
    vendor_quote_path?: string;
    status: "pending" | "approved" | "rejected" | "cancelled" | "ordered" | "received";
    current_approval_level: number;
    approval_config_id?: string;
    requested_by: string;
    requested_at: string;
    final_decision_at?: string;
    final_decision_by?: string;
    rejection_reason?: string;
    created_at: string;
}

export interface PurchaseApproval {
    id: string;
    request_id: string;
    tenant_id: string;
    approval_level: number;
    approver_id: string;
    decision: "approved" | "rejected" | "returned";
    notes?: string;
    decided_at: string;
}
