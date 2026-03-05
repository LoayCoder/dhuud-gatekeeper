// Stub: risk-assessment service re-export
// Provides minimal implementations for hooks that dynamically import from this path

import { supabase } from '@/integrations/supabase/client';

export async function getRiskAssessmentDetails(assessmentId: string, tenantId: string) {
  const { data, error } = await supabase.from('risk_assessment_details').select('*').eq('risk_assessment_id', assessmentId).eq('tenant_id', tenantId).is('deleted_at', null).order('sort_order');
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
  const { data, error } = await supabase.from('risk_assessment_team').select('*').eq('risk_assessment_id', assessmentId).eq('tenant_id', tenantId).is('deleted_at', null);
  if (error) throw error;
  return data || [];
}

export async function signTeamMember(memberId: string, signatureData: string) {
  const { error } = await supabase.from('risk_assessment_team').update({ signature_data: signatureData, signed_at: new Date().toISOString() }).eq('id', memberId);
  if (error) throw error;
}

export async function addTeamMember(data: any) {
  const { data: result, error } = await supabase.from('risk_assessment_team').insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function removeTeamMember(memberId: string) {
  const { error } = await supabase.from('risk_assessment_team').update({ deleted_at: new Date().toISOString() }).eq('id', memberId);
  if (error) throw error;
}

export async function getRiskAssessments(tenantId: string) {
  const { data, error } = await supabase.from('risk_assessments').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getRiskAssessment(id: string, tenantId: string) {
  const { data, error } = await supabase.from('risk_assessments').select('*').eq('id', id).eq('tenant_id', tenantId).single();
  if (error) throw error;
  return data;
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

export async function approveRiskAssessment(id: string, userId: string) {
  return updateRiskAssessment(id, { status: 'approved', approved_by: userId, approved_at: new Date().toISOString() });
}

export async function rejectRiskAssessment(id: string, reason: string) {
  return updateRiskAssessment(id, { status: 'rejected', rejection_reason: reason });
}
