import { supabase } from '../supabaseClient';
import type { Json } from '@/integrations/supabase/types';
import type { Investigation, CorrectiveAction } from '@/features/investigation';

export const createInvestigation = async (incidentId: string, tenantId: string, userId: string) => {
    const { data, error } = await supabase
        .from('investigations')
        .insert({
            incident_id: incidentId,
            tenant_id: tenantId,
            investigator_id: userId,
            started_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) throw error;

    const { error: rcaError } = await supabase
        .from('incident_rca')
        .insert({
            incident_id: incidentId,
            tenant_id: tenantId,
        });

    if (rcaError) {
        console.warn('Failed to auto-create incident_rca:', rcaError);
    }

    await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: tenantId,
        actor_id: userId,
        action: 'investigation_started',
        new_value: { investigation_id: data.id },
    });

    return data;
};

export const unlockRCA = async (incidentId: string) => {
    const { data, error } = await supabase.rpc('unlock_rca', {
        p_incident_id: incidentId,
    });

    if (error) throw error;
    return data;
};

export const updateInvestigation = async (
    id: string,
    incidentId: string,
    tenantId: string,
    userId: string,
    updates: Partial<Omit<Investigation, 'id' | 'tenant_id' | 'created_at'>>
) => {
    const dbUpdates: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
    };

    if (updates.five_whys !== undefined) {
        dbUpdates.five_whys = updates.five_whys as unknown as Json;
    }
    if (updates.root_causes !== undefined) {
        dbUpdates.root_causes = updates.root_causes as unknown as Json;
    }
    if (updates.contributing_factors_list !== undefined) {
        dbUpdates.contributing_factors_list = updates.contributing_factors_list as unknown as Json;
    }

    const { data, error } = await supabase
        .from('investigations')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    const rcaUpdates: Record<string, unknown> = {
        incident_id: incidentId,
        tenant_id: tenantId,
        updated_at: new Date().toISOString(),
    };

    if (updates.five_whys !== undefined) rcaUpdates.five_whys = updates.five_whys;
    if (updates.root_causes !== undefined) rcaUpdates.root_causes = updates.root_causes;
    if (updates.contributing_factors_list !== undefined) rcaUpdates.contributing_factors = updates.contributing_factors_list;
    if (updates.immediate_cause !== undefined) rcaUpdates.immediate_causes = [updates.immediate_cause];
    if (updates.underlying_cause !== undefined) rcaUpdates.underlying_causes = [updates.underlying_cause];

    const { error: rcaError } = await supabase
        .from('incident_rca')
        .upsert(rcaUpdates as any, { onConflict: 'incident_id' });

    if (rcaError) throw rcaError;

    await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: tenantId,
        actor_id: userId,
        action: 'investigation_updated',
        new_value: updates as unknown as Json,
    });

    return data;
};

export const lockRCA = async (incidentId: string) => {
    const { data, error } = await supabase.rpc('lock_rca', {
        p_incident_id: incidentId,
    });

    if (error) throw error;
    return data;
};

export const createCorrectiveAction = async (
    action: {
        incident_id: string;
        title: string;
        description?: string;
        assigned_to?: string;
        responsible_department_id?: string;
        start_date?: string;
        due_date?: string;
        priority?: string;
        action_type?: string;
        category?: string;
        linked_root_cause_id?: string;
        linked_cause_type?: string;
    },
    tenantId: string,
    userId: string
) => {
    const { data: incident } = await supabase
        .from('incidents')
        .select('branch_id, event_type')
        .eq('id', action.incident_id)
        .single();

    const { data, error } = await supabase
        .from('corrective_actions')
        .insert({
            ...action,
            tenant_id: tenantId,
            branch_id: incident?.branch_id || null,
            status: 'assigned',
        })
        .select()
        .single();

    if (error) throw error;

    await supabase.from('incident_audit_logs').insert({
        incident_id: action.incident_id,
        tenant_id: tenantId,
        actor_id: userId,
        action: 'action_created',
        new_value: { action_id: data.id, title: action.title },
    });

    return data;
};

export const updateCorrectiveAction = async (
    id: string,
    incidentId: string,
    updates: Partial<CorrectiveAction>,
    tenantId: string,
    userId: string
) => {
    const { data, error } = await supabase
        .from('corrective_actions')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: tenantId,
        actor_id: userId,
        action: 'action_updated',
        new_value: updates as unknown as Json,
    });

    return data;
};

export const verifyCorrectiveAction = async (input: {
    actionId: string;
    incidentId: string;
    verification_notes?: string;
    approved: boolean;
}, userId: string) => {
    const updateData = input.approved
        ? {
            status: 'closed',
            verified_by: userId,
            verified_at: new Date().toISOString(),
            verification_notes: input.verification_notes,
        }
        : {
            status: 'returned_for_correction',
            rejected_by: userId,
            rejected_at: new Date().toISOString(),
            rejection_notes: input.verification_notes,
            last_return_reason: input.verification_notes,
        };

    const { error } = await supabase
        .from('corrective_actions')
        .update(updateData)
        .eq('id', input.actionId);

    if (error) throw error;
};

export const softDeleteCorrectiveAction = async (id: string, incidentId: string) => {
    const { data, error } = await supabase.rpc('soft_delete_corrective_action', {
        p_action_id: id,
    });

    if (error) throw error;
    return { id, incidentId };
};

export const submitInvestigation = async (incidentId: string, tenantId: string, userId: string) => {
    const { error: updateError } = await supabase
        .from('incidents')
        .update({
            status: 'pending_closure' as unknown as string,
            closure_requested_by: userId,
            closure_requested_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', incidentId);

    if (updateError) throw updateError;

    await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: tenantId,
        actor_id: userId,
        action: 'investigation_submitted',
        new_value: { submitted_at: new Date().toISOString() },
    });

    try {
        await supabase.functions.invoke('send-investigation-submitted', {
            body: { incident_id: incidentId },
        });
    } catch (notifyError) {
        console.error('Failed to send investigation submitted notifications:', notifyError);
    }

    return { incidentId };
};
