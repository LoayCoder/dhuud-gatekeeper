import { supabase } from '../supabaseClient';

function formatPassData(pass: any) {
    return {
        id: pass.id,
        reference_number: pass.reference_number,
        pass_type: pass.pass_type,
        material_description: pass.material_description,
        quantity: pass.quantity,
        vehicle_plate: pass.vehicle_plate,
        driver_name: pass.driver_name,
    return {
        id: pass.id,
        reference_number: pass.reference_number,
        pass_type: pass.pass_type,
        material_description: pass.material_description,
        quantity: typeof pass.quantity === 'string' ? Number(pass.quantity) : pass.quantity,
        vehicle_plate: pass.vehicle_plate,
        driver_name: pass.driver_name,
        driver_mobile: pass.driver_mobile,
        pass_date: pass.pass_date,
        start_date: pass.start_date || pass.pass_date,
        end_date: pass.end_date || pass.pass_date,
        time_window_start: pass.time_window_start,
        time_window_end: pass.time_window_end,
        status: pass.status,
        entry_time: pass.entry_time,
        exit_time: pass.exit_time,
        project_name: pass.project?.project_name || '',
        company_name: pass.project?.company?.company_name || '',
    };
}

export const verifyPassByReference = async (referenceNumber: string, tenantId: string) => {
    const normalizedRef = referenceNumber.trim().toUpperCase();
    const today = new Date().toISOString().split('T')[0];

    const { data: pass, error } = await supabase
        .from('material_gate_passes')
        .select(`
      id, reference_number, pass_type, pass_date, start_date, end_date,
      time_window_start, time_window_end,
      material_description, quantity, vehicle_plate, driver_name, driver_mobile,
      status, entry_time, exit_time,
      project:contractor_projects(project_name, company:contractor_companies(company_name))
    `)
        .eq('tenant_id', tenantId)
        .ilike('reference_number', normalizedRef)
        .is('deleted_at', null)
        .single();

    if (error || !pass) {
        return {
            is_valid: false,
            errors: ['Gate pass not found with this reference number'],
            warnings: [],
        };
    }

    if (pass.status !== 'approved' && pass.status !== 'used') {
        const statusMessages: Record<string, string> = {
            pending_contractor_approval: 'Gate pass pending contractor consultant approval',
            pending_club_mgmt_ack: 'Gate pass pending Golf Club Management acknowledgment',
            pending_dept_ack: 'Gate pass pending department acknowledgment',
            pending_dept_approval: 'Gate pass pending department approval',
            pending_security_approval: 'Gate pass pending security approval',
            pending_pm_approval: 'Gate pass pending PM approval',
            pending_safety_approval: 'Gate pass pending safety approval',
            rejected: 'Gate pass has been rejected',
            cancelled: 'Gate pass has been cancelled',
            completed: 'Gate pass already completed',
            expired: 'Gate pass has expired',
        };
        return {
            is_valid: false,
            errors: [statusMessages[pass.status] || 'Gate pass not yet fully approved'],
            warnings: [],
            pass: formatPassData(pass),
        };
    }

    const startDate = pass.start_date || pass.pass_date;
    const endDate = pass.end_date || pass.pass_date;

    if (today < startDate) {
        return {
            is_valid: false,
            errors: ['Gate pass is for a future date'],
            warnings: [],
            pass: formatPassData(pass),
        };
    }

    if (today > endDate) {
        return {
            is_valid: false,
            errors: ['Gate pass has expired'],
            warnings: [],
            pass: formatPassData(pass),
        };
    }

    const warnings: string[] = [];
    if (pass.time_window_start && pass.time_window_end) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (currentTime < pass.time_window_start || currentTime > pass.time_window_end) {
            return {
                is_valid: false,
                errors: [`Gate pass valid only between ${pass.time_window_start} - ${pass.time_window_end}`],
                warnings: [],
                pass: formatPassData(pass),
            };
        }
    }

    const passType = pass.pass_type as string;
    let allowedAction: 'entry' | 'exit' | 'both' = 'both';

    if (passType === 'in') {
        allowedAction = 'entry';
    } else if (passType === 'out') {
        allowedAction = 'exit';
    }

    if (passType === 'in' && pass.entry_time) {
        return {
            is_valid: false,
            errors: ['Entry has already been recorded for this entry-only pass'],
            warnings: [],
            pass: formatPassData(pass),
        };
    }

    if (passType === 'out' && pass.exit_time) {
        return {
            is_valid: false,
            errors: ['Exit has already been recorded for this exit-only pass'],
            warnings: [],
            pass: formatPassData(pass),
        };
    }

    if (pass.entry_time && pass.exit_time) {
        return {
            is_valid: false,
            errors: ['Gate pass already completed'],
            warnings: [],
            pass: formatPassData(pass),
        };
    }

    if (allowedAction === 'entry') {
        warnings.push('Entry-only pass — exit is not permitted');
    } else if (allowedAction === 'exit') {
        warnings.push('Exit-only pass — entry is not permitted');
    }

    return {
        is_valid: true,
        errors: [],
        warnings,
        pass: formatPassData(pass),
        allowed_action: allowedAction,
    };
};
