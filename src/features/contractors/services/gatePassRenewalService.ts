import { supabase } from '../supabaseClient';

export interface RenewGatePassResult {
    success: boolean;
    new_status?: string;
    renewal_expires_at?: string;
    renewal_count?: number;
    error?: string;
}

export interface ResubmitGatePassResult {
    success: boolean;
    new_status?: string;
    start_date?: string;
    end_date?: string;
    error?: string;
}

export const renewGatePass = async (gatePassId: string, userId: string): Promise<RenewGatePassResult> => {
    const { data, error } = await (supabase.rpc as unknown as (method: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)('renew_expired_gate_pass', {
        p_gate_pass_id: gatePassId,
        p_user_id: userId,
    });

    if (error) {
        throw new Error(error.message);
    }

    const result = data as unknown as RenewGatePassResult;
    if (!result.success) {
        throw new Error(result.error || "Failed to renew gate pass");
    }

    return result;
};

export const resubmitGatePass = async (
    gatePassId: string,
    userId: string,
    startDate: string,
    endDate: string,
    timeWindowStart?: string,
    timeWindowEnd?: string
): Promise<ResubmitGatePassResult> => {
    const { data, error } = await (supabase.rpc as unknown as (method: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)('resubmit_gate_pass', {
        p_gate_pass_id: gatePassId,
        p_user_id: userId,
        p_new_start_date: startDate,
        p_new_end_date: endDate,
        p_new_time_window_start: timeWindowStart || null,
        p_new_time_window_end: timeWindowEnd || null,
    });

    if (error) {
        throw new Error(error.message);
    }

    const result = data as unknown as ResubmitGatePassResult;
    if (!result.success) {
        throw new Error(result.error || "Failed to resubmit gate pass");
    }

    return result;
};
