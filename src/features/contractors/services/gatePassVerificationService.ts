import { supabase } from '../supabaseClient';

export interface GatePassVerificationResult {
    valid: boolean;
    message: string;
    gatePass?: {
        id: string;
        reference_number: string;
        pass_type: string;
        pass_date: string;
        start_date: string | null;
        end_date: string | null;
        time_window_start: string | null;
        time_window_end: string | null;
        material_description: string;
        quantity: string | null;
        vehicle_plate: string | null;
        driver_name: string | null;
        driver_mobile: string | null;
        status: string;
        entry_time: string | null;
        exit_time: string | null;
        project_name: string;
        company_name: string;
        is_public_request: boolean;
    };
}

export const verifyGatePassQR = async (qrToken: string, tenantId: string): Promise<GatePassVerificationResult> => {
    // Find gate pass by QR token
    const { data: gatePass, error } = await supabase
        .from("material_gate_passes")
        .select(`
      id, reference_number, pass_type, pass_date, start_date, end_date,
      time_window_start, time_window_end,
      material_description, quantity, vehicle_plate, driver_name, driver_mobile,
      status, entry_time, exit_time, qr_code_token, qr_generated_at, is_public_request,
      project:contractor_projects(project_name, company:contractor_companies(company_name))
    `)
        .eq("qr_code_token", qrToken)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

    if (error || !gatePass) {
        return { valid: false, message: "Invalid QR code - Gate pass not found" };
    }

    // Check if pass is approved
    if (gatePass.status !== "approved" && gatePass.status !== "used") {
        const statusMessages: Record<string, string> = {
            pending_contractor_approval: "Gate pass pending contractor consultant approval",
            pending_club_mgmt_ack: "Gate pass pending Golf Club Management acknowledgment",
            pending_dept_ack: "Gate pass pending department acknowledgment",
            pending_dept_approval: "Gate pass pending department approval",
            pending_security_approval: "Gate pass pending security approval",
            pending_pm_approval: "Gate pass pending PM approval",
            pending_safety_approval: "Gate pass pending safety approval",
            rejected: "Gate pass has been rejected",
            cancelled: "Gate pass has been cancelled",
            completed: "Gate pass already completed",
            expired: "Gate pass has expired",
        };
        return {
            valid: false,
            message: statusMessages[gatePass.status] || "Gate pass not yet fully approved"
        };
    }

    // Check if pass is valid for today
    const today = new Date().toISOString().split("T")[0];
    const startDate = gatePass.start_date || gatePass.pass_date;
    const endDate = gatePass.end_date || gatePass.pass_date;

    if (today < startDate) {
        return { valid: false, message: "Gate pass is for a future date" };
    }
    if (today > endDate) {
        return { valid: false, message: "Gate pass has expired" };
    }

    // Check time window if specified
    if (gatePass.time_window_start && gatePass.time_window_end) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

        if (currentTime < gatePass.time_window_start || currentTime > gatePass.time_window_end) {
            return {
                valid: false,
                message: `Gate pass valid only between ${gatePass.time_window_start} - ${gatePass.time_window_end}`
            };
        }
    }

    return {
        valid: true,
        message: "Gate pass verified successfully",
        gatePass: {
            id: gatePass.id,
            reference_number: gatePass.reference_number,
            pass_type: gatePass.pass_type,
            pass_date: gatePass.pass_date,
            start_date: gatePass.start_date || null,
            end_date: gatePass.end_date || null,
            time_window_start: gatePass.time_window_start,
            time_window_end: gatePass.time_window_end,
            material_description: gatePass.material_description,
            quantity: gatePass.quantity,
            vehicle_plate: gatePass.vehicle_plate,
            driver_name: gatePass.driver_name,
            driver_mobile: gatePass.driver_mobile,
            status: gatePass.status,
            entry_time: gatePass.entry_time,
            exit_time: gatePass.exit_time,
            project_name: gatePass.project?.project_name || "",
            company_name: gatePass.project?.company?.company_name || "",
            is_public_request: gatePass.is_public_request || false,
        },
    };
};

export const confirmGatePassEntry = async (gatePassId: string, tenantId: string, userId: string): Promise<void> => {
    const now = new Date().toISOString();

    // Fetch pass data for the entry log
    const { data: pass, error: fetchError } = await supabase
        .from("material_gate_passes")
        .select("vehicle_plate, driver_name, driver_mobile, material_description, reference_number, status")
        .eq("id", gatePassId)
        .single();

    if (fetchError || !pass) throw new Error("Gate pass not found");

    // Validate pass status
    if (pass.status !== "approved") {
        throw new Error(`Cannot record entry: pass status is '${pass.status}', expected 'approved'`);
    }

    // Create entry log with FK link
    const { error } = await supabase.from("gate_entry_logs").insert({
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
        material_gate_pass_id: gatePassId,
    });

    if (error) throw error;
};

export const confirmGatePassExit = async (gatePassId: string, tenantId: string, userId: string): Promise<void> => {
    const now = new Date().toISOString();

    // Fetch pass to validate status
    const { data: pass, error: passError } = await supabase
        .from("material_gate_passes")
        .select("vehicle_plate, status")
        .eq("id", gatePassId)
        .single();

    if (passError || !pass) throw new Error("Gate pass not found");

    // Validate pass status
    if (pass.status !== "used") {
        throw new Error(`Cannot record exit: pass status is '${pass.status}', expected 'used'`);
    }

    let logId: string | null = null;

    const { data: fkLogs } = await supabase
        .from("gate_entry_logs")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("material_gate_pass_id", gatePassId)
        .is("exit_time", null)
        .order("entry_time", { ascending: false })
        .limit(1);

    logId = fkLogs?.[0]?.id || null;

    // Fallback: Find by vehicle plate if no FK match
    if (!logId && pass.vehicle_plate) {
        const { data: plateLogs } = await supabase
            .from("gate_entry_logs")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("car_plate", pass.vehicle_plate)
            .eq("entry_type", "vehicle")
            .is("exit_time", null)
            .order("entry_time", { ascending: false })
            .limit(1);

        logId = plateLogs?.[0]?.id || null;
    }

    if (logId) {
        const { error } = await supabase
            .from("gate_entry_logs")
            .update({ exit_time: now })
            .eq("id", logId);

        if (error) throw error;
    } else {
        console.warn("No entry log found for pass exit. Updating pass directly.");
        const { error } = await supabase
            .from("material_gate_passes")
            .update({
                exit_time: now,
                guard_verified_by: userId,
                guard_verified_at: now,
                status: "completed",
            })
            .eq("id", gatePassId);

        if (error) throw error;
    }
};
