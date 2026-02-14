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

      // Split into two queries to avoid TypeScript depth issues
      // Note: club_mgmt_ack fields will be available after types regeneration
      const { data: passData, error: passError } = await supabase
        .from("material_gate_passes")
        .select(`
          id, reference_number, project_id, company_id, pass_type, material_description,
          quantity, vehicle_plate, driver_name, driver_mobile, pass_date,
          start_date, end_date, renewal_count, renewed_by, renewed_at, renewal_expires_at,
          time_window_start, time_window_end, status, requested_by,
          contractor_approved_by, contractor_approved_at, contractor_approval_notes,
          pm_approved_by, pm_approved_at, pm_notes,
          club_mgmt_ack_by, club_mgmt_ack_at, club_mgmt_ack_notes,
          security_approved_by, security_approved_at, security_approval_notes,
          safety_approved_by, safety_approved_at, safety_notes,
          rejected_by, rejected_at, rejection_reason,
          guard_verified_by, guard_verified_at, entry_time, exit_time, created_at,
          is_internal_request, approval_from_id, qr_code_token, qr_generated_at,
          is_public_request, public_requester_name, public_requester_phone,
          public_requester_email, public_requester_company,
          project:contractor_projects(project_name, company:contractor_companies(company_name)),
          company:contractor_companies(company_name)
        `)
        .eq("id", passId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

      if (passError) throw passError;
      if (!passData) return null;

      // Cast to access new columns (available after types regeneration)
      const passDataExt = passData as typeof passData & {
        club_mgmt_ack_by?: string | null;
        club_mgmt_ack_at?: string | null;
        club_mgmt_ack_notes?: string | null;
      };

      // Fetch profile data separately
      const profileIds = [
        passDataExt.requested_by,
        passDataExt.contractor_approved_by,
        passDataExt.pm_approved_by,
        passDataExt.club_mgmt_ack_by,
        passDataExt.security_approved_by,
        passDataExt.safety_approved_by,
        passDataExt.rejected_by,
        passDataExt.guard_verified_by,
        passDataExt.approval_from_id,
      ].filter(Boolean) as string[];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", profileIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const requesterProfile = passDataExt.is_public_request
        ? {
          id: 'public',
          full_name: passDataExt.public_requester_name || 'Public User',
          avatar_url: null,
          email: passDataExt.public_requester_email,
          phone: passDataExt.public_requester_phone
        } as any
        : (profileMap.get(passDataExt.requested_by) || null);

      return {
        ...passDataExt,
        requester: requesterProfile,
        contractor_approver: passDataExt.contractor_approved_by ? profileMap.get(passDataExt.contractor_approved_by) || null : null,
        pm_approver: passDataExt.pm_approved_by ? profileMap.get(passDataExt.pm_approved_by) || null : null,
        club_mgmt_acker: passDataExt.club_mgmt_ack_by ? profileMap.get(passDataExt.club_mgmt_ack_by) || null : null,
        security_approver: passDataExt.security_approved_by ? profileMap.get(passDataExt.security_approved_by) || null : null,
        safety_approver: passDataExt.safety_approved_by ? profileMap.get(passDataExt.safety_approved_by) || null : null,
        rejector: passDataExt.rejected_by ? profileMap.get(passDataExt.rejected_by) || null : null,
        guard: passDataExt.guard_verified_by ? profileMap.get(passDataExt.guard_verified_by) || null : null,
        approval_from: passDataExt.approval_from_id ? profileMap.get(passDataExt.approval_from_id) || null : null,
      } as GatePassDetailData;
    },
    enabled: !!passId && !!tenantId,
  });
}

export function useGatePassItems(passId: string | null, isPublic: boolean = false) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["gate-pass-items", passId, isPublic],
    queryFn: async () => {
      if (!passId || !tenantId) return [];

      if (isPublic) {
        // Public passes store items in public_gate_pass_items
        const { data, error } = await supabase
          .from("public_gate_pass_items")
          .select("id, gate_pass_id, item_name, description, quantity, unit, sr_number, photo_storage_path, created_at")
          .eq("gate_pass_id", passId)
          .is("deleted_at", null)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        return (data || []).map(item => ({
          id: item.id,
          gate_pass_id: item.gate_pass_id,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          created_at: item.created_at,
          sr_number: item.sr_number,
          photo_storage_path: item.photo_storage_path,
        })) as GatePassItem[];
      }

      const { data, error } = await supabase
        .from("gate_pass_items")
        .select("id, gate_pass_id, item_name, description, quantity, unit, created_at")
        .eq("gate_pass_id", passId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as GatePassItem[];
    },
    enabled: !!passId && !!tenantId,
  });
}

export function useGatePassPhotos(passId: string | null, isPublic: boolean = false) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["gate-pass-photos", passId, isPublic],
    queryFn: async () => {
      if (!passId || !tenantId) return [];

      if (isPublic) {
        // Public passes embed photos in public_gate_pass_items via photo_storage_path
        const { data: publicItems, error: pubError } = await supabase
          .from("public_gate_pass_items")
          .select("id, gate_pass_id, photo_storage_path, item_name, created_at")
          .eq("gate_pass_id", passId)
          .not("photo_storage_path", "is", null)
          .is("deleted_at", null);

        if (pubError) throw pubError;

        const photosWithUrls: GatePassPhoto[] = [];
        await Promise.all(
          (publicItems || []).map(async (item) => {
            if (!item.photo_storage_path) return;
            const { data: signedData } = await supabase.storage
              .from("public-gate-pass-photos")
              .createSignedUrl(item.photo_storage_path, 3600);

            if (signedData?.signedUrl) {
              photosWithUrls.push({
                id: item.id,
                gate_pass_id: item.gate_pass_id,
                item_id: item.id, // link photo to item
                storage_path: item.photo_storage_path,
                file_name: item.item_name || "photo",
                file_size: null,
                mime_type: null,
                uploaded_by: null,
                created_at: item.created_at,
                signedUrl: signedData.signedUrl,
              });
            }
          })
        );
        return photosWithUrls;
      }

      // 1. Fetch from gate_pass_item_photos (item-level photos)
      const { data: itemPhotos, error: itemError } = await supabase
        .from("gate_pass_item_photos")
        .select("id, gate_pass_id, item_id, storage_path, file_name, file_size, mime_type, uploaded_by, created_at")
        .eq("gate_pass_id", passId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (itemError) throw itemError;

      // 2. Fetch from gate_pass_photos (legacy/general photos)
      const { data: generalPhotos, error: generalError } = await supabase
        .from("gate_pass_photos")
        .select("id, gate_pass_id, storage_path, file_name, file_size, mime_type, uploaded_by, created_at")
        .eq("gate_pass_id", passId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (generalError) throw generalError;

      const allPhotos: GatePassPhoto[] = [
        ...(itemPhotos || []),
        ...(generalPhotos || []).map(p => ({ ...p, item_id: null }))
      ];

      const bucketName = "gate-pass-photos";
      const photosWithUrls: GatePassPhoto[] = [];
      await Promise.all(
        allPhotos.map(async (photo) => {
          const { data: signedData } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(photo.storage_path, 3600);

          if (signedData?.signedUrl) {
            photosWithUrls.push({
              ...photo,
              signedUrl: signedData.signedUrl,
            });
          }
        })
      );

      return photosWithUrls;
    },
    enabled: !!passId && !!tenantId,
  });
}
