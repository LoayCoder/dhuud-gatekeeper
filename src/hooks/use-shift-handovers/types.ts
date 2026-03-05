import { Json } from '@/integrations/supabase/types';

export interface OutstandingIssue {
    id: string;
    description: string;
    priority: string;
    resolved: boolean;
}

export interface EquipmentItem {
    item: string;
    status: 'ok' | 'damaged' | 'missing';
    notes?: string;
}

export interface ShiftHandover {
    id: string;
    tenant_id: string;
    outgoing_guard_id: string;
    incoming_guard_id: string | null;
    shift_date: string;
    zone_id: string | null;
    handover_time: string;
    acknowledged_at: string | null;
    status: 'pending' | 'acknowledged' | 'completed' | 'cancelled' | 'approved' | 'rejected';
    outstanding_issues: Json;
    equipment_checklist: Json;
    key_observations: string | null;
    visitor_info: string | null;
    next_shift_priorities: string | null;
    attachments: Json;
    notes: string | null;
    outgoing_signature: string | null;
    incoming_signature: string | null;
    signature_timestamp: string | null;
    created_at: string;
    updated_at: string;
    handover_type: 'standard' | 'vacation' | 'resignation';
    requires_approval: boolean;
    approved_by: string | null;
    approved_at: string | null;
    rejection_reason: string | null;
    assigned_followup_guard_id: string | null;
    outgoing_guard?: {
        full_name: string | null;
    };
    incoming_guard?: {
        full_name: string | null;
    };
    approved_by_user?: {
        full_name: string | null;
    };
    followup_guard?: {
        full_name: string | null;
    };
    zone?: {
        zone_name: string | null;
    };
}

// Helper to safely parse JSONB arrays
export function parseOutstandingIssues(data: Json | null | undefined): OutstandingIssue[] {
    if (!data || !Array.isArray(data)) return [];
    return data as unknown as OutstandingIssue[];
}

export function parseEquipmentChecklist(data: Json | null | undefined): EquipmentItem[] {
    if (!data || !Array.isArray(data)) return [];
    return data as unknown as EquipmentItem[];
}

export const HANDOVER_SELECT = `
  id, tenant_id, outgoing_guard_id, incoming_guard_id, shift_date, zone_id,
  handover_time, acknowledged_at, status, outstanding_issues, equipment_checklist,
  key_observations, visitor_info, next_shift_priorities, attachments, notes,
  outgoing_signature, incoming_signature, signature_timestamp, created_at, updated_at,
  handover_type, requires_approval, approved_by, approved_at, rejection_reason, assigned_followup_guard_id,
  outgoing_guard:profiles!shift_handovers_outgoing_guard_id_fkey(full_name),
  incoming_guard:profiles!shift_handovers_incoming_guard_id_fkey(full_name),
  approved_by_user:profiles!shift_handovers_approved_by_fkey(full_name),
  followup_guard:profiles!shift_handovers_assigned_followup_guard_id_fkey(full_name),
  zone:security_zones(zone_name)
`;
