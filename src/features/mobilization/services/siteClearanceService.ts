import { supabase } from '@/integrations/supabase/client';

const DISCIPLINES = [
  { key: 'electrical', label: 'Electrical', required: true },
  { key: 'mechanical', label: 'Mechanical', required: true },
  { key: 'irrigation_water', label: 'Irrigation / Water', required: true },
  { key: 'underground_civil', label: 'Underground Utilities / Civil', required: true },
  { key: 'it_communication', label: 'IT / Communication', required: false },
  { key: 'area_owner', label: 'Area Owner', required: true },
  { key: 'hsse', label: 'HSSE', required: true },
] as const;

export { DISCIPLINES };

export type DisciplineKey = typeof DISCIPLINES[number]['key'];

/**
 * Ensure discipline sign-off rows exist for a mobilization
 */
export async function ensureDisciplineSignoffs(mobilizationId: string, tenantId: string) {
  const { data: existing } = await supabase
    .from('site_clearance_signoffs')
    .select('discipline')
    .eq('mobilization_id', mobilizationId)
    .is('deleted_at', null);

  const existingDisciplines = new Set((existing || []).map((s: any) => s.discipline));
  const missing = DISCIPLINES.filter(d => !existingDisciplines.has(d.key));

  if (missing.length === 0) return;

  const { error } = await supabase
    .from('site_clearance_signoffs')
    .insert(missing.map(d => ({
      mobilization_id: mobilizationId,
      tenant_id: tenantId,
      discipline: d.key,
      is_required: d.required,
    } as any)));

  if (error) throw error;
}

/**
 * Get all sign-offs for a mobilization
 */
export async function getSignoffs(mobilizationId: string) {
  const { data, error } = await supabase
    .from('site_clearance_signoffs')
    .select(`
      id, discipline, is_required, signed_by, signed_at, comments,
      signer:profiles!site_clearance_signoffs_signed_by_fkey(full_name)
    `)
    .eq('mobilization_id', mobilizationId)
    .is('deleted_at', null)
    .order('created_at');

  if (error) throw error;
  return data;
}

/**
 * Sign off a discipline
 */
export async function signDiscipline(
  signoffId: string,
  userId: string,
  comments?: string
) {
  const { data, error } = await supabase
    .from('site_clearance_signoffs')
    .update({
      signed_by: userId,
      signed_at: new Date().toISOString(),
      comments: comments || null,
    })
    .eq('id', signoffId)
    .select('mobilization_id, discipline')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Revoke a discipline sign-off
 */
export async function revokeSignoff(signoffId: string) {
  const { data, error } = await supabase
    .from('site_clearance_signoffs')
    .update({
      signed_by: null,
      signed_at: null,
      comments: null,
    })
    .eq('id', signoffId)
    .select('mobilization_id, discipline')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update site risk verification fields
 */
export async function updateSiteRiskVerification(
  mobilizationId: string,
  fields: {
    utility_verified?: boolean;
    underground_utilities_identified?: boolean;
    high_risk_zones_marked?: boolean;
    work_boundaries_defined?: boolean;
    utility_verified_notes?: string;
    underground_utilities_notes?: string;
    high_risk_zones_notes?: string;
    work_boundaries_notes?: string;
  }
) {
  const { data, error } = await supabase
    .from('project_mobilizations')
    .update(fields as any)
    .eq('id', mobilizationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update known risks and control measures
 */
export async function updateRisksAndControls(
  mobilizationId: string,
  fields: {
    known_risks?: string;
    control_measures?: string;
  }
) {
  const { data, error } = await supabase
    .from('project_mobilizations')
    .update(fields as any)
    .eq('id', mobilizationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Upload a clearance attachment
 */
export async function uploadClearanceAttachment(
  mobilizationId: string,
  tenantId: string,
  userId: string,
  file: File,
  description?: string
) {
  const filePath = `${tenantId}/${mobilizationId}/${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('site-clearance-attachments')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('site_clearance_attachments')
    .insert({
      mobilization_id: mobilizationId,
      tenant_id: tenantId,
      file_name: file.name,
      storage_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      description: description || null,
      uploaded_by: userId,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get clearance attachments
 */
export async function getClearanceAttachments(mobilizationId: string) {
  const { data, error } = await supabase
    .from('site_clearance_attachments')
    .select(`
      id, file_name, storage_path, file_size, mime_type, description, created_at,
      uploader:profiles!site_clearance_attachments_uploaded_by_fkey(full_name)
    `)
    .eq('mobilization_id', mobilizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Delete a clearance attachment (soft delete)
 */
export async function deleteClearanceAttachment(attachmentId: string) {
  const { error } = await supabase
    .from('site_clearance_attachments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', attachmentId);

  if (error) throw error;
}

/**
 * Log an audit event for site clearance
 */
export async function logClearanceAudit(
  mobilizationId: string,
  tenantId: string,
  actorId: string,
  action: string,
  discipline?: string,
  details?: Record<string, unknown>
) {
  const { error } = await supabase
    .from('site_clearance_audit_logs')
    .insert({
      mobilization_id: mobilizationId,
      tenant_id: tenantId,
      actor_id: actorId,
      action,
      discipline: discipline || null,
      details: details || null,
    } as any);

  if (error) console.error('[SiteClearance] Audit log failed:', error);
}

/**
 * Get audit trail for a mobilization
 */
export async function getClearanceAuditLogs(mobilizationId: string) {
  const { data, error } = await supabase
    .from('site_clearance_audit_logs')
    .select(`
      id, action, discipline, details, created_at,
      actor:profiles!site_clearance_audit_logs_actor_id_fkey(full_name)
    `)
    .eq('mobilization_id', mobilizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ==================== Site Clearance Risks ====================

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export async function getSiteClearanceRisks(mobilizationId: string) {
  const { data, error } = await supabase
    .from('site_clearance_risks')
    .select(`
      id, risk_description, severity, control_measures, residual_severity, created_at,
      creator:profiles!site_clearance_risks_created_by_fkey(full_name)
    `)
    .eq('mobilization_id', mobilizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function addSiteClearanceRisk(
  mobilizationId: string,
  tenantId: string,
  userId: string,
  risk: { risk_description: string; severity: RiskSeverity; control_measures?: string }
) {
  const { data, error } = await supabase
    .from('site_clearance_risks')
    .insert({
      mobilization_id: mobilizationId,
      tenant_id: tenantId,
      risk_description: risk.risk_description,
      severity: risk.severity,
      control_measures: risk.control_measures || null,
      created_by: userId,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSiteClearanceRisk(
  riskId: string,
  fields: { risk_description?: string; severity?: RiskSeverity; control_measures?: string; residual_severity?: RiskSeverity }
) {
  const { data, error } = await supabase
    .from('site_clearance_risks')
    .update(fields as any)
    .eq('id', riskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSiteClearanceRisk(riskId: string) {
  const { error } = await supabase
    .from('site_clearance_risks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', riskId);

  if (error) throw error;
}
