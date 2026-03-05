export interface StockTransaction {
    id: string; tenant_id: string; part_id: string;
    transaction_type: 'receipt' | 'issue' | 'adjustment' | 'return';
    quantity: number; previous_quantity: number | null; new_quantity: number | null;
    reference_type: string | null; reference_id: string | null; unit_cost: number | null;
    notes: string | null; created_by: string | null; created_at: string;
}

export interface PurchaseOrder {
    id: string; tenant_id: string; po_number: string;
    supplier_name: string | null; supplier_contact: string | null;
    status: 'draft' | 'submitted' | 'approved' | 'received' | 'cancelled';
    order_date: string | null; expected_delivery_date: string | null; actual_delivery_date: string | null;
    total_amount: number | null; currency: string; notes: string | null;
    created_by: string | null; approved_by: string | null; approved_at: string | null;
    received_by: string | null; received_at: string | null;
    created_at: string; updated_at: string;
}

export interface PurchaseOrderLine {
    id: string; tenant_id: string; purchase_order_id: string; part_id: string;
    quantity_ordered: number; quantity_received: number; unit_cost: number | null;
    part?: { name: string; part_number: string; };
}
