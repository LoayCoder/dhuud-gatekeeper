import { supabase } from '../supabaseClient';
import { compressImage } from "@/lib/upload-utils";
import { toast } from "sonner";
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

    // Fetch tenant short_name for reference prefix
    const { data: tenantData } = await supabase
        .from("tenants")
        .select("short_name")
        .eq("id", tenantId)
        .single();
    const prefix = tenantData?.short_name || 'GP';

    const year = new Date().getFullYear();
    const { data: seqResult, error: seqError } = await supabase.rpc("next_gate_pass_ref" as never, { p_tenant_id: tenantId, p_counter_type: 'internal' } as never);
    const sequence = seqError ? Date.now() % 100000 : Number(seqResult);
    const reference_number = `${prefix}-${year}-${String(sequence).padStart(5, "0")}`;

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
            vehicle_plate: data.vehicle_plate || (data.vehicle_plate_letters || data.vehicle_plate_numbers ? `${data.vehicle_plate_letters || ''} ${data.vehicle_plate_numbers || ''}`.trim() : null),
            vehicle_plate_letters: data.vehicle_plate_letters || null,
            vehicle_plate_numbers: data.vehicle_plate_numbers || null,
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
            submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) throw error;

    if (data.items.length > 0) {
        // Insert items one-by-one to guarantee order mapping for photo uploads
        const insertedItemIds: string[] = [];
        for (const item of data.items) {
            const { data: inserted, error: itemError } = await supabase
                .from("gate_pass_items")
                .insert({
                    gate_pass_id: result.id,
                    item_name: item.item_name,
                    description: item.description || null,
                    quantity: item.quantity || null,
                    unit: item.unit || null,
                    tenant_id: tenantId,
                })
                .select("id")
                .single();

            if (itemError) {
                console.error("Item insert error:", itemError);
                insertedItemIds.push('');
            } else {
                insertedItemIds.push(inserted.id);
            }
        }

        // Upload photos for each item using the guaranteed-order IDs
        for (let i = 0; i < data.items.length; i++) {
            const item = data.items[i];
            const insertedItemId = insertedItemIds[i];

            if (!insertedItemId || !item.photos || item.photos.length === 0) continue;

            const photoRecords = [];
            for (const photo of item.photos) {
                const compressedPhoto = await compressImage(photo, 1280, 0.75);
                const fileName = `${tenantId}/${result.id}/${insertedItemId}/${crypto.randomUUID()}-${photo.name}`;

                const { error: uploadError } = await supabase.storage
                    .from("gate-pass-photos")
                    .upload(fileName, compressedPhoto);

                if (uploadError) {
                    console.error("Item photo upload error:", uploadError);
                    toast.error(`Failed to upload photo for item "${item.item_name}": ${uploadError.message}`);
                    continue;
                }

                photoRecords.push({
                    item_id: insertedItemId,
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

    // Upload plate photos if provided
    if (data.plate_photos && data.plate_photos.length > 0) {
        for (const photo of data.plate_photos) {
            const compressedPhoto = await compressImage(photo, 1280, 0.75);
            const fileName = `${tenantId}/${result.id}/plate/${crypto.randomUUID()}-${photo.name}`;
            const { error: uploadError } = await supabase.storage
                .from("gate-pass-photos")
                .upload(fileName, compressedPhoto);

            if (uploadError) {
                console.error("Plate photo upload error:", uploadError);
            } else {
                await supabase
                    .from("gate_pass_photos")
                    .insert({
                        gate_pass_id: result.id,
                        storage_path: fileName,
                        file_name: photo.name,
                        file_size: compressedPhoto.size,
                        mime_type: compressedPhoto.type,
                        uploaded_by: userId,
                        tenant_id: tenantId,
                    });
            }
        }
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

    if (tenantId) {
        supabase.functions.invoke('notify-dept-rep-gate-pass', {
            body: {
                gate_pass_id: result.id,
                project_id: result.project_id || null,
                tenant_id: tenantId,
                branch_id: result.branch_id || null,
                reference_number: result.reference_number,
                material_description: result.material_description,
                requester_name: requesterName,
                pass_date: result.pass_date,
                event_type: 'gate_pass_created',
            },
        }).catch(err => console.error('Failed to notify dept reps:', err));
    }

    // Audit log: gate pass created (with fallback direct insert)
    const auditPayload = {
        entity_type: 'gate_pass',
        entity_id: result.id,
        action: 'created',
        tenant_id: tenantId,
        new_value: {
            reference_number,
            pass_type: data.pass_type,
            project_id: data.project_id,
            is_internal_request: data.is_internal_request,
            items_count: data.items.length,
        },
    };
    supabase.functions.invoke('contractor-audit-log', { body: auditPayload })
        .then(res => {
            if (res.error) {
                console.warn('[GatePass] Audit edge fn failed, using fallback:', res.error);
                supabase.from('contractor_module_audit_logs').insert({
                    tenant_id: tenantId,
                    entity_type: 'gate_pass',
                    entity_id: auditPayload.entity_id,
                    action: 'created',
                    actor_id: userId,
                    actor_type: 'admin',
                    new_value: auditPayload.new_value,
                }).then(({ error }) => { if (error) console.error('[GatePass] Audit fallback failed:', error); });
            }
        })
        .catch(err => {
            console.warn('[GatePass] Audit edge fn error, using fallback:', err);
            supabase.from('contractor_module_audit_logs').insert({
                tenant_id: tenantId,
                entity_type: 'gate_pass',
                entity_id: auditPayload.entity_id,
                action: 'created',
                actor_id: userId,
                actor_type: 'admin',
                new_value: auditPayload.new_value,
            }).then(({ error }) => { if (error) console.error('[GatePass] Audit fallback failed:', error); });
        });

    return result;
};
