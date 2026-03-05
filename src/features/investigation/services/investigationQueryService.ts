import { supabase } from '../supabaseClient';
import type { Investigation, CorrectiveAction, IncidentAuditLog, FiveWhyEntry, RootCauseEntry, ContributingFactorEntry } from '@/features/investigation';

export const getInvestigation = async (incidentId: string) => {
    const { data: invData, error: invError } = await supabase
        .from('investigations')
        .select('*')
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .maybeSingle();

    if (invError) throw invError;
    if (!invData) return null;

    const { data: rcaData, error: rcaError } = await supabase
        .from('incident_rca')
        .select('*')
        .eq('incident_id', incidentId)
        .maybeSingle();

    if (rcaError) {
        console.error('Error fetching RCA data:', rcaError);
    }

    let parsedWhys: FiveWhyEntry[] = [];
    const sourceWhys = rcaData?.five_whys || invData.five_whys;
    if (Array.isArray(sourceWhys)) {
        parsedWhys = (sourceWhys as unknown as FiveWhyEntry[]).filter(
            (item): item is FiveWhyEntry =>
                typeof item === 'object' && item !== null && 'why' in item && 'answer' in item
        );
    }

    let parsedRootCauses: RootCauseEntry[] = [];
    const sourceRootCauses = rcaData?.root_causes || invData.root_causes;
    if (Array.isArray(sourceRootCauses)) {
        parsedRootCauses = (sourceRootCauses as unknown as RootCauseEntry[]).filter(
            (item): item is RootCauseEntry =>
                typeof item === 'object' && item !== null && 'id' in item && 'text' in item
        );
    }

    let parsedContributingFactors: ContributingFactorEntry[] = [];
    const sourceFactors = rcaData?.contributing_factors || invData.contributing_factors_list;
    if (Array.isArray(sourceFactors)) {
        parsedContributingFactors = (sourceFactors as unknown as ContributingFactorEntry[]).filter(
            (item): item is ContributingFactorEntry =>
                typeof item === 'object' && item !== null && 'id' in item && 'text' in item
        );
    }

    return {
        id: invData.id,
        incident_id: invData.incident_id,
        investigator_id: invData.investigator_id,
        started_at: invData.started_at,
        completed_at: invData.completed_at,
        immediate_cause: rcaData?.immediate_causes?.[0] || invData.immediate_cause,
        underlying_cause: rcaData?.underlying_causes?.[0] || invData.underlying_cause,
        root_cause: invData.root_cause,
        contributing_factors: invData.contributing_factors,
        findings_summary: invData.findings_summary,
        five_whys: parsedWhys,
        root_causes: parsedRootCauses,
        contributing_factors_list: parsedContributingFactors,
        ai_summary: invData.ai_summary ?? null,
        ai_summary_generated_at: invData.ai_summary_generated_at ?? null,
        ai_summary_language: invData.ai_summary_language ?? null,
        tenant_id: invData.tenant_id,
        created_at: invData.created_at,
        updated_at: invData.updated_at,
        assigned_by: invData.assigned_by ?? null,
        assigned_at: invData.assigned_at ?? null,
        assignment_notes: invData.assignment_notes ?? null,
        rca_id: rcaData?.id,
        is_rca_locked: rcaData?.is_locked || false,
        rca_locked_by: rcaData?.locked_by,
        rca_locked_at: rcaData?.locked_at,
    } as Investigation;
};

export const getCorrectiveActions = async (incidentId: string) => {
    const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
      id, reference_id, title, description, status, priority, action_type,
      due_date, start_date, assigned_to, responsible_department_id,
      category, linked_root_cause_id, linked_cause_type, deleted_at,
      incident_id, tenant_id, created_at, completed_date,
      verified_by, verified_at, verification_notes,
      rejected_by, rejected_at, rejection_notes,
      assignee:profiles!assigned_to(id, full_name, job_title),
      department:departments!responsible_department_id(id, name)
    `)
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as CorrectiveAction[];
};

export const getIncidentAuditLogs = async (incidentId: string) => {
    const { data, error } = await supabase
        .from('incident_audit_logs')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as IncidentAuditLog[];
};
