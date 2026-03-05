// Risk assessment service - comprehensive stub
import { supabase } from '@/integrations/supabase/client';

export async function getRiskAssessments(tenantId: string, filters: any = {}) {
  let query = (supabase as any).from('risk_assessments').select('*').eq('tenant_id', tenantId).is('deleted_at', null);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.search) query = query.ilike('activity_name', `%${filters.search}%`);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getRiskAssessment(id: string, _tenantId?: string) {
  const { data, error } = await (supabase as any).from('risk_assessments').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createRiskAssessment(assessment: any, _tenantId?: string) {
  const { data, error } = await (supabase as any).from('risk_assessments').insert(assessment).select().single();
  if (error) throw error;
  return data;
}

export async function updateRiskAssessment(id: string, updates: any, _tenantId?: string) {
  const { data, error } = await (supabase as any).from('risk_assessments').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRiskAssessment(id: string) {
  const { error } = await (supabase as any).from('risk_assessments').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function submitRiskAssessment(id: string) {
  return updateRiskAssessment(id, { status: 'under_review' });
}

export async function approveRiskAssessment(id: string, userId: string, _notes?: string) {
  return updateRiskAssessment(id, { status: 'approved', approved_by: userId, approved_at: new Date().toISOString() });
}

export async function rejectRiskAssessment(id: string, userId: string, notes?: string) {
  return updateRiskAssessment(id, { status: 'rejected', rejected_by: userId, rejected_at: new Date().toISOString(), rejection_notes: notes });
}

export async function getRiskAssessmentDetails(assessmentId: string) {
  const { data, error } = await (supabase as any).from('risk_assessment_hazards').select('*').eq('assessment_id', assessmentId).is('deleted_at', null);
  if (error) throw error;
  return data || [];
}

export async function createRiskDetail(detail: any) {
  const { data, error } = await (supabase as any).from('risk_assessment_hazards').insert(detail).select().single();
  if (error) throw error;
  return data;
}

export async function updateRiskDetail(id: string, updates: any) {
  const { data, error } = await (supabase as any).from('risk_assessment_hazards').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRiskDetail(id: string) {
  const { error } = await (supabase as any).from('risk_assessment_hazards').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function bulkCreateRiskDetails(details: any[]) {
  const { data, error } = await (supabase as any).from('risk_assessment_hazards').insert(details).select();
  if (error) throw error;
  return data || [];
}

export async function getRiskAssessmentTeam(assessmentId: string, _tenantId?: string) {
  const { data, error } = await (supabase as any).from('risk_assessment_team').select('*, profile:profiles(full_name, full_name_ar, employee_id)').eq('assessment_id', assessmentId).is('deleted_at', null);
  if (error) throw error;
  return data || [];
}

export async function addTeamMember(data: any, _tenantId?: string) {
  const { data: result, error } = await (supabase as any).from('risk_assessment_team').insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function removeTeamMember(memberId: string) {
  const { error } = await (supabase as any).from('risk_assessment_team').update({ deleted_at: new Date().toISOString() }).eq('id', memberId);
  if (error) throw error;
}

export async function signAssessment(memberId: string, signatureData: string) {
  const { data, error } = await (supabase as any).from('risk_assessment_team').update({ signature_data: signatureData, signed_at: new Date().toISOString() }).eq('id', memberId).select().single();
  if (error) throw error;
  return data;
}

export async function signRiskAssessment(memberId: string, signatureData: string) {
  return signAssessment(memberId, signatureData);
}
