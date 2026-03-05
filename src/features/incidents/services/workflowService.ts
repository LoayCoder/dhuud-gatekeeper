// HSSE Workflow service functions
// These are used by workflow mutations/queries via dynamic import
import { supabase } from '@/integrations/supabase/client';

export async function performExpertScreening(input: any, userId: string, tenantId: string) {
  const { data, error } = await (supabase as any).rpc('perform_expert_screening', {
    p_incident_id: input.incidentId,
    p_user_id: userId,
    p_severity_v2: input.severity_v2 || null,
    p_notes: input.notes || null,
  });
  if (error) throw error;
  return data;
}

export async function handleReporterResponse(input: any, userId: string, tenantId: string) {
  const { data, error } = await (supabase as any).rpc('handle_reporter_response', {
    p_incident_id: input.incidentId,
    p_user_id: userId,
    p_response: input.response,
    p_notes: input.notes || null,
  });
  if (error) throw error;
  return data;
}

export async function handleManagerApproval(input: any, userId: string, tenantId: string) {
  const { data, error } = await (supabase as any).rpc('handle_manager_approval', {
    p_incident_id: input.incidentId,
    p_user_id: userId,
    p_approved: input.approved,
    p_notes: input.notes || null,
  });
  if (error) throw error;
  return data;
}

export async function handleHSSEManagerEscalation(input: any, userId: string, tenantId: string) {
  const { data, error } = await (supabase as any).rpc('handle_hsse_manager_escalation', {
    p_incident_id: input.incidentId,
    p_user_id: userId,
    p_action: input.action,
    p_notes: input.notes || null,
  });
  if (error) throw error;
  return data;
}

export async function startInvestigation(input: any, userId: string, tenantId: string) {
  const { data, error } = await (supabase as any).rpc('start_investigation', {
    p_incident_id: input.incidentId,
    p_user_id: userId,
    p_investigator_id: input.investigatorId || userId,
  });
  if (error) throw error;
  return data;
}

export async function handleDeptRepApproval(input: any, userId: string, tenantId: string) {
  const { data, error } = await (supabase as any).rpc('handle_dept_rep_approval', {
    p_incident_id: input.incidentId,
    p_user_id: userId,
    p_approved: input.approved,
    p_notes: input.notes || null,
  });
  if (error) throw error;
  return data;
}

export async function canPerformExpertScreening(userId: string): Promise<boolean> {
  const { data } = await (supabase as any).rpc('has_role_by_code', {
    p_user_id: userId,
    p_role_code: 'hsse_expert',
  });
  return data === true;
}

export async function canApproveInvestigation(userId: string, incidentId: string): Promise<boolean> {
  const { data } = await (supabase as any).rpc('can_approve_investigation', {
    p_incident_id: incidentId,
  });
  return data === true;
}

export async function getIncidentDepartmentManager(incidentId: string) {
  const { data } = await (supabase as any)
    .from('incidents')
    .select('department_id')
    .eq('id', incidentId)
    .single();
  return data;
}

export async function canApproveDeptRep(userId: string, incidentId: string): Promise<boolean> {
  const { data } = await (supabase as any).rpc('has_role_by_code', {
    p_user_id: userId,
    p_role_code: 'department_representative',
  });
  return data === true;
}
