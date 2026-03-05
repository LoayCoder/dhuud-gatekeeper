import { supabase } from '../supabaseClient';

export const approveGatePass = async (passId: string, action: "approve" | "reject", notes: string | undefined, userId: string): Promise<{ passId: string; newStatus: string }> => {
    const { data: gatePass } = await supabase
        .from("material_gate_passes")
        .select(`
      id, is_public_request, public_requester_name, public_requester_phone,
      public_requester_email, public_requester_company, material_description,
      pass_date, reference_number, public_access_token, tenant_id, branch_id,
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
