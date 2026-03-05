import { supabase } from '../supabaseClient';
import type { GatePassDetailData, GatePassItem, GatePassPhoto, GatePassApproverProfile } from '@/features/contractors/hooks/use-gate-pass-details';

export const getGatePassDetails = async (passId: string, tenantId: string): Promise<GatePassDetailData | null> => {
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

    const passDataExt = passData as typeof passData & {
        club_mgmt_ack_by?: string | null;
        club_mgmt_ack_at?: string | null;
        club_mgmt_ack_notes?: string | null;
    };

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

    let profiles: GatePassApproverProfile[] = [];
    if (profileIds.length > 0) {
        const { data } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", profileIds);
        profiles = data || [];
    }

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const requesterProfile = passDataExt.is_public_request
        ? {
            id: 'public',
            full_name: passDataExt.public_requester_name || 'Public User',
            avatar_url: null,
            email: passDataExt.public_requester_email,
            phone: passDataExt.public_requester_phone
        } as unknown as GatePassApproverProfile
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
};

export const getGatePassItems = async (passId: string, tenantId: string, isPublic: boolean = false): Promise<GatePassItem[]> => {
    if (isPublic) {
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
};

export const getGatePassPhotos = async (passId: string, tenantId: string, isPublic: boolean = false): Promise<GatePassPhoto[]> => {
    if (isPublic) {
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
                        item_id: item.id,
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

    const { data: itemPhotos, error: itemError } = await supabase
        .from("gate_pass_item_photos")
        .select("id, gate_pass_id, item_id, storage_path, file_name, file_size, mime_type, uploaded_by, created_at")
        .eq("gate_pass_id", passId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

    if (itemError) throw itemError;

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
};
