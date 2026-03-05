import { supabase } from '../supabaseClient';
import { compressImage } from "@/lib/upload-utils";
import type { CreateGatePassData } from '@/features/contractors/hooks/use-material-gate-passes';

export const createGatePass = async (data: CreateGatePassData, tenantId: string, userId: string, requesterName: string): Promise<unknown> => {
    const { data: permissionCheck, error: permError } = await supabase.rpc("can_create_gate_pass", {
        p_user_id: userId,
        p_is_internal_request: data.is_internal_request || false,
        p_company_id: data.company_id || null,
    });

    if (permError) throw permError;

    const permission = permissionCheck as { allowed: boolean; reason?: string };
    if (!permission.allowed) {
        throw new Error(permission.reason || "You do not have permission to create this gate pass");
    }

    const year = new Date().getFullYear();
    const { data: seqResult, error: seqError } = await supabase.rpc("nextval_gate_pass_ref" as never, {} as never);
    const sequence = seqError ? Date.now() % 100000 : Number(seqResult);
    const reference_number = `GP-${year}-${String(sequence).padStart(5, "0")}`;

    const materialDescription = data.items
        .map((item) => {
            let desc = item.item_name;
            if (item.quantity) desc += ` (${item.quantity}${item.unit ? " " + item.unit : ""})`;
            if (item.description) desc += ` - ${item.description}`;
            return desc;
        })
        .join("; ");

    const { data: result, error } = await supabase
        .from("material_gate_passes")
        .insert({
            project_id: data.project_id || null,
            company_id: data.company_id || null,
            pass_type: data.pass_type,
            pm_approved_by: data.pm_approved_by || null,
            approval_from_id: data.approval_from_id || null,
            is_internal_request: data.is_internal_request || false,
            material_description: materialDescription,
            quantity: data.items.length > 1 ? `${data.items.length} items` : data.items[0]?.quantity || null,
            vehicle_plate: data.vehicle_plate || null,
            driver_name: data.driver_name || null,
            driver_mobile: data.driver_mobile || null,
            start_date: data.start_date || data.pass_date || null,
            end_date: data.end_date || data.pass_date || null,
            pass_date: data.pass_date || data.start_date,
            time_window_start: data.time_window_start || null,
            time_window_end: data.time_window_end || null,
            tenant_id: tenantId,
            requested_by: userId,
            reference_number,
            status: data.is_internal_request ? "pending_dept_approval" : "pending_contractor_approval",
        })
        .select()
        .single();

    if (error) throw error;

    if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item) => ({
            gate_pass_id: result.id,
            item_name: item.item_name,
            description: item.description || null,
            quantity: item.quantity || null,
            unit: item.unit || null,
            tenant_id: tenantId,
        }));

        const { data: insertedItems, error: itemsError } = await supabase
            .from("gate_pass_items")
            .insert(itemsToInsert)
            .select("id");

        if (itemsError) {
            console.error("Items insert error:", itemsError);
        } else if (insertedItems) {
            for (let i = 0; i < data.items.length; i++) {
                const item = data.items[i];
                const insertedItem = insertedItems[i];

                if (item.photos && item.photos.length > 0 && insertedItem) {
                    const photoRecords = [];

                    for (const photo of item.photos) {
                        const compressedPhoto = await compressImage(photo, 1280, 0.75);
                        const fileName = `${tenantId}/${result.id}/${insertedItem.id}/${crypto.randomUUID()}-${photo.name}`;

                        const { error: uploadError } = await supabase.storage
                            .from("gate-pass-photos")
                            .upload(fileName, compressedPhoto);

                        if (uploadError) {
                            console.error("Item photo upload error:", uploadError);
                            continue;
                        }

                        photoRecords.push({
                            item_id: insertedItem.id,
                            gate_pass_id: result.id,
                            storage_path: fileName,
                            file_name: photo.name,
                            file_size: compressedPhoto.size,
                            mime_type: compressedPhoto.type,
                            uploaded_by: userId,
                            tenant_id: tenantId,
                        });
                    }

                    if (photoRecords.length > 0) {
                        const { error: photosError } = await supabase
                            .from("gate_pass_item_photos")
                            .insert(photoRecords);

                        if (photosError) console.error("Item photos insert error:", photosError);
                    }
                }
            }
        }
    }

    if (data.photos.length > 0) {
        const photoRecords = [];

        for (const photo of data.photos) {
            const compressedPhoto = await compressImage(photo, 1280, 0.75);
            const fileName = `${result.id}/${crypto.randomUUID()}-${photo.name}`;
            const { error: uploadError } = await supabase.storage
                .from("gate-pass-photos")
                .upload(fileName, compressedPhoto);

            if (uploadError) {
                console.error("Photo upload error:", uploadError);
                continue;
            }

            photoRecords.push({
                gate_pass_id: result.id,
                storage_path: fileName,
                file_name: photo.name,
                file_size: compressedPhoto.size,
                mime_type: compressedPhoto.type,
                uploaded_by: userId,
                tenant_id: tenantId,
            });
        }

        if (photoRecords.length > 0) {
            const { error: photosError } = await supabase
                .from("gate_pass_photos")
                .insert(photoRecords);

            if (photosError) console.error("Photos insert error:", photosError);
        }
    }

    if (result?.project_id && tenantId) {
        supabase.functions.invoke('notify-dept-rep-gate-pass', {
            body: {
                gate_pass_id: result.id,
                project_id: result.project_id,
                tenant_id: tenantId,
                reference_number: result.reference_number,
                material_description: result.material_description,
                requester_name: requesterName,
                pass_date: result.pass_date,
                event_type: 'gate_pass_created',
            },
        }).catch(err => console.error('Failed to notify dept reps:', err));
    }

    return result;
};
