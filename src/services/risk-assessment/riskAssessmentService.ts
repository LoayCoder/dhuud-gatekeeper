// Stub: risk-assessment service re-export
// Provides minimal implementations for hooks that dynamically import from this path

import { supabase } from '@/integrations/supabase/client';

export async function getRiskAssessmentDetails(assessmentId: string, tenantId: string) {
  const { data, error } = await supabase.from('risk_assessment_details').select('id, tenant_id, risk_assessment_id, hazard_description, hazard_description_ar, hazard_category, likelihood, severity, initial_risk_score, existing_controls, additional_controls, responsible_person, target_completion_date, residual_likelihood, residual_severity, residual_risk_score, ai_suggested, ai_confidence, sort_order, created_at, updated_at, deleted_at, control_hierarchy_level, control_status, job_step_description, job_step_number, number_exposed, persons_at_risk, required_ppe').eq('risk_assessment_id', assessmentId).eq('tenant_id', tenantId).is('deleted_at', null).order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function createRiskDetail(data: any, tenantId: string) {
  const { data: result, error } = await supabase.from('risk_assessment_details').insert({ ...data, tenant_id: tenantId }).select().single();
  if (error) throw error;
  return result;
}

export async function updateRiskDetail(id: string, data: any) {
  const { data: result, error } = await supabase.from('risk_assessment_details').update(data).eq('id', id).select().single();
  if (error) throw error;
  return result;
}

export async function deleteRiskDetail(id: string) {
  const { error } = await supabase.from('risk_assessment_details').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function bulkCreateRiskDetails(assessmentId: string, hazards: any[], tenantId: string) {
  const inserts = hazards.map((h, i) => ({ ...h, risk_assessment_id: assessmentId, tenant_id: tenantId, sort_order: i }));
  const { data, error } = await supabase.from('risk_assessment_details').insert(inserts).select();
  if (error) throw error;
  return data;
}

export async function getRiskAssessmentTeam(assessmentId: string, tenantId: string) {
  const { data, error } = await supabase.from('risk_assessment_team').select('id, tenant_id, risk_assessment_id, worker_id, user_id, role, role_ar, signed_at, is_required, created_at, updated_at').eq('risk_assessment_id', assessmentId).eq('tenant_id', tenantId);
  if (error) throw error;
  return data || [];
}

export async function signTeamMember(memberId: string, signatureData: string) {
  const { error } = await supabase.from('risk_assessment_team').update({ signature_data: signatureData, signed_at: new Date().toISOString() }).eq('id', memberId);
  if (error) throw error;
}

export async function addTeamMember(data: any, _tenantId?: string) {
  const { data: result, error } = await supabase.from('risk_assessment_team').insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function signAssessment(memberId: string, signatureData: string) {
  return signTeamMember(memberId, signatureData);
}

export async function removeTeamMember(memberId: string) {
  const { error } = await supabase.from('risk_assessment_team').update({ updated_at: new Date().toISOString() } as never).eq('id', memberId);
  if (error) throw error;
}

export async function getRiskAssessments(tenantId: string, _filters?: any) {
  const { data, error } = await supabase.from('risk_assessments').select('id, tenant_id, assessment_number, activity_name, activity_name_ar, activity_type, activity_description, status, location, branch_id, contractor_id, project_id, assessment_date, valid_until, next_review_date, overall_risk_rating, created_by, approved_by, approved_at, rejection_reason, revision_number, template_id, ai_risk_score, ai_confidence_level, created_at, updated_at, deleted_at').eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createRiskAssessment(data: any, tenantId: string, userId: string) {
  const { data: result, error } = await supabase.from('risk_assessments').insert({ ...data, tenant_id: tenantId, created_by: userId }).select().single();
  if (error) throw error;
  return result;
}

export async function getRiskAssessment(id: string, tenantId: string) {
  const { data, error } = await supabase.from('risk_assessments').select('id, tenant_id, assessment_number, activity_name, activity_name_ar, activity_type, activity_description, status, location, branch_id, contractor_id, project_id, assessment_date, valid_until, next_review_date, overall_risk_rating, scope_description, boundaries, risk_tolerance, review_frequency, permit_requirements, work_environment, applicable_legislation, management_approval_required, worker_consultation_date, worker_consultation_notes, union_representative_consulted, acceptance_justification, template_id, previous_version_id, revision_reason, created_by, approved_by, approved_at, rejection_reason, revision_number, ai_risk_score, ai_confidence_level, created_at, updated_at, deleted_at').eq('id', id).eq('tenant_id', tenantId).single();
  if (error) throw error;

  // Resolve creator and approver names from profiles
  let created_by_name: string | null = null;
  let approved_by_name: string | null = null;

  const profileIds = [data.created_by, data.approved_by].filter(Boolean) as string[];
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', profileIds);
    if (profiles) {
      for (const p of profiles) {
        if (p.id === data.created_by) created_by_name = p.full_name;
        if (p.id === data.approved_by) approved_by_name = p.full_name;
      }
    }
  }

  return { ...data, created_by_name, approved_by_name };
}

export async function updateRiskAssessment(id: string, updates: any) {
  const { data, error } = await supabase.from('risk_assessments').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRiskAssessment(id: string) {
  const { error } = await supabase.from('risk_assessments').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function submitRiskAssessment(id: string) {
  return updateRiskAssessment(id, { status: 'under_review' });
}

export async function approveRiskAssessment(id: string, userId: string, _validUntil?: string) {
  return updateRiskAssessment(id, { status: 'approved', approved_by: userId, approved_at: new Date().toISOString() });
}

export async function rejectRiskAssessment(id: string, reason: string) {
  return updateRiskAssessment(id, { status: 'rejected', rejection_reason: reason });
}
