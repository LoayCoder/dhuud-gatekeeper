import { supabase } from '../supabaseClient';

export const approveGatePass = async (passId: string, action: "approve" | "reject", notes: string | undefined, userId: string): Promise<{ passId: string; newStatus: string }> => {
    const { data: gatePass } = await supabase
        .from("material_gate_passes")
        .select(`
      id, is_public_request, public_requester_name, public_requester_phone,
      public_requester_email, public_requester_company, material_description,
      pass_date, reference_number, public_access_token, tenant_id, branch_id,
      requested_by,
      tenants(slug)
    `)
        .eq("id", passId)
        .single();

    const { data, error } = await supabase.rpc("approve_gate_pass_unified", {
        p_user_id: userId,
        p_gate_pass_id: passId,
        p_action: action,
        p_notes: notes || null,
    });

    if (error) throw error;
    const newStatus = data as string;

    // Audit log: gate pass approved/rejected (with fallback direct insert)
    const auditAction = action === 'approve' ? 'approved' : 'rejected';
    const auditBody = {
        entity_type: 'gate_pass',
        entity_id: passId,
        action: auditAction,
        tenant_id: gatePass?.tenant_id,
        new_value: { status: newStatus, notes },
    };
    supabase.functions.invoke('contractor-audit-log', { body: auditBody })
        .then(res => {
            if (res.error && gatePass?.tenant_id) {
                supabase.from('contractor_module_audit_logs').insert({
                    tenant_id: gatePass.tenant_id,
                    entity_type: 'gate_pass',
                    entity_id: passId,
                    action: auditAction,
                    actor_id: userId,
                    actor_type: 'admin',
                    new_value: auditBody.new_value,
                }).then(({ error }) => { if (error) console.error('[GatePass] Audit fallback failed:', error); });
            }
        })
        .catch(err => {
            console.warn('[GatePass] Audit edge fn error, using fallback:', err);
            if (gatePass?.tenant_id) {
                supabase.from('contractor_module_audit_logs').insert({
                    tenant_id: gatePass.tenant_id,
                    entity_type: 'gate_pass',
                    entity_id: passId,
                    action: auditAction,
                    actor_id: userId,
                    actor_type: 'admin',
                    new_value: auditBody.new_value,
                }).then(({ error }) => { if (error) console.error('[GatePass] Audit fallback failed:', error); });
            }
        });

    // Trigger in-app notification for internal gate pass approvals
    if (!gatePass?.is_public_request && newStatus === "approved" && gatePass?.requested_by) {
        try {
            await supabase.from("hsse_notifications").insert([{
                tenant_id: gatePass.tenant_id,
                branch_id: gatePass.branch_id,
                title_en: `Gate Pass ${gatePass.reference_number} Approved`,
                title_ar: `تم اعتماد تصريح البوابة ${gatePass.reference_number}`,
                body_en: `Your gate pass request ${gatePass.reference_number} has been approved.`,
                body_ar: `تمت الموافقة على طلب تصريح البوابة ${gatePass.reference_number}.`,
                notification_type: 'informational',
                target_audience: 'all_users',
                priority: 'low',
                is_active: true,
                send_push_notification: true,
                created_by: userId,
            }]);
        } catch (notifyErr) {
            console.error("[Gate Pass] Failed to send internal approval notification:", notifyErr);
        }
    }

    // Send WhatsApp notification to the requester on approval/rejection
    if (!gatePass?.is_public_request && gatePass?.requested_by && (newStatus === "approved" || newStatus === "rejected")) {
        try {
            // Fetch requester's phone number
            const { data: requesterProfile } = await supabase
                .from("profiles")
                .select("phone_number, preferred_language, full_name")
                .eq("id", gatePass.requested_by)
                .single();

            if (requesterProfile?.phone_number) {
                const lang = requesterProfile.preferred_language || 'en';
                const isApproved = newStatus === "approved";
                const statusText = isApproved
                    ? (lang === 'ar' ? 'تمت الموافقة ✅' : 'Approved ✅')
                    : (lang === 'ar' ? 'مرفوض ❌' : 'Rejected ❌');
                const message = lang === 'ar'
                    ? `🚛 تصريح بوابة ${gatePass.reference_number}\n\nالحالة: ${statusText}\nالوصف: ${gatePass.material_description || '-'}\n${notes ? `ملاحظات: ${notes}` : ''}`
                    : `🚛 Gate Pass ${gatePass.reference_number}\n\nStatus: ${statusText}\nDescription: ${gatePass.material_description || '-'}\n${notes ? `Notes: ${notes}` : ''}`;

                await supabase.functions.invoke("send-gate-whatsapp", {
                    body: {
                        mobile_number: requesterProfile.phone_number,
                        notification_type: 'gate_pass_status',
                        message,
                        tenant_id: gatePass.tenant_id,
                        gate_pass_id: gatePass.id,
                        reference_number: gatePass.reference_number,
                    },
                });
            }
        } catch (whatsappErr) {
            console.error("[Gate Pass] Failed to send WhatsApp approval/rejection notification:", whatsappErr);
        }
    }

    if (gatePass?.is_public_request && (newStatus === "approved" || newStatus === "rejected" || newStatus === "pending_security_approval")) {
        const tenantSlug = (gatePass.tenants as { slug: string } | null)?.slug || "";
        const eventType = newStatus === "approved" ? "approved" : newStatus === "rejected" ? "rejected" : "acknowledged";

        try {
            await supabase.functions.invoke("notify-public-gate-pass", {
                body: {
                    gate_pass_id: gatePass.id,
                    tenant_id: gatePass.tenant_id,
                    branch_id: gatePass.branch_id,
                    reference_number: gatePass.reference_number,
                    requester_name: gatePass.public_requester_name,
                    requester_phone: gatePass.public_requester_phone,
                    requester_email: gatePass.public_requester_email,
                    requester_company: gatePass.public_requester_company,
                    material_description: gatePass.material_description,
                    pass_date: gatePass.pass_date,
                    tracking_url: `/${tenantSlug}/track/${gatePass.public_access_token}`,
                    public_access_token: gatePass.public_access_token,
                    event_type: eventType,
                    rejection_reason: action === "reject" ? notes : null,
                },
            });
        } catch (notifyError) {
            console.error("[Gate Pass] Failed to send notification:", notifyError);
        }
    }

    return { passId, newStatus };
};

export const rejectGatePass = async (passId: string, reason: string, userId: string): Promise<{ passId: string; newStatus: string }> => {
    const { data, error } = await supabase.rpc("approve_gate_pass_unified", {
        p_user_id: userId,
        p_gate_pass_id: passId,
        p_action: "reject",
        p_notes: reason,
    });

    if (error) throw error;
    return { passId, newStatus: data };
};

export const verifyGatePass = async (passId: string, action: "entry" | "exit", tenantId: string, userId: string): Promise<{ passId: string; action: string }> => {
    const { data: pass, error: fetchError } = await supabase
        .from("material_gate_passes")
        .select("id, vehicle_plate, driver_name, driver_mobile, material_description, reference_number, status")
        .eq("id", passId)
        .single();

    if (fetchError || !pass) throw new Error("Gate pass not found");

    if (action === "entry" && pass.status !== "approved") {
        throw new Error(`Cannot record entry: pass status is ${pass.status}, expected 'approved'`);
    }
    if (action === "exit" && pass.status !== "used") {
        throw new Error(`Cannot record exit: pass status is ${pass.status}, expected 'used'`);
    }

    const now = new Date().toISOString();

    if (action === "entry") {
        const { error } = await supabase
            .from("gate_entry_logs")
            .insert({
                tenant_id: tenantId,
                guard_id: userId,
                entry_type: "vehicle",
                person_name: pass.driver_name || "Driver",
                mobile_number: pass.driver_mobile,
                car_plate: pass.vehicle_plate,
                purpose: pass.material_description
                    ? `Material: ${pass.material_description.substring(0, 50)}${pass.material_description.length > 50 ? '...' : ''}`
                    : "Material Transport",
                notes: `Gate Pass: ${pass.reference_number}`,
                entry_time: now,
                access_type: "entry",
                validation_status: "valid",
                material_gate_pass_id: passId,
            });

        if (error) throw error;
    } else {
        let openLog: { id: string } | null = null;
        const { data: fkLogs } = await supabase
            .from("gate_entry_logs")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("material_gate_pass_id", passId)
            .is("exit_time", null)
            .order("entry_time", { ascending: false })
            .limit(1);

        openLog = fkLogs?.[0] || null;

        if (!openLog && pass.vehicle_plate) {
            const { data: plateLogs } = await supabase
                .from("gate_entry_logs")
                .select("id")
                .eq("tenant_id", tenantId)
                .eq("car_plate", pass.vehicle_plate)
                .eq("entry_type", "vehicle")
                .is("exit_time", null)
                .order("entry_time", { ascending: false })
                .limit(1);

            openLog = plateLogs?.[0] || null;
        }

        if (openLog) {
            const { error } = await supabase
                .from("gate_entry_logs")
                .update({ exit_time: now })
                .eq("id", openLog.id);

            if (error) throw error;
        } else {
            const { error } = await supabase
                .from("material_gate_passes")
                .update({
                    exit_time: now,
                    guard_verified_by: userId,
                    guard_verified_at: now,
                    status: "completed",
                })
                .eq("id", passId);

            if (error) throw error;
        }
    }

    return { passId, action };
};

export interface BulkResult {
    success: number;
    failed: number;
    errors: { passId: string; error: string }[];
}

export const bulkApproveGatePasses = async (passIds: string[], notes: string | undefined, userId: string): Promise<BulkResult> => {
    const results: BulkResult = { success: 0, failed: 0, errors: [] };

    for (const passId of passIds) {
        try {
            const { data, error } = await supabase.rpc("approve_gate_pass_unified", {
                p_user_id: userId,
                p_gate_pass_id: passId,
                p_action: "approve",
                p_notes: notes || null,
            });

            if (error) {
                results.failed++;
                results.errors.push({ passId, error: error.message });
                continue;
            }

            if (typeof data === "string") {
                results.success++;
            } else {
                results.failed++;
                results.errors.push({ passId, error: "Unexpected response format" });
            }
        } catch (error) {
            results.failed++;
            results.errors.push({ passId, error: error instanceof Error ? error.message : "Unknown error" });
        }
    }

    return results;
};

export const bulkRejectGatePasses = async (passIds: string[], reason: string, userId: string): Promise<BulkResult> => {
    const results: BulkResult = { success: 0, failed: 0, errors: [] };

    for (const passId of passIds) {
        try {
            const { data, error } = await supabase.rpc("approve_gate_pass_unified", {
                p_user_id: userId,
                p_gate_pass_id: passId,
                p_action: "reject",
                p_notes: reason,
            });

            if (error) {
                results.failed++;
                results.errors.push({ passId, error: error.message });
            } else {
                results.success++;
            }
        } catch (error) {
            results.failed++;
            results.errors.push({ passId, error: error instanceof Error ? error.message : "Unknown error" });
        }
    }

    return results;
};
