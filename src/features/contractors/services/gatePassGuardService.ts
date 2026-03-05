import { supabase } from '../supabaseClient';

export interface GuardGateActionResult {
    success: boolean;
    action: 'entry' | 'exit';
    timestamp: string;
    passReference: string;
    denialReason?: string;
}

export interface GateActionAuditData {
    action: 'gate_pass_entry' | 'gate_pass_exit' | 'gate_pass_denied';
    passId: string;
    passReference: string;
    result: 'success' | 'denied';
    reason?: string;
    validationMethod: 'qr_scan' | 'manual_entry';
    metadata?: Record<string, unknown>;
}

export async function logGateAudit(
    data: GateActionAuditData,
    tenantId: string,
    userId: string,
    userName: string | null
): Promise<void> {
    try {
        await supabase.from('security_audit_logs').insert({
            tenant_id: tenantId,
            actor_id: userId,
            actor_name: userName,
            action: data.action,
            action_category: 'gate_control',
            entity_type: 'material_gate_pass',
            entity_id: data.passId,
            entity_identifier: data.passReference,
            result: data.result,
            result_reason: data.reason,
            metadata: {
                validation_method: data.validationMethod,
                ...data.metadata,
            },
        });
    } catch (error) {
        console.error('Failed to log gate audit:', error);
    }
}

export const processGuardGateAction = async (
    passId: string,
    passReference: string,
    action: 'entry' | 'exit',
    validationMethod: 'qr_scan' | 'manual_entry',
    tenantId: string,
    userId: string,
    userName: string | null,
    metadata?: Record<string, unknown>
): Promise<GuardGateActionResult> => {
    const now = new Date().toISOString();
    let error: Error | { message: string } | null = null;

    const { data: passData, error: fetchError } = await supabase
        .from('material_gate_passes')
        .select('vehicle_plate, driver_name, driver_mobile, material_description, pass_type, start_date, end_date')
        .eq('id', passId)
        .single();

    if (fetchError || !passData) {
        error = fetchError || new Error(`Gate pass with ID ${passId} not found.`);
    }

    if (!error && passData) {
        const pt = passData.pass_type as string;

        if (pt === 'in' && action === 'exit') {
            await logGateAudit({
                action: 'gate_pass_denied', passId, passReference,
                result: 'denied', reason: 'Exit not allowed on entry-only pass',
                validationMethod, metadata,
            }, tenantId, userId, userName);
            throw new Error('This is an Entry-only pass. Exit is not allowed.');
        }

        if (pt === 'out' && action === 'entry') {
            await logGateAudit({
                action: 'gate_pass_denied', passId, passReference,
                result: 'denied', reason: 'Entry not allowed on exit-only pass',
                validationMethod, metadata,
            }, tenantId, userId, userName);
            throw new Error('This is an Exit-only pass. Entry is not allowed.');
        }

        const today = new Date().toISOString().split('T')[0];
        const startDate = passData.start_date || today;
        const endDate = passData.end_date || startDate;

        if (today < startDate || today > endDate) {
            await logGateAudit({
                action: 'gate_pass_denied', passId, passReference,
                result: 'denied',
                reason: `Access attempt outside allowed date range (${startDate} to ${endDate})`,
                validationMethod, metadata,
            }, tenantId, userId, userName);
            throw new Error(`Gate pass is only valid from ${startDate} to ${endDate}`);
        }
    }

    if (!error && passData && action === 'entry') {
        const { error: insertError } = await supabase
            .from('gate_entry_logs')
            .insert({
                tenant_id: tenantId,
                guard_id: userId,
                entry_type: 'vehicle',
                person_name: passData.driver_name || 'Driver',
                mobile_number: passData.driver_mobile,
                car_plate: passData.vehicle_plate,
                purpose: passData.material_description
                    ? `Material: ${passData.material_description.length > 50
                        ? `${passData.material_description.substring(0, 50)}...`
                        : passData.material_description}`
                    : 'Material Transport',
                notes: `Gate Pass: ${passReference}`,
                entry_time: now,
                access_type: 'entry',
                validation_status: 'valid',
                material_gate_pass_id: passId,
            });

        error = insertError;
    } else if (!error && passData && action === 'exit') {
        const { data: validation, error: validationError } = await supabase.rpc('validate_gate_pass_exit', {
            p_gate_pass_id: passId,
            p_exit_vehicle_plate: (metadata as Record<string, unknown>)?.exit_vehicle_plate as string || passData.vehicle_plate,
            p_exit_driver_name: (metadata as Record<string, unknown>)?.exit_driver_name as string || passData.driver_name
        });

        if (validationError) {
            await logGateAudit({
                action: 'gate_pass_denied', passId, passReference,
                result: 'denied',
                reason: validationError.message || 'Exit validation failed',
                validationMethod, metadata,
            }, tenantId, userId, userName);
            throw new Error(validationError.message || 'Exit validation failed');
        }

        const validationResult = validation as {
            allowed: boolean; reason?: string;
            expected_vehicle?: string; provided_vehicle?: string;
            expected_driver?: string; provided_driver?: string;
            mismatch_type?: string;
        } | null;

        if (validationResult && !validationResult.allowed) {
            const reason = validationResult.reason || 'Exit validation failed';
            await logGateAudit({
                action: 'gate_pass_denied', passId, passReference,
                result: 'denied', reason,
                validationMethod,
                metadata: {
                    ...metadata,
                    expected_vehicle: validationResult.expected_vehicle,
                    provided_vehicle: validationResult.provided_vehicle,
                    expected_driver: validationResult.expected_driver,
                    provided_driver: validationResult.provided_driver,
                    mismatch_type: validationResult.mismatch_type,
                },
            }, tenantId, userId, userName);
            throw new Error(reason);
        }

        let openLog: { id: string } | null = null;

        const { data: fkLogs } = await supabase
            .from('gate_entry_logs')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('material_gate_pass_id', passId)
            .is('exit_time', null)
            .order('entry_time', { ascending: false })
            .limit(1);

        openLog = fkLogs?.[0] || null;

        if (!openLog && passData.vehicle_plate) {
            const { data: plateLogs } = await supabase
                .from('gate_entry_logs')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('car_plate', passData.vehicle_plate)
                .is('exit_time', null)
                .order('entry_time', { ascending: false })
                .limit(1);
            openLog = plateLogs?.[0] || null;
        }

        if (openLog) {
            const { error: updateError } = await supabase
                .from('gate_entry_logs')
                .update({ exit_time: now })
                .eq('id', openLog.id);
            error = updateError;
        } else {
            console.warn('No entry log found for pass exit. Updating pass directly.');
            const { error: passError } = await supabase
                .from('material_gate_passes')
                .update({
                    exit_time: now,
                    guard_verified_by: userId,
                    guard_verified_at: now,
                    status: 'completed'
                })
                .eq('id', passId);
            error = passError;
        }
    }

    if (error) {
        await logGateAudit({
            action: `gate_pass_${action}` as 'gate_pass_entry' | 'gate_pass_exit',
            passId, passReference,
            result: 'denied', reason: error.message,
            validationMethod, metadata,
        }, tenantId, userId, userName);
        throw error;
    }

    await logGateAudit({
        action: `gate_pass_${action}` as 'gate_pass_entry' | 'gate_pass_exit',
        passId, passReference,
        result: 'success',
        validationMethod, metadata,
    }, tenantId, userId, userName);

    return {
        success: true,
        action,
        timestamp: now,
        passReference,
    };
};
