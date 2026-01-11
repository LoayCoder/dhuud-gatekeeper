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
}

export interface GatePassPhoto {
  id: string;
  gate_pass_id: string;
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
  time_window_start: string | null;
  time_window_end: string | null;
  status: string;
  requested_by: string;
  pm_approved_by: string | null;
  pm_approved_at: string | null;
  pm_notes: string | null;
  safety_approved_by: string | null;
  safety_approved_at: string | null;
  safety_notes: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  guard_verified_by: string | null;
  guard_verified_at: string | null;
  entry_time: string | null;
  exit_time: string | null;
  created_at: string;
  is_internal_request: boolean;
  approval_from_id: string | null;
  qr_code_token: string | null;
  project?: { project_name: string; company?: { company_name: string } } | null;
  company?: { company_name: string } | null;
  requester?: GatePassApproverProfile | null;
  pm_approver?: GatePassApproverProfile | null;
  safety_approver?: GatePassApproverProfile | null;
  rejector?: GatePassApproverProfile | null;
  guard?: GatePassApproverProfile | null;
  approval_from?: GatePassApproverProfile | null;
}

export function useGatePassDetails(passId: string | null) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["gate-pass-details", passId],
    queryFn: async () => {
      if (!passId || !tenantId) return null;

      const { data, error } = await supabase
        .from("material_gate_passes")
        .select(`
          id, reference_number, project_id, company_id, pass_type, material_description,
          quantity, vehicle_plate, driver_name, driver_mobile, pass_date,
          time_window_start, time_window_end, status, requested_by,
          pm_approved_by, pm_approved_at, pm_notes,
          safety_approved_by, safety_approved_at, safety_notes,
          rejected_by, rejected_at, rejection_reason,
          guard_verified_by, guard_verified_at, entry_time, exit_time, created_at,
          is_internal_request, approval_from_id, qr_code_token,
          project:contractor_projects(project_name, company:contractor_companies(company_name)),
          company:contractor_companies(company_name),
          requester:profiles!requested_by(id, full_name, avatar_url),
          pm_approver:profiles!pm_approved_by(id, full_name, avatar_url),
          safety_approver:profiles!safety_approved_by(id, full_name, avatar_url),
          rejector:profiles!rejected_by(id, full_name, avatar_url),
          guard:profiles!guard_verified_by(id, full_name, avatar_url),
          approval_from:profiles!material_gate_passes_approval_from_id_fkey(id, full_name, avatar_url)
        `)
        .eq("id", passId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

      if (error) throw error;
      return data as GatePassDetailData;
    },
    enabled: !!passId && !!tenantId,
  });
}

export function useGatePassItems(passId: string | null) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["gate-pass-items", passId],
    queryFn: async () => {
      if (!passId || !tenantId) return [];

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

export function useGatePassPhotos(passId: string | null) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["gate-pass-photos", passId],
    queryFn: async () => {
      if (!passId || !tenantId) return [];

      const { data, error } = await supabase
        .from("gate_pass_photos")
        .select("id, gate_pass_id, storage_path, file_name, file_size, mime_type, uploaded_by, created_at")
        .eq("gate_pass_id", passId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Generate signed URLs for each photo
      const photosWithUrls: GatePassPhoto[] = [];
      for (const photo of data || []) {
        const { data: signedData } = await supabase.storage
          .from("gate-pass-photos")
          .createSignedUrl(photo.storage_path, 3600); // 1 hour expiry

        photosWithUrls.push({
          ...photo,
          signedUrl: signedData?.signedUrl,
        });
      }

      return photosWithUrls;
    },
    enabled: !!passId && !!tenantId,
  });
}
