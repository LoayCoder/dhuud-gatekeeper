import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GatePassItem {
  id: string;
  gate_pass_id: string;
  item_name: string;
  description: string | null;
  quantity: string | null;
  unit: string | null;
  created_at: string;
  sr_number?: string | null;
  photo_storage_path?: string | null;
}

export interface GatePassPhoto {
  id: string;
  gate_pass_id: string;
  item_id: string | null;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  signedUrl?: string;
}

export interface GatePassApproverProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface GatePassDetailData {
  id: string;
  reference_number: string;
  project_id: string | null;
  company_id: string | null;
  pass_type: string;
  material_description: string;
  quantity: string | null;
  vehicle_plate: string | null;
  driver_name: string | null;
  driver_mobile: string | null;
  pass_date: string;
  start_date?: string | null;
  end_date?: string | null;
  time_window_start: string | null;
  time_window_end: string | null;
  status: string;
  requested_by: string;
  // Contractor Consultant approval (external workflow stage 1)
  contractor_approved_by: string | null;
  contractor_approved_at: string | null;
  contractor_approval_notes: string | null;
  // PM/Dept Rep approval
  pm_approved_by: string | null;
  pm_approved_at: string | null;
  pm_notes: string | null;
  // Club Management acknowledgment (new step)
  club_mgmt_ack_by: string | null;
  club_mgmt_ack_at: string | null;
  club_mgmt_ack_notes: string | null;
  // Security Supervisor approval (internal workflow stage 2)
  security_approved_by: string | null;
  security_approved_at: string | null;
  security_approval_notes: string | null;
  // Safety approval (legacy)
  safety_approved_by: string | null;
  safety_approved_at: string | null;
  safety_notes: string | null;
  // Rejection
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  // Guard verification
  guard_verified_by: string | null;
  guard_verified_at: string | null;
  entry_time: string | null;
  exit_time: string | null;
  created_at: string;
  is_internal_request: boolean;
  approval_from_id: string | null;
  qr_code_token: string | null;
  qr_generated_at: string | null;
  // Renewal tracking
  renewal_count?: number;
  renewed_by?: string | null;
  renewed_at?: string | null;
  renewal_expires_at?: string | null;
  project?: { project_name: string; company?: { company_name: string } } | null;
  company?: { company_name: string } | null;
  requester?: GatePassApproverProfile | null;
  contractor_approver?: GatePassApproverProfile | null;
  pm_approver?: GatePassApproverProfile | null;
  club_mgmt_acker?: GatePassApproverProfile | null;
  security_approver?: GatePassApproverProfile | null;
  safety_approver?: GatePassApproverProfile | null;
  rejector?: GatePassApproverProfile | null;
  guard?: GatePassApproverProfile | null;
  approval_from?: GatePassApproverProfile | null;
  is_public_request?: boolean;
  public_requester_name?: string | null;
  public_requester_phone?: string | null;
  public_requester_email?: string | null;
  public_requester_company?: string | null;
}

export function useGatePassDetails(passId: string | null) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["gate-pass-details", passId],
    queryFn: async () => {
      if (!passId || !tenantId) return null;

      const { getGatePassDetails } = await import('@/features/contractors/services/gatePassQueryService');
      return getGatePassDetails(passId, tenantId);
    },
    enabled: !!passId && !!tenantId,
  });
}

/** @deprecated Use useGatePassMedia from use-gate-pass-media.ts instead */
export function useGatePassItems(passId: string | null, isPublic: boolean = false) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["gate-pass-items", passId, isPublic],
    queryFn: async () => {
      if (!passId || !tenantId) return [];

      const { getGatePassItems } = await import('@/features/contractors/services/gatePassQueryService');
      return getGatePassItems(passId, tenantId, isPublic);
    },
    enabled: !!passId && !!tenantId,
  });
}

/** @deprecated Use useGatePassMedia from use-gate-pass-media.ts instead */
export function useGatePassPhotos(passId: string | null, isPublic: boolean = false) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["gate-pass-photos", passId, isPublic],
    queryFn: async () => {
      if (!passId || !tenantId) return [];

      const { getGatePassPhotos } = await import('@/features/contractors/services/gatePassQueryService');
      return getGatePassPhotos(passId, tenantId, isPublic);
    },
    enabled: !!passId && !!tenantId,
  });
}
