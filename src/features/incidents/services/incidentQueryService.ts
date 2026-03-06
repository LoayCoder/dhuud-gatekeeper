import { supabase } from '../supabaseClient';
import type { Database } from '@/integrations/supabase/types';
import type { UseIncidentsOptions } from '@/features/incidents';

export const getIncidents = async ({
    tenantId,
    branchIds,
    isAllBranchesMode,
    page = 1,
    pageSize = 20,
    filters
}: {
    tenantId?: string;
    branchIds?: string[];
    isAllBranchesMode?: boolean;
    page?: number;
    pageSize?: number;
    filters?: UseIncidentsOptions['filters'];
}) => {
    if (!tenantId) return { data: [], count: 0 };

    let query = supabase
        .from('incidents')
        .select(`
      id, reference_id, title, event_type, subtype, incident_type,
      severity, severity_v2, status, occurred_at, created_at,
      branch_id, site_id, location, approval_manager_id,
      branch:branches!branch_id(name),
      site:sites!site_id(name),
      related_contractor_company:contractor_companies!incidents_related_contractor_company_id_fkey(id, company_name),
      approval_manager:profiles!incidents_approval_manager_id_fkey(id, full_name, job_title),
      investigations(investigator:profiles!investigations_investigator_id_fkey(id, full_name, job_title))
    `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

    if (!isAllBranchesMode && branchIds && branchIds.length > 0) {
        if (branchIds.length === 1) {
            query = query.eq('branch_id', branchIds[0]);
        } else {
            query = query.in('branch_id', branchIds);
        }
    }

    if (filters) {
        if (filters.search) {
            query = query.or(`title.ilike.%${filters.search}%,reference_id.ilike.%${filters.search}%`);
        }
        if (filters.status && filters.status !== 'all') {
            query = query.eq('status', filters.status as never);
        }
        if (filters.severity && filters.severity !== 'all') {
            query = query.eq('severity_v2', filters.severity as never);
        }
        if (filters.eventType && filters.eventType !== 'all') {
            query = query.eq('event_type', filters.eventType);
        }
        if (filters.branchId && filters.branchId !== 'all') {
            query = query.eq('branch_id', filters.branchId);
        }
        if (filters.contractorId) {
            query = query.eq('related_contractor_company_id', filters.contractorId);
        }
        if (filters.dateRange?.from) {
            query = query.gte('occurred_at', filters.dateRange.from.toISOString());
            if (filters.dateRange.to) {
                const nextDay = new Date(filters.dateRange.to);
                nextDay.setDate(nextDay.getDate() + 1);
                query = query.lt('occurred_at', nextDay.toISOString());
            }
        }
        if (filters.tags && filters.tags.length > 0) {
            query = query.contains('tags', filters.tags);
        }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) throw error;

    return { data, count };
};

export const getIncidentById = async ({
    id,
    tenantId
}: {
    id?: string;
    tenantId?: string;
}) => {
    if (!id || !tenantId) return null;

    const { data, error } = await supabase
        .from('incidents')
        .select(`
      id, reference_id, title, description, event_type, subtype, 
      occurred_at, location, severity, severity_v2, original_severity_v2, severity_override_reason, 
      potential_severity_v2, original_potential_severity_v2, potential_severity_pending_approval,
      potential_severity_justification, potential_severity_approved_by, potential_severity_approved_at,
      status, immediate_actions,
      has_injury, injury_details, has_damage, damage_details,
      latitude, longitude, 
      location_country, location_city, location_district, location_street, location_formatted,
      media_attachments, ai_analysis_result,
      created_at, updated_at, tenant_id, reporter_id,
      branch_id, site_id, department_id, special_event_id,
      closure_requested_by, closure_requested_at, closure_request_notes,
      related_contractor_company_id,
      approval_manager_id,
      consultant_screening_notes,
      osha_reportable,
      expert_resubmission_count,
      approval_manager:profiles!incidents_approval_manager_id_fkey(id, full_name, job_title),
      investigations(investigator:profiles!investigations_investigator_id_fkey(id, full_name, job_title)),
      reporter:profiles!incidents_reporter_id_fkey(id, full_name),
      closure_requester:profiles!incidents_closure_requested_by_fkey(id, full_name),
      branch:branches!incidents_branch_id_fkey(id, name),
      site:sites!incidents_site_id_fkey(id, name, latitude, longitude),
      department_info:departments!incidents_department_id_fkey(id, name),
      special_event:special_events!incidents_special_event_id_fkey(id, name),
      related_contractor_company:contractor_companies!incidents_related_contractor_company_id_fkey(id, company_name)
    `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

    if (error) throw error;

    const extended = data as unknown as Record<string, unknown>;
    return {
        ...data,
        severity_v2: extended.severity_v2 ?? null,
        original_severity_v2: extended.original_severity_v2 ?? null,
        severity_override_reason: extended.severity_override_reason ?? null,
        approved_by: extended.approved_by ?? null,
        approved_at: extended.approved_at ?? null,
        approval_notes: extended.approval_notes ?? null,
        investigation_locked: extended.investigation_locked ?? false,
        original_severity: extended.original_severity ?? null,
        severity_change_justification: extended.severity_change_justification ?? null,
        severity_approved_by: extended.severity_approved_by ?? null,
        severity_approved_at: extended.severity_approved_at ?? null,
        severity_pending_approval: extended.severity_pending_approval ?? false,
        potential_severity_v2: extended.potential_severity_v2 ?? null,
        original_potential_severity_v2: extended.original_potential_severity_v2 ?? null,
        potential_severity_pending_approval: extended.potential_severity_pending_approval ?? false,
        potential_severity_justification: extended.potential_severity_justification ?? null,
        potential_severity_approved_by: extended.potential_severity_approved_by ?? null,
        potential_severity_approved_at: extended.potential_severity_approved_at ?? null,
        closure_requested_by: extended.closure_requested_by ?? null,
        closure_requested_at: extended.closure_requested_at ?? null,
        closure_request_notes: extended.closure_request_notes ?? null,
        closure_requester: (data as Record<string, unknown>).closure_requester ?? null,
        location_country: extended.location_country ?? null,
        location_city: extended.location_city ?? null,
        location_district: extended.location_district ?? null,
        location_street: extended.location_street ?? null,
        location_formatted: extended.location_formatted ?? null,
        related_contractor_company_id: extended.related_contractor_company_id ?? null,
        related_contractor_company: (data as Record<string, unknown>).related_contractor_company ?? null,
        approval_manager_id: extended.approval_manager_id ?? null,
        approval_manager: (data as Record<string, unknown>).approval_manager ?? null,
        investigations: (data as Record<string, unknown>).investigations ?? null,
        consultant_screening_notes: extended.consultant_screening_notes ?? null,
    };
};

export const getMyReportedIncidents = async ({
    userId,
    tenantId
}: {
    userId?: string;
    tenantId?: string;
}) => {
    if (!userId || !tenantId) return [];

    const { data, error } = await supabase
        .from('incidents')
        .select('id, reference_id, title, status, severity, event_type, created_at, occurred_at, site:sites(id, name), branch:branches!incidents_branch_id_fkey(id, name)')
        .eq('reporter_id', userId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const getMyCorrectiveActions = async ({
    userId,
    tenantId
}: {
    userId?: string;
    tenantId?: string;
}) => {
    if (!userId || !tenantId) return [];

    const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
      id, reference_id, title, description, status, priority, due_date, incident_id, 
      created_at, completed_date, released_at, return_count,
      rejection_notes, last_return_reason, rejected_at,
      rejected_by_profile:profiles!corrective_actions_rejected_by_fkey(id, full_name),
      incident:incidents!corrective_actions_incident_id_fkey(event_type)
    `)
        .eq('assigned_to', userId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return data.filter(action => {
        const isReleased = action.released_at !== null;
        const isObservation = (action.incident as Record<string, unknown>)?.event_type === 'observation';
        return isReleased || isObservation;
    });
};

export const updateMyActionStatus = async ({
    id,
    status,
    progressNotes,
    completionNotes,
    overdueJustification,
}: {
    id: string;
    status: string;
    progressNotes?: string;
    completionNotes?: string;
    overdueJustification?: string;
}) => {
    const updateData: Record<string, unknown> = { status };

    if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString();
        if (progressNotes) {
            updateData.progress_notes = progressNotes;
        }
    }

    if (status === 'completed') {
        updateData.completed_date = new Date().toISOString().split('T')[0];
        if (completionNotes) {
            updateData.completion_notes = completionNotes;
        }
        if (overdueJustification) {
            updateData.overdue_justification = overdueJustification;
        }
    }

    const { error } = await supabase
        .from('corrective_actions')
        .update(updateData)
        .eq('id', id);

    if (error) throw error;
    return { id, status };
};

export const updateIncidentStatus = async ({ id, status }: { id: string; status: Database['public']['Enums']['incident_status'] }) => {
    const { error } = await supabase
        .from('incidents')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw error;
    return { id, status };
};

export const softDeleteIncident = async (id: string) => {
    const { error } = await supabase
        .rpc('soft_delete_incident', { p_incident_id: id });

    if (error) throw error;
    return { id };
};
