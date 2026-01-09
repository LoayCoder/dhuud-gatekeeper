import { generateBrandedPDFFromElement, createPDFRenderContainer, removePDFRenderContainer, preloadImageWithDimensions } from './pdf-utils';
import { fetchDocumentSettings } from '@/hooks/use-document-branding';
import { DocumentBrandingSettings } from '@/types/document-branding';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getReportAccessLevel, ReportAccessLevel, MANAGER_AUDIT_ACTIONS } from './incident-report-role-check';

// ============= Interfaces =============

interface IncidentReportData {
  incident: {
    id: string;
    reference_id: string | null;
    title: string;
    description: string;
    event_type: string;
    subtype?: string | null;
    incident_type?: string | null; // HSSE category (safety, health, etc.)
    severity?: string | null;
    potential_severity?: string | null; // Potential severity (worst-case scenario)
    status?: string | null;
    occurred_at?: string | null;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    has_injury?: boolean | null;
    has_damage?: boolean | null;
    injury_details?: Record<string, unknown> | null;
    damage_details?: Record<string, unknown> | null;
    immediate_actions?: string | null;
    created_at?: string | null;
    reporter?: { full_name: string } | null;
    branch?: { name: string } | null;
    site?: { name: string } | null;
    department_info?: { name: string } | null;
    // Additional fields for legal document
    source_observation_id?: string | null;
    upgraded_to_incident_id?: string | null;
    upgraded_at?: string | null;
    upgraded_by?: string | null;
    approved_by?: string | null;
    approved_at?: string | null;
    closure_notes?: string | null;
    closure_approved_at?: string | null;
    closure_approved_by?: string | null;
    related_contractor_company_id?: string | null;
    confidentiality_level?: string | null;
    confidentiality_set_by?: string | null;
    confidentiality_expires_at?: string | null;
  };
  tenantId: string;
  userId: string;
  language?: 'en' | 'ar';
  fullLegalMode?: boolean; // Include all evidence thumbnails
  includeFullAuditLog?: boolean; // Include complete audit trail
}

interface InvestigationData {
  investigator?: { full_name: string } | null;
  started_at?: string | null;
  completed_at?: string | null;
  assignment_notes?: string | null;
}

interface EvidenceItem {
  id: string;
  evidence_type: string;
  description?: string | null;
  file_name?: string | null;
  created_at?: string | null;
  storage_path?: string | null;
  uploaded_by_name?: string | null;
  is_reviewed?: boolean | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  thumbnailBase64?: string | null;
}

interface ActionEvidenceItem {
  id: string;
  action_id: string;
  file_name: string;
  description?: string | null;
  created_at?: string | null;
  uploaded_by_name?: string | null;
}

interface WitnessStatement {
  id: string;
  witness_name: string;
  statement_type: string;
  statement_text?: string | null;
  created_at?: string | null;
}

interface RCAData {
  why_1?: string | null;
  why_2?: string | null;
  why_3?: string | null;
  why_4?: string | null;
  why_5?: string | null;
  immediate_cause?: string | null;
  underlying_cause?: string | null;
  root_causes?: Array<{ id: string; description: string }>;
  contributing_factors?: Array<{ id: string; description: string }>;
}

interface CorrectiveAction {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  category?: string | null;
  action_type?: string | null;
  due_date?: string | null;
  start_date?: string | null;
  completed_date?: string | null;
  verified_at?: string | null;
  assigned_user?: { full_name: string } | null;
  department?: { name: string } | null;
  verified_by_user?: { full_name: string } | null;
  evidence?: ActionEvidenceItem[];
}

interface AuditLogEntry {
  action: string;
  actor_name: string;
  actor_role?: string;
  created_at: string;
  details?: string;
  old_value?: unknown;
  new_value?: unknown;
}

interface TenantInfo {
  name: string;
  logo_light_url?: string | null;
}

interface WorkflowDecision {
  type: string;
  decision_by?: string | null;
  decision_at?: string | null;
  notes?: string | null;
  status?: string | null;
}

interface ContractorViolationData {
  contractor_company_name?: string | null;
  violation_category?: string | null;
  penalty_applied?: string | null;
  penalty_amount?: number | null;
  acknowledgment_status?: string | null;
  acknowledged_at?: string | null;
  acknowledged_by_name?: string | null;
}

interface UpgradeHistoryData {
  source_observation_ref?: string | null;
  upgraded_to_incident_ref?: string | null;
  upgraded_by_name?: string | null;
  upgraded_at?: string | null;
  escalation_decision?: string | null;
  escalation_decision_by_name?: string | null;
  escalation_decision_at?: string | null;
  escalation_decision_notes?: string | null;
}

interface PropertyDamageData {
  property_name: string;
  property_type: string | null;
  damage_severity: string | null;
  repair_cost_estimate: number | null;
  replacement_cost_estimate: number | null;
  cost_currency: string;
  damage_description: string | null;
  operational_impact: string | null;
  downtime_hours: number;
  repair_status: string;
  location_description: string | null;
  safety_hazard_created: boolean;
  safety_hazard_description: string | null;
}

interface EnvironmentalContaminationData {
  contaminant_name: string;
  contamination_types: string[] | null;
  hazard_classification: string | null;
  volume_released: number | null;
  area_affected_sqm: number | null;
  contaminated_volume_m3: number | null;
  spill_severity: string | null;
  containment_failure_percentage: number | null;
  regulatory_breach_flagged: boolean | null;
  population_exposed: boolean | null;
  total_environmental_cost: number | null;
  cost_severity: string | null;
  regulatory_fines: number | null;
}

// ============= Data Fetching Functions =============

async function fetchTenantInfo(tenantId: string): Promise<TenantInfo | null> {
  const { data } = await supabase
    .from('tenants')
    .select('name, logo_light_url')
    .eq('id', tenantId)
    .single();
  return data as TenantInfo | null;
}

async function fetchInvestigationData(incidentId: string): Promise<InvestigationData | null> {
  const { data } = await supabase
    .from('investigations')
    .select('investigator:profiles!investigations_investigator_id_fkey(full_name), started_at, completed_at, assignment_notes')
    .eq('incident_id', incidentId)
    .maybeSingle();
  return data as InvestigationData | null;
}

async function fetchEvidenceItems(incidentId: string, includeUploader: boolean = false): Promise<EvidenceItem[]> {
  const { data } = await supabase
    .from('evidence_items')
    .select('id, evidence_type, description, file_name, created_at, storage_path, uploaded_by, reviewed_by, reviewed_at')
    .eq('incident_id', incidentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  
  if (!data) return [];
  
  // Fetch uploader and reviewer names if needed
  const uploaderIds = [...new Set([
    ...data.map(e => e.uploaded_by).filter(Boolean),
    ...data.map(e => e.reviewed_by).filter(Boolean)
  ])] as string[];
  
  let profileMap = new Map<string, string>();
  if (includeUploader && uploaderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', uploaderIds);
    profiles?.forEach(p => profileMap.set(p.id, p.full_name));
  }
  
  return data.map(e => ({
    id: e.id,
    evidence_type: e.evidence_type,
    description: e.description,
    file_name: e.file_name,
    created_at: e.created_at,
    storage_path: e.storage_path,
    uploaded_by_name: e.uploaded_by ? profileMap.get(e.uploaded_by) : null,
    is_reviewed: !!e.reviewed_by,
    reviewed_by_name: e.reviewed_by ? profileMap.get(e.reviewed_by) : null,
    reviewed_at: e.reviewed_at
  })) as EvidenceItem[];
}

async function fetchActionEvidence(actionIds: string[]): Promise<Map<string, ActionEvidenceItem[]>> {
  if (actionIds.length === 0) return new Map();
  
  const { data } = await supabase
    .from('action_evidence')
    .select('id, action_id, file_name, description, created_at, uploaded_by')
    .in('action_id', actionIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  
  if (!data) return new Map();
  
  const uploaderIds = [...new Set(data.map(e => e.uploaded_by).filter(Boolean))] as string[];
  let profileMap = new Map<string, string>();
  if (uploaderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', uploaderIds);
    profiles?.forEach(p => profileMap.set(p.id, p.full_name));
  }
  
  const evidenceByAction = new Map<string, ActionEvidenceItem[]>();
  data.forEach(e => {
    const item: ActionEvidenceItem = {
      id: e.id,
      action_id: e.action_id,
      file_name: e.file_name,
      description: e.description,
      created_at: e.created_at,
      uploaded_by_name: e.uploaded_by ? profileMap.get(e.uploaded_by) : null
    };
    if (!evidenceByAction.has(e.action_id)) {
      evidenceByAction.set(e.action_id, []);
    }
    evidenceByAction.get(e.action_id)!.push(item);
  });
  
  return evidenceByAction;
}

async function fetchContractorViolation(incidentId: string): Promise<ContractorViolationData | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: incident } = await db
    .from('incidents')
    .select(`
      violation_type_id,
      violation_penalty_type,
      violation_fine_amount,
      violation_contractor_acknowledged_at,
      violation_contractor_acknowledged_by,
      related_contractor_company:related_contractor_company_id(name)
    `)
    .eq('id', incidentId)
    .single();
  
  if (!incident || !incident.related_contractor_company) return null;
  
  let acknowledgedByName = null;
  if (incident.violation_contractor_acknowledged_by) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', incident.violation_contractor_acknowledged_by)
      .single();
    acknowledgedByName = profile?.full_name;
  }
  
  return {
    contractor_company_name: incident.related_contractor_company?.name,
    violation_category: incident.violation_type_id,
    penalty_applied: incident.violation_penalty_type,
    penalty_amount: incident.violation_fine_amount,
    acknowledgment_status: incident.violation_contractor_acknowledged_by ? 'acknowledged' : 'pending',
    acknowledged_at: incident.violation_contractor_acknowledged_at,
    acknowledged_by_name: acknowledgedByName
  };
}

async function fetchUpgradeHistory(incidentId: string): Promise<UpgradeHistoryData | null> {
  const { data: incident } = await supabase
    .from('incidents')
    .select(`
      source_observation_id,
      upgraded_to_incident_id,
      upgraded_at,
      upgraded_by,
      escalation_decision,
      escalation_decision_by,
      escalation_decision_at,
      escalation_decision_notes
    `)
    .eq('id', incidentId)
    .single();
  
  if (!incident || (!incident.source_observation_id && !incident.upgraded_to_incident_id)) return null;
  
  // Fetch related observation/incident reference IDs
  let sourceObsRef = null;
  let upgradedIncRef = null;
  let upgradedByName = null;
  let escalationDecisionByName = null;
  
  if (incident.source_observation_id) {
    const { data: sourceObs } = await supabase
      .from('incidents')
      .select('reference_id')
      .eq('id', incident.source_observation_id)
      .single();
    sourceObsRef = sourceObs?.reference_id;
  }
  
  if (incident.upgraded_to_incident_id) {
    const { data: upgradedInc } = await supabase
      .from('incidents')
      .select('reference_id')
      .eq('id', incident.upgraded_to_incident_id)
      .single();
    upgradedIncRef = upgradedInc?.reference_id;
  }
  
  const userIds = [incident.upgraded_by, incident.escalation_decision_by].filter(Boolean) as string[];
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
    const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
    upgradedByName = incident.upgraded_by ? profileMap.get(incident.upgraded_by) : null;
    escalationDecisionByName = incident.escalation_decision_by ? profileMap.get(incident.escalation_decision_by) : null;
  }
  
  return {
    source_observation_ref: sourceObsRef,
    upgraded_to_incident_ref: upgradedIncRef,
    upgraded_by_name: upgradedByName,
    upgraded_at: incident.upgraded_at,
    escalation_decision: incident.escalation_decision,
    escalation_decision_by_name: escalationDecisionByName,
    escalation_decision_at: incident.escalation_decision_at,
    escalation_decision_notes: incident.escalation_decision_notes
  };
}

async function fetchWorkflowDecisions(incidentId: string): Promise<WorkflowDecision[]> {
  // Use type casting to bypass TypeScript for dynamic columns
  const { data: incident } = await supabase
    .from('incidents')
    .select(`
      closure_request_notes,
      closure_approved_by,
      closure_approved_at,
      dept_rep_approved_by,
      dept_rep_approved_at,
      dept_rep_notes,
      expert_screened_by,
      expert_screened_at,
      expert_screening_notes,
      expert_recommendation,
      approval_manager_id,
      manager_decision,
      manager_decision_at,
      hsse_manager_decision,
      hsse_manager_decision_by,
      hsse_manager_justification,
      escalation_decision,
      escalation_decision_at,
      escalation_decision_by,
      escalation_decision_notes,
      hsse_validated_by,
      hsse_validated_at,
      hsse_validation_notes,
      hsse_validation_status
    `)
    .eq('id', incidentId)
    .single() as { data: {
      closure_request_notes?: string | null;
      closure_approved_by?: string | null;
      closure_approved_at?: string | null;
      dept_rep_approved_by?: string | null;
      dept_rep_approved_at?: string | null;
      dept_rep_notes?: string | null;
      expert_screened_by?: string | null;
      expert_screened_at?: string | null;
      expert_screening_notes?: string | null;
      expert_recommendation?: string | null;
      approval_manager_id?: string | null;
      manager_decision?: string | null;
      manager_decision_at?: string | null;
      hsse_manager_decision?: string | null;
      hsse_manager_decision_by?: string | null;
      hsse_manager_justification?: string | null;
      escalation_decision?: string | null;
      escalation_decision_at?: string | null;
      escalation_decision_by?: string | null;
      escalation_decision_notes?: string | null;
      hsse_validated_by?: string | null;
      hsse_validated_at?: string | null;
      hsse_validation_notes?: string | null;
      hsse_validation_status?: string | null;
    } | null };
  
  if (!incident) return [];
  
  const decisions: WorkflowDecision[] = [];
  
  // Collect all user IDs
  const userIds = [
    incident.closure_approved_by,
    incident.dept_rep_approved_by,
    incident.expert_screened_by,
    incident.approval_manager_id,
    incident.hsse_manager_decision_by,
    incident.escalation_decision_by,
    incident.hsse_validated_by
  ].filter(Boolean) as string[];
  
  let profileMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
    profiles?.forEach(p => profileMap.set(p.id, p.full_name));
  }
  
  // Dept Rep Approval
  if (incident.dept_rep_approved_by) {
    decisions.push({
      type: 'dept_rep_approval',
      decision_by: profileMap.get(incident.dept_rep_approved_by),
      decision_at: incident.dept_rep_approved_at,
      notes: incident.dept_rep_notes,
      status: 'approved'
    });
  }
  
  // HSSE Expert Screening
  if (incident.expert_screened_by) {
    decisions.push({
      type: 'hsse_expert_screening',
      decision_by: profileMap.get(incident.expert_screened_by),
      decision_at: incident.expert_screened_at,
      notes: incident.expert_screening_notes,
      status: incident.expert_recommendation || 'screened'
    });
  }
  
  // Manager Decision
  if (incident.manager_decision && incident.approval_manager_id) {
    decisions.push({
      type: 'manager_approval',
      decision_by: profileMap.get(incident.approval_manager_id),
      decision_at: incident.manager_decision_at,
      status: incident.manager_decision
    });
  }
  
  // HSSE Manager Escalation
  if (incident.hsse_manager_decision) {
    decisions.push({
      type: 'hsse_manager_escalation',
      decision_by: incident.hsse_manager_decision_by ? profileMap.get(incident.hsse_manager_decision_by) : null,
      decision_at: null,
      notes: incident.hsse_manager_justification,
      status: incident.hsse_manager_decision
    });
  }
  
  // Escalation Review
  if (incident.escalation_decision) {
    decisions.push({
      type: 'escalation_review',
      decision_by: incident.escalation_decision_by ? profileMap.get(incident.escalation_decision_by) : null,
      decision_at: incident.escalation_decision_at,
      notes: incident.escalation_decision_notes,
      status: incident.escalation_decision
    });
  }
  
  // HSSE Validation
  if (incident.hsse_validated_by) {
    decisions.push({
      type: 'hsse_validation',
      decision_by: profileMap.get(incident.hsse_validated_by),
      decision_at: incident.hsse_validated_at,
      notes: incident.hsse_validation_notes,
      status: incident.hsse_validation_status || 'validated'
    });
  }
  
  // Closure Approval
  if (incident.closure_approved_by) {
    decisions.push({
      type: 'closure_approval',
      decision_by: profileMap.get(incident.closure_approved_by),
      decision_at: incident.closure_approved_at,
      notes: incident.closure_request_notes
    });
  }
  
  return decisions;
}

async function fetchPropertyDamages(incidentId: string): Promise<PropertyDamageData[]> {
  const { data } = await supabase
    .from('incident_property_damages')
    .select('property_name, property_type, damage_severity, repair_cost_estimate, replacement_cost_estimate, cost_currency, damage_description, operational_impact, downtime_hours, repair_status, location_description, safety_hazard_created, safety_hazard_description')
    .eq('incident_id', incidentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  return (data || []) as PropertyDamageData[];
}

async function fetchEnvironmentalContaminations(incidentId: string): Promise<EnvironmentalContaminationData[]> {
  const { data } = await supabase
    .from('environmental_contamination_entries')
    .select('contaminant_name, contamination_types, hazard_classification, volume_released, area_affected_sqm, contaminated_volume_m3, spill_severity, containment_failure_percentage, regulatory_breach_flagged, population_exposed, total_environmental_cost, cost_severity, regulatory_fines')
    .eq('incident_id', incidentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  return (data || []) as EnvironmentalContaminationData[];
}

async function fetchWitnessStatements(incidentId: string): Promise<WitnessStatement[]> {
  const { data } = await supabase
    .from('witness_statements')
    .select('id, witness_name, statement_type, statement_text, created_at')
    .eq('incident_id', incidentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  return (data || []) as WitnessStatement[];
}

async function fetchRCAData(incidentId: string): Promise<RCAData | null> {
  const { data } = await supabase
    .from('rca_analyses' as never)
    .select('why_1, why_2, why_3, why_4, why_5, immediate_cause, underlying_cause')
    .eq('incident_id', incidentId)
    .maybeSingle() as { data: RCAData | null };
  
  if (!data) return null;

  const { data: rootCauses } = await supabase
    .from('rca_root_causes' as never)
    .select('id, description')
    .eq('incident_id', incidentId)
    .is('deleted_at', null) as { data: Array<{ id: string; description: string }> | null };

  const { data: contributingFactors } = await supabase
    .from('rca_contributing_factors' as never)
    .select('id, description')
    .eq('incident_id', incidentId)
    .is('deleted_at', null) as { data: Array<{ id: string; description: string }> | null };

  return {
    ...data,
    root_causes: rootCauses || [],
    contributing_factors: contributingFactors || []
  };
}

async function fetchCorrectiveActions(incidentId: string, fullDetails: boolean, includeEvidence: boolean = false): Promise<CorrectiveAction[]> {
  const { data } = await supabase
    .from('corrective_actions')
    .select('id, title, description, status, priority, category, action_type, due_date, start_date, completed_date, verified_at, assigned_to, responsible_department_id, verified_by')
    .eq('incident_id', incidentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  
  if (!data) return [];
  
  // Fetch assigned user names and departments
  const userIds = [...new Set([
    ...data.map(a => a.assigned_to).filter(Boolean),
    ...data.map(a => a.verified_by).filter(Boolean)
  ])] as string[];
  const deptIds = [...new Set(data.map(a => a.responsible_department_id).filter(Boolean))] as string[];
  
  const { data: profiles } = userIds.length > 0 
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  
  const { data: departments } = deptIds.length > 0
    ? await supabase.from('departments').select('id, name').in('id', deptIds)
    : { data: [] as Array<{ id: string; name: string }> };
  
  const profileMap = new Map<string, string>();
  profiles?.forEach(p => profileMap.set(p.id, p.full_name));
  
  const deptMap = new Map<string, string>();
  departments?.forEach(d => deptMap.set(d.id, d.name));
  
  // Fetch action evidence if needed
  let evidenceByAction = new Map<string, ActionEvidenceItem[]>();
  if (includeEvidence) {
    evidenceByAction = await fetchActionEvidence(data.map(a => a.id));
  }
  
  return data.map(a => ({
    id: a.id,
    title: a.title,
    description: fullDetails ? a.description : undefined,
    status: a.status || 'assigned',
    priority: a.priority,
    category: fullDetails ? a.category : undefined,
    action_type: fullDetails ? a.action_type : undefined,
    due_date: a.due_date,
    start_date: fullDetails ? a.start_date : undefined,
    completed_date: fullDetails ? a.completed_date : undefined,
    verified_at: fullDetails ? a.verified_at : undefined,
    assigned_user: a.assigned_to ? { full_name: profileMap.get(a.assigned_to) || 'Unknown' } : null,
    department: a.responsible_department_id ? { name: deptMap.get(a.responsible_department_id) || 'Unknown' } : null,
    verified_by_user: fullDetails && a.verified_by ? { full_name: profileMap.get(a.verified_by) || 'Unknown' } : null,
    evidence: evidenceByAction.get(a.id) || []
  })) as CorrectiveAction[];
}

async function fetchAuditLogs(incidentId: string, accessLevel: ReportAccessLevel, fullAuditLog: boolean = false): Promise<AuditLogEntry[]> {
  let query = supabase
    .from('incident_audit_logs')
    .select('action, actor_id, created_at, details, old_value, new_value')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: true });
  
  // For managers (non-full mode), filter to allowed actions only
  if (accessLevel === 'manager' && !fullAuditLog) {
    query = query.in('action', MANAGER_AUDIT_ACTIONS);
  }
  
  const { data } = await query;
  if (!data) return [];
  
  // Fetch actor names
  const actorIds = [...new Set(data.map(l => l.actor_id).filter(Boolean))] as string[];
  const { data: profiles } = actorIds.length > 0 
    ? await supabase.from('profiles').select('id, full_name').in('id', actorIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  
  const profileMap = new Map<string, string>();
  profiles?.forEach(p => profileMap.set(p.id, p.full_name));
  
  return data.map(log => ({
    action: formatAuditAction(log.action),
    actor_name: log.actor_id ? profileMap.get(log.actor_id) || 'System' : 'System',
    created_at: log.created_at,
    details: formatAuditDetails(log),
    old_value: log.old_value,
    new_value: log.new_value
  }));
}

function formatAuditAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function formatAuditDetails(log: { action: string; details?: unknown; old_value?: unknown; new_value?: unknown }): string {
  if (log.details && typeof log.details === 'object') {
    const details = log.details as Record<string, unknown>;
    if (details.reason) return String(details.reason);
    if (details.notes) return String(details.notes);
  }
  if (log.new_value && typeof log.new_value === 'object') {
    const newVal = log.new_value as Record<string, unknown>;
    if (newVal.status) return `Status: ${String(newVal.status).replace(/_/g, ' ')}`;
  }
  return '';
}

// ============= HTML Builders =============

function getSeverityStyle(severity: string | null | undefined): string {
  switch (severity) {
    case 'critical': return 'background: #fee2e2; color: #991b1b;';
    case 'high': return 'background: #ffedd5; color: #c2410c;';
    case 'medium': return 'background: #fef3c7; color: #92400e;';
    case 'low': return 'background: #dcfce7; color: #166534;';
    default: return 'background: #f5f5f5; color: #666;';
  }
}

function getStatusStyle(status: string | null | undefined): string {
  if (!status) return 'background: #f5f5f5; color: #666;';
  if (status === 'closed') return 'background: #dcfce7; color: #166534;';
  if (status.includes('pending') || status.includes('escalation')) return 'background: #fef3c7; color: #92400e;';
  if (status.includes('investigation')) return 'background: #dbeafe; color: #1e40af;';
  return 'background: #f3f4f6; color: #374151;';
}

// HSSE Event Type translations for PDF (inline since i18next not available)
const HSSE_EVENT_TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  safety: { en: 'Safety (Occupational Injury/Harm)', ar: 'السلامة (الإصابات المهنية)' },
  health: { en: 'Health (Illness/Exposure)', ar: 'الصحة (المرض/التعرض)' },
  process_safety: { en: 'Process Safety (LOPC/Fire/Explosion)', ar: 'سلامة العمليات (فقدان الاحتواء/حريق/انفجار)' },
  environment: { en: 'Environment (Spill/Emission/Waste)', ar: 'البيئة (تسرب/انبعاث/نفايات)' },
  security: { en: 'Security (People/Assets/Access/Threat)', ar: 'الأمن (الأفراد/الممتلكات/الوصول/التهديد)' },
  property_asset_damage: { en: 'Property & Asset Damage', ar: 'تلف الممتلكات والأصول' },
  road_traffic_vehicle: { en: 'Road Traffic/Vehicle & Mobile Equipment', ar: 'المرور والمركبات والمعدات المتنقلة' },
  quality_service: { en: 'Quality/Service Impact', ar: 'تأثير الجودة/الخدمة' },
  community_third_party: { en: 'Community/Third-Party Impact', ar: 'تأثير المجتمع/الأطراف الثالثة' },
  compliance_regulatory: { en: 'Compliance/Regulatory Breach', ar: 'خرق الامتثال/التنظيمات' },
  emergency_crisis: { en: 'Emergency/Crisis Activation', ar: 'تفعيل الطوارئ/الأزمات' },
};

// HSSE Subtype translations for PDF
const HSSE_SUBTYPE_LABELS: Record<string, { en: string; ar: string }> = {
  // Safety subtypes
  slip_trip_fall: { en: 'Slip, Trip, or Fall (Same Level)', ar: 'انزلاق أو تعثر أو سقوط (نفس المستوى)' },
  fall_from_height: { en: 'Fall from Height', ar: 'السقوط من ارتفاع' },
  struck_by: { en: 'Struck By Object', ar: 'الاصطدام بجسم' },
  caught_in_between: { en: 'Caught In/Between', ar: 'الانحشار بين/داخل' },
  manual_handling: { en: 'Manual Handling / Ergonomic', ar: 'المناولة اليدوية / بيئة العمل' },
  cut_laceration: { en: 'Cut / Laceration', ar: 'جرح / قطع' },
  eye_injury: { en: 'Eye Injury', ar: 'إصابة العين' },
  burn_scald: { en: 'Burn / Scald', ar: 'حرق / سلق' },
  electrical_shock: { en: 'Electrical Shock', ar: 'صدمة كهربائية' },
  dropped_object: { en: 'Dropped Object', ar: 'سقوط أجسام' },
  confined_space: { en: 'Confined Space Incident', ar: 'حادث أماكن محصورة' },
  tool_equipment_injury: { en: 'Tool / Equipment Injury', ar: 'إصابة بأداة / معدات' },
  // Health subtypes
  occupational_illness: { en: 'Occupational Illness', ar: 'مرض مهني' },
  chemical_exposure: { en: 'Chemical Exposure', ar: 'التعرض للمواد الكيميائية' },
  biological_exposure: { en: 'Biological Exposure', ar: 'التعرض البيولوجي' },
  noise_exposure: { en: 'Noise Exposure', ar: 'التعرض للضوضاء' },
  heat_stress: { en: 'Heat Stress / Cold Stress', ar: 'الإجهاد الحراري / البارد' },
  respiratory_exposure: { en: 'Respiratory Exposure', ar: 'التعرض التنفسي' },
  radiation_exposure: { en: 'Radiation Exposure', ar: 'التعرض للإشعاع' },
  ergonomic_disorder: { en: 'Ergonomic Disorder', ar: 'اضطراب بيئة العمل' },
  fatigue_related: { en: 'Fatigue-Related', ar: 'متعلق بالإرهاق' },
  medical_emergency: { en: 'Medical Emergency', ar: 'حالة طبية طارئة' },
  // Legacy incident types
  near_miss: { en: 'Near Miss', ar: 'حادث وشيك' },
  first_aid: { en: 'First Aid', ar: 'إسعافات أولية' },
  property_damage: { en: 'Property Damage', ar: 'تلف الممتلكات' },
  environmental: { en: 'Environmental', ar: 'بيئي' },
  security_breach: { en: 'Security Breach', ar: 'خرق أمني' },
  other: { en: 'Other', ar: 'أخرى' },
};

function getHSSEEventTypeLabel(type: string | null | undefined, isRTL: boolean): string {
  if (!type) return '-';
  const label = HSSE_EVENT_TYPE_LABELS[type];
  return label ? (isRTL ? label.ar : label.en) : type.replace(/_/g, ' ');
}

function getHSSESubtypeLabel(subtype: string | null | undefined, isRTL: boolean): string {
  if (!subtype) return '-';
  const label = HSSE_SUBTYPE_LABELS[subtype];
  return label ? (isRTL ? label.ar : label.en) : subtype.replace(/_/g, ' ');
}

function buildLegalDocumentHeader(incident: IncidentReportData['incident'], isRTL: boolean, generatedBy: string): string {
  const now = new Date();
  const timestamp = format(now, 'yyyy-MM-dd HH:mm:ss');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  return `
    <div style="margin-bottom: 20px; padding: 16px; background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); color: white; border-radius: 8px; text-align: center;">
      <div style="font-size: 10px; letter-spacing: 2px; margin-bottom: 8px; opacity: 0.9;">
        ${isRTL ? '⚖️ وثيقة قانونية رسمية ⚖️' : '⚖️ OFFICIAL LEGAL DOCUMENT ⚖️'}
      </div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 700;">
        ${isRTL ? 'تقرير الحادث/الملاحظة الشامل' : 'Comprehensive Incident/Observation Report'}
      </h1>
      <div style="margin-top: 12px; font-size: 11px; opacity: 0.9;">
        ${isRTL ? 'تم الإنشاء:' : 'Generated:'} ${timestamp} (${timezone})<br/>
        ${isRTL ? 'بواسطة:' : 'By:'} ${generatedBy}
      </div>
    </div>
  `;
}

function buildConfidentialityBanner(incident: IncidentReportData['incident'], isRTL: boolean): string {
  if (!incident.confidentiality_level || incident.confidentiality_level === 'none') return '';
  
  const levelColors: Record<string, string> = {
    confidential: 'background: #fef2f2; border-color: #dc2626; color: #991b1b;',
    restricted: 'background: #fffbeb; border-color: #d97706; color: #92400e;',
    internal: 'background: #f0f9ff; border-color: #0284c7; color: #075985;'
  };
  
  const levelLabels: Record<string, { en: string; ar: string }> = {
    confidential: { en: 'CONFIDENTIAL', ar: 'سري' },
    restricted: { en: 'RESTRICTED', ar: 'محدود' },
    internal: { en: 'INTERNAL ONLY', ar: 'للاستخدام الداخلي فقط' }
  };
  
  const style = levelColors[incident.confidentiality_level] || levelColors.internal;
  const label = levelLabels[incident.confidentiality_level] || levelLabels.internal;
  
  return `
    <div style="margin-bottom: 16px; padding: 10px 16px; border: 2px solid; border-radius: 6px; text-align: center; font-weight: 600; font-size: 12px; ${style}">
      🔒 ${isRTL ? label.ar : label.en}
      ${incident.confidentiality_expires_at ? `<br/><span style="font-size: 10px; font-weight: normal;">${isRTL ? 'ينتهي:' : 'Expires:'} ${format(new Date(incident.confidentiality_expires_at), 'PP')}</span>` : ''}
    </div>
  `;
}

function buildUpgradeHistoryHtml(upgradeHistory: UpgradeHistoryData | null, isRTL: boolean): string {
  if (!upgradeHistory) return '';
  
  const textAlign = isRTL ? 'right' : 'left';
  
  let content = '';
  
  if (upgradeHistory.source_observation_ref) {
    content += `
      <div style="margin-bottom: 16px; padding: 12px; background: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px;">
        <div style="font-weight: 600; color: #166534; margin-bottom: 8px;">
          🔗 ${isRTL ? 'تمت الترقية من ملاحظة' : 'Upgraded from Observation'}
        </div>
        <table style="width: 100%; font-size: 12px;">
          <tr>
            <td style="padding: 4px; width: 30%; color: #6b7280;">${isRTL ? 'المرجع الأصلي:' : 'Original Reference:'}</td>
            <td style="padding: 4px; font-weight: 600;">${upgradeHistory.source_observation_ref}</td>
          </tr>
          ${upgradeHistory.upgraded_by_name ? `
          <tr>
            <td style="padding: 4px; color: #6b7280;">${isRTL ? 'تمت الترقية بواسطة:' : 'Upgraded By:'}</td>
            <td style="padding: 4px;">${upgradeHistory.upgraded_by_name}</td>
          </tr>` : ''}
          ${upgradeHistory.upgraded_at ? `
          <tr>
            <td style="padding: 4px; color: #6b7280;">${isRTL ? 'تاريخ الترقية:' : 'Upgraded At:'}</td>
            <td style="padding: 4px;">${format(new Date(upgradeHistory.upgraded_at), 'PPpp')}</td>
          </tr>` : ''}
        </table>
      </div>
    `;
  }
  
  if (upgradeHistory.upgraded_to_incident_ref) {
    content += `
      <div style="margin-bottom: 16px; padding: 12px; background: #fff7ed; border: 1px solid #f97316; border-radius: 6px;">
        <div style="font-weight: 600; color: #c2410c; margin-bottom: 8px;">
          ⬆️ ${isRTL ? 'تمت ترقية هذه الملاحظة إلى حادث' : 'This Observation Was Upgraded to Incident'}
        </div>
        <table style="width: 100%; font-size: 12px;">
          <tr>
            <td style="padding: 4px; width: 30%; color: #6b7280;">${isRTL ? 'مرجع الحادث:' : 'Incident Reference:'}</td>
            <td style="padding: 4px; font-weight: 600;">${upgradeHistory.upgraded_to_incident_ref}</td>
          </tr>
        </table>
      </div>
    `;
  }
  
  if (upgradeHistory.escalation_decision) {
    content += `
      <div style="margin-bottom: 16px; padding: 12px; background: #faf5ff; border: 1px solid #a855f7; border-radius: 6px;">
        <div style="font-weight: 600; color: #7c3aed; margin-bottom: 8px;">
          📋 ${isRTL ? 'قرار التصعيد' : 'Escalation Decision'}
        </div>
        <table style="width: 100%; font-size: 12px;">
          <tr>
            <td style="padding: 4px; width: 30%; color: #6b7280;">${isRTL ? 'القرار:' : 'Decision:'}</td>
            <td style="padding: 4px; font-weight: 600;">${upgradeHistory.escalation_decision.replace(/_/g, ' ')}</td>
          </tr>
          ${upgradeHistory.escalation_decision_by_name ? `
          <tr>
            <td style="padding: 4px; color: #6b7280;">${isRTL ? 'بواسطة:' : 'By:'}</td>
            <td style="padding: 4px;">${upgradeHistory.escalation_decision_by_name}</td>
          </tr>` : ''}
          ${upgradeHistory.escalation_decision_at ? `
          <tr>
            <td style="padding: 4px; color: #6b7280;">${isRTL ? 'التاريخ:' : 'Date:'}</td>
            <td style="padding: 4px;">${format(new Date(upgradeHistory.escalation_decision_at), 'PPpp')}</td>
          </tr>` : ''}
          ${upgradeHistory.escalation_decision_notes ? `
          <tr>
            <td style="padding: 4px; color: #6b7280;">${isRTL ? 'الملاحظات:' : 'Notes:'}</td>
            <td style="padding: 4px;">${upgradeHistory.escalation_decision_notes}</td>
          </tr>` : ''}
        </table>
      </div>
    `;
  }
  
  if (!content) return '';
  
  return `
    <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #333; border-top: 2px solid #e5e7eb; padding-top: 16px;">
      ${isRTL ? 'سجل الترقية/التصعيد' : 'Upgrade/Escalation History'}
    </h3>
    ${content}
  `;
}

function buildWorkflowDecisionsHtml(decisions: WorkflowDecision[], isRTL: boolean): string {
  if (decisions.length === 0) return '';
  
  const decisionTypeLabels: Record<string, { en: string; ar: string }> = {
    dept_rep_approval: { en: 'Department Representative Approval', ar: 'موافقة ممثل القسم' },
    hsse_expert_screening: { en: 'HSSE Expert Screening', ar: 'فحص خبير HSSE' },
    manager_approval: { en: 'Manager Approval', ar: 'موافقة المدير' },
    hsse_manager_escalation: { en: 'HSSE Manager Escalation', ar: 'تصعيد مدير HSSE' },
    escalation_review: { en: 'Escalation Review', ar: 'مراجعة التصعيد' },
    initial_approval: { en: 'Initial Approval', ar: 'الموافقة الأولية' },
    closure_approval: { en: 'Closure Approval', ar: 'موافقة الإغلاق' }
  };
  
  return `
    <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #333; border-top: 2px solid #e5e7eb; padding-top: 16px;">
      ${isRTL ? 'قرارات سير العمل' : 'Workflow Decisions'}
    </h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: start;">${isRTL ? 'نوع القرار' : 'Decision Type'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: start;">${isRTL ? 'القرار/الحالة' : 'Decision/Status'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: start;">${isRTL ? 'بواسطة' : 'By'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">${isRTL ? 'التاريخ' : 'Date'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: start;">${isRTL ? 'الملاحظات' : 'Notes'}</th>
        </tr>
      </thead>
      <tbody>
        ${decisions.map(d => {
          const label = decisionTypeLabels[d.type] || { en: d.type, ar: d.type };
          return `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: 500;">${isRTL ? label.ar : label.en}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">
                ${d.status ? `<span style="padding: 2px 8px; border-radius: 4px; font-size: 10px; ${getStatusStyle(d.status)}">${d.status.replace(/_/g, ' ')}</span>` : '-'}
              </td>
              <td style="padding: 8px; border: 1px solid #ddd;">${d.decision_by || '-'}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${d.decision_at ? format(new Date(d.decision_at), 'PP p') : '-'}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; color: #6b7280;">${d.notes || '-'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function buildContractorViolationHtml(violation: ContractorViolationData | null, isRTL: boolean): string {
  if (!violation) return '';
  
  return `
    <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #333; border-top: 2px solid #e5e7eb; padding-top: 16px;">
      ${isRTL ? 'تفاصيل مخالفة المقاول' : 'Contractor Violation Details'}
    </h3>
    <div style="padding: 12px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px;">
      <table style="width: 100%; font-size: 12px;">
        <tr>
          <td style="padding: 6px; width: 30%; color: #6b7280; font-weight: 500;">${isRTL ? 'شركة المقاولات:' : 'Contractor Company:'}</td>
          <td style="padding: 6px; font-weight: 600;">${violation.contractor_company_name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 6px; color: #6b7280; font-weight: 500;">${isRTL ? 'فئة المخالفة:' : 'Violation Category:'}</td>
          <td style="padding: 6px;">${violation.violation_category?.replace(/_/g, ' ') || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 6px; color: #6b7280; font-weight: 500;">${isRTL ? 'العقوبة المطبقة:' : 'Penalty Applied:'}</td>
          <td style="padding: 6px;">${violation.penalty_applied || '-'}${violation.penalty_amount ? ` (${violation.penalty_amount})` : ''}</td>
        </tr>
        <tr>
          <td style="padding: 6px; color: #6b7280; font-weight: 500;">${isRTL ? 'حالة الإقرار:' : 'Acknowledgment Status:'}</td>
          <td style="padding: 6px;">
            <span style="padding: 2px 8px; border-radius: 4px; font-size: 10px; ${violation.acknowledgment_status === 'acknowledged' ? 'background: #dcfce7; color: #166534;' : 'background: #fef3c7; color: #92400e;'}">
              ${violation.acknowledgment_status?.replace(/_/g, ' ') || '-'}
            </span>
          </td>
        </tr>
        ${violation.acknowledged_by_name ? `
        <tr>
          <td style="padding: 6px; color: #6b7280; font-weight: 500;">${isRTL ? 'تم الإقرار بواسطة:' : 'Acknowledged By:'}</td>
          <td style="padding: 6px;">${violation.acknowledged_by_name}${violation.acknowledged_at ? ` (${format(new Date(violation.acknowledged_at), 'PPp')})` : ''}</td>
        </tr>
        ` : ''}
      </table>
    </div>
  `;
}

function buildBasicInfoHtml(incident: IncidentReportData['incident'], isRTL: boolean): string {
  const textAlign = isRTL ? 'right' : 'left';
  
  // Determine category and subcategory display
  const incidentCategory = incident.incident_type 
    ? getHSSEEventTypeLabel(incident.incident_type, isRTL)
    : incident.subtype 
      ? getHSSESubtypeLabel(incident.subtype, isRTL) 
      : '-';
  const incidentSubCategory = incident.subtype ? getHSSESubtypeLabel(incident.subtype, isRTL) : '-';
  
  return `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; width: 25%; text-align: ${textAlign};">${isRTL ? 'الرقم المرجعي' : 'Reference ID'}</td>
        <td style="padding: 10px; border: 1px solid #ddd; width: 25%;">${incident.reference_id || '-'}</td>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; width: 25%; text-align: ${textAlign};">${isRTL ? 'الحالة' : 'Status'}</td>
        <td style="padding: 10px; border: 1px solid #ddd; width: 25%;">
          <span style="padding: 4px 10px; border-radius: 4px; font-size: 11px; ${getStatusStyle(incident.status)}">
            ${incident.status?.replace(/_/g, ' ').toUpperCase() || '-'}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'نوع الحدث' : 'Event Type'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${isRTL ? (incident.event_type === 'incident' ? 'حادث' : 'ملاحظة') : (incident.event_type === 'incident' ? 'Incident' : 'Observation')}</td>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'الخطورة الفعلية' : 'Actual Severity'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">
          <span style="padding: 4px 10px; border-radius: 4px; font-size: 11px; ${getSeverityStyle(incident.severity)}">
            ${incident.severity?.toUpperCase() || '-'}
          </span>
        </td>
      </tr>
      ${incident.potential_severity ? `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'الخطورة المحتملة' : 'Potential Severity'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;" colspan="3">
          <span style="padding: 4px 10px; border-radius: 4px; font-size: 11px; ${getSeverityStyle(incident.potential_severity)}">
            ${incident.potential_severity?.toUpperCase() || '-'}
          </span>
          <span style="margin-inline-start: 8px; font-size: 11px; color: #6b7280;">(${isRTL ? 'أسوأ سيناريو' : 'worst-case scenario'})</span>
        </td>
      </tr>
      ` : ''}
      ${incident.event_type === 'incident' ? `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'فئة الحادث' : 'Incident Category'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${incidentCategory}</td>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'الفئة الفرعية للحادث' : 'Incident Sub Category'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${incidentSubCategory}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'تاريخ الحدوث' : 'Occurred At'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${incident.occurred_at ? format(new Date(incident.occurred_at), 'PPpp') : '-'}</td>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'المُبلّغ' : 'Reporter'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${incident.reporter?.full_name || '-'}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'الفرع' : 'Branch'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${incident.branch?.name || '-'}</td>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'الموقع' : 'Site'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${incident.site?.name || '-'}</td>
      </tr>
      ${incident.department_info ? `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'القسم' : 'Department'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;" colspan="3">${incident.department_info.name}</td>
      </tr>
      ` : ''}
      ${incident.location ? `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'تفاصيل الموقع' : 'Location Details'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;" colspan="3">${incident.location}</td>
      </tr>
      ` : ''}
      ${incident.latitude && incident.longitude ? `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'الإحداثيات GPS' : 'GPS Coordinates'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;" colspan="3" style="font-family: monospace;">${incident.latitude.toFixed(6)}, ${incident.longitude.toFixed(6)}</td>
      </tr>
      ` : ''}
      ${incident.created_at ? `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'تاريخ الإنشاء' : 'Created At'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;" colspan="3">${format(new Date(incident.created_at), 'PPpp')}</td>
      </tr>
      ` : ''}
    </table>
    
    <h3 style="margin: 20px 0 10px; font-size: 14px; font-weight: 600; color: #333;">${isRTL ? 'الوصف' : 'Description'}</h3>
    <div style="padding: 12px; border: 1px solid #ddd; border-radius: 4px; background: #f9fafb; white-space: pre-wrap; font-size: 13px;">
      ${incident.description || '-'}
    </div>
    
    ${incident.immediate_actions ? `
    <h3 style="margin: 20px 0 10px; font-size: 14px; font-weight: 600; color: #333;">${isRTL ? 'الإجراءات الفورية' : 'Immediate Actions'}</h3>
    <div style="padding: 12px; border: 1px solid #ddd; border-radius: 4px; background: #f9fafb; white-space: pre-wrap; font-size: 13px;">
      ${incident.immediate_actions}
    </div>
    ` : ''}
    
    ${incident.has_injury && incident.injury_details ? `
    <h3 style="margin: 20px 0 10px; font-size: 14px; font-weight: 600; color: #d97706;">${isRTL ? 'تفاصيل الإصابة' : 'Injury Details'}</h3>
    <div style="padding: 12px; border: 1px solid #fbbf24; border-radius: 4px; background: #fffbeb; font-size: 13px;">
      ${incident.injury_details?.count ? `<p><strong>${isRTL ? 'عدد المصابين:' : 'Injured Count:'}</strong> ${incident.injury_details.count}</p>` : ''}
      ${incident.injury_details?.description ? `<p>${incident.injury_details.description}</p>` : ''}
    </div>
    ` : ''}
    
    ${incident.has_damage && incident.damage_details ? `
    <h3 style="margin: 20px 0 10px; font-size: 14px; font-weight: 600; color: #ea580c;">${isRTL ? 'تفاصيل الأضرار' : 'Damage Details'}</h3>
    <div style="padding: 12px; border: 1px solid #fb923c; border-radius: 4px; background: #fff7ed; font-size: 13px;">
      ${incident.damage_details?.description ? `<p>${incident.damage_details.description}</p>` : ''}
      ${incident.damage_details?.estimated_cost ? `<p><strong>${isRTL ? 'التكلفة التقديرية:' : 'Estimated Cost:'}</strong> ${incident.damage_details.estimated_cost}</p>` : ''}
    </div>
    ` : ''}
  `;
}

function buildManagerActionsHtml(actions: CorrectiveAction[], isRTL: boolean): string {
  if (actions.length === 0) return '';
  
  const textAlign = isRTL ? 'right' : 'left';
  
  return `
    <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #333; border-top: 2px solid #e5e7eb; padding-top: 16px;">
      ${isRTL ? 'الإجراءات التصحيحية' : 'Corrective Actions'} (${actions.length})
    </h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'العنوان' : 'Title'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'المسؤول' : 'Owner'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'القسم' : 'Department'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">${isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">${isRTL ? 'الحالة' : 'Status'}</th>
        </tr>
      </thead>
      <tbody>
        ${actions.map(a => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${a.title}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${a.assigned_user?.full_name || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${a.department?.name || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${a.due_date ? format(new Date(a.due_date), 'PP') : '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
              <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; ${getActionStatusStyle(a.status)}">
                ${a.status.replace(/_/g, ' ')}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function getActionStatusStyle(status: string): string {
  if (status === 'verified' || status === 'closed') return 'background: #dcfce7; color: #166534;';
  if (status === 'completed') return 'background: #fef3c7; color: #92400e;';
  if (status === 'in_progress') return 'background: #dbeafe; color: #1e40af;';
  return 'background: #e2e8f0; color: #475569;';
}

function buildFullEvidenceHtml(evidence: EvidenceItem[], isRTL: boolean, fullLegalMode: boolean = false): string {
  if (evidence.length === 0) return '';
  
  const textAlign = isRTL ? 'right' : 'left';
  
  return `
    <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #333; border-top: 2px solid #e5e7eb; padding-top: 16px;">
      ${isRTL ? 'الأدلة المجمعة' : 'Evidence Collected'} (${evidence.length})
    </h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 5%;">#</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign}; width: 12%;">${isRTL ? 'النوع' : 'Type'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign}; width: 20%;">${isRTL ? 'الملف' : 'File'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign}; width: 25%;">${isRTL ? 'الوصف' : 'Description'}</th>
          ${fullLegalMode ? `<th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign}; width: 15%;">${isRTL ? 'رُفع بواسطة' : 'Uploaded By'}</th>` : ''}
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 13%;">${isRTL ? 'التاريخ' : 'Date'}</th>
          ${fullLegalMode ? `<th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 10%;">${isRTL ? 'المراجعة' : 'Review'}</th>` : ''}
        </tr>
      </thead>
      <tbody>
        ${evidence.map((e, i) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${i + 1}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; background: #e2e8f0; color: #475569;">
                ${e.evidence_type.replace(/_/g, ' ')}
              </span>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; word-break: break-word;">${e.file_name || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${e.description || '-'}</td>
            ${fullLegalMode ? `<td style="padding: 8px; border: 1px solid #ddd; font-size: 11px;">${e.uploaded_by_name || '-'}</td>` : ''}
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${e.created_at ? format(new Date(e.created_at), 'PP p') : '-'}</td>
            ${fullLegalMode ? `
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
              ${e.is_reviewed 
                ? `<span style="color: #16a34a; font-size: 10px;">✓ ${e.reviewed_by_name || ''}</span>`
                : `<span style="color: #9ca3af; font-size: 10px;">${isRTL ? 'معلق' : 'Pending'}</span>`
              }
            </td>
            ` : ''}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function buildFullWitnessesHtml(witnesses: WitnessStatement[], isRTL: boolean): string {
  if (witnesses.length === 0) return '';
  
  return `
    <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #333; border-top: 2px solid #e5e7eb; padding-top: 16px;">
      ${isRTL ? 'إفادات الشهود' : 'Witness Statements'} (${witnesses.length})
    </h3>
    ${witnesses.map((w, i) => `
      <div style="margin-bottom: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 6px; background: #fafafa;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <strong style="color: #333;">${i + 1}. ${w.witness_name}</strong>
          <span style="font-size: 11px; color: #666;">${w.created_at ? format(new Date(w.created_at), 'PPp') : ''}</span>
        </div>
        <div style="margin-bottom: 4px;">
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; background: #dbeafe; color: #1e40af;">
            ${w.statement_type.replace(/_/g, ' ')}
          </span>
        </div>
        ${w.statement_text ? `
          <div style="margin-top: 8px; padding: 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; white-space: pre-wrap; font-size: 12px; line-height: 1.5;">
            ${w.statement_text}
          </div>
        ` : ''}
      </div>
    `).join('')}
  `;
}

function buildFullRCAHtml(rca: RCAData, isRTL: boolean): string {
  const paddingDir = isRTL ? 'padding-right' : 'padding-left';
  
  return `
    <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #333; border-top: 2px solid #e5e7eb; padding-top: 16px;">
      ${isRTL ? 'تحليل السبب الجذري' : 'Root Cause Analysis'}
    </h3>
    
    ${rca.why_1 || rca.why_2 || rca.why_3 || rca.why_4 || rca.why_5 ? `
    <h4 style="margin: 12px 0 8px; font-size: 13px; font-weight: 600; color: #4b5563;">${isRTL ? 'طريقة الـ 5 لماذا' : '5 Whys Analysis'}</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
      ${[1, 2, 3, 4, 5].map(n => {
        const why = rca[`why_${n}` as keyof RCAData] as string | null;
        return why ? `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; background: #f0f9ff; font-weight: 600; width: 12%; color: #0369a1;">${isRTL ? 'لماذا' : 'Why'} ${n}</td>
          <td style="padding: 10px; border: 1px solid #ddd; line-height: 1.4;">${why}</td>
        </tr>
        ` : '';
      }).join('')}
    </table>
    ` : ''}
    
    ${rca.immediate_cause ? `
    <div style="margin-bottom: 12px;">
      <strong style="color: #dc2626; font-size: 13px;">${isRTL ? 'السبب المباشر:' : 'Immediate Cause:'}</strong>
      <p style="margin: 6px 0 0; padding: 10px; border: 1px solid #fecaca; border-radius: 4px; background: #fef2f2; line-height: 1.4;">${rca.immediate_cause}</p>
    </div>
    ` : ''}
    
    ${rca.underlying_cause ? `
    <div style="margin-bottom: 12px;">
      <strong style="color: #ea580c; font-size: 13px;">${isRTL ? 'السبب الكامن:' : 'Underlying Cause:'}</strong>
      <p style="margin: 6px 0 0; padding: 10px; border: 1px solid #fed7aa; border-radius: 4px; background: #fff7ed; line-height: 1.4;">${rca.underlying_cause}</p>
    </div>
    ` : ''}
    
    ${rca.root_causes && rca.root_causes.length > 0 ? `
    <div style="margin-bottom: 12px;">
      <strong style="color: #7c3aed; font-size: 13px;">${isRTL ? 'الأسباب الجذرية:' : 'Root Causes:'}</strong>
      <ul style="margin: 6px 0 0; ${paddingDir}: 24px; line-height: 1.6;">
        ${rca.root_causes.map(rc => `<li style="margin-bottom: 6px;">${rc.description}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    ${rca.contributing_factors && rca.contributing_factors.length > 0 ? `
    <div style="margin-bottom: 12px;">
      <strong style="color: #0891b2; font-size: 13px;">${isRTL ? 'العوامل المساهمة:' : 'Contributing Factors:'}</strong>
      <ul style="margin: 6px 0 0; ${paddingDir}: 24px; line-height: 1.6;">
        ${rca.contributing_factors.map(cf => `<li style="margin-bottom: 6px;">${cf.description}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  `;
}

function buildFullActionsHtml(actions: CorrectiveAction[], isRTL: boolean, includeEvidence: boolean = false): string {
  if (actions.length === 0) return '';
  
  return `
    <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #333; border-top: 2px solid #e5e7eb; padding-top: 16px;">
      ${isRTL ? 'الإجراءات التصحيحية والوقائية' : 'Corrective & Preventive Actions'} (${actions.length})
    </h3>
    ${actions.map((a, i) => `
      <div style="margin-bottom: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 6px; background: #fafafa;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div style="flex: 1;">
            <strong style="color: #333; font-size: 13px;">${i + 1}. ${a.title}</strong>
            ${a.description ? `<p style="margin: 6px 0 0; font-size: 12px; color: #4b5563; line-height: 1.4;">${a.description}</p>` : ''}
          </div>
          <span style="padding: 2px 8px; border-radius: 4px; font-size: 10px; ${getActionStatusStyle(a.status)}; white-space: nowrap; margin-inline-start: 12px;">
            ${a.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; font-size: 11px;">
          <div>
            <span style="color: #6b7280;">${isRTL ? 'المسؤول:' : 'Owner:'}</span>
            <span style="color: #1f2937; margin-inline-start: 4px;">${a.assigned_user?.full_name || '-'}</span>
          </div>
          <div>
            <span style="color: #6b7280;">${isRTL ? 'القسم:' : 'Department:'}</span>
            <span style="color: #1f2937; margin-inline-start: 4px;">${a.department?.name || '-'}</span>
          </div>
          <div>
            <span style="color: #6b7280;">${isRTL ? 'الأولوية:' : 'Priority:'}</span>
            <span style="color: #1f2937; margin-inline-start: 4px;">${a.priority || '-'}</span>
          </div>
          <div>
            <span style="color: #6b7280;">${isRTL ? 'تاريخ البدء:' : 'Start:'}</span>
            <span style="color: #1f2937; margin-inline-start: 4px;">${a.start_date ? format(new Date(a.start_date), 'PP') : '-'}</span>
          </div>
          <div>
            <span style="color: #6b7280;">${isRTL ? 'تاريخ الاستحقاق:' : 'Due:'}</span>
            <span style="color: #1f2937; margin-inline-start: 4px;">${a.due_date ? format(new Date(a.due_date), 'PP') : '-'}</span>
          </div>
          <div>
            <span style="color: #6b7280;">${isRTL ? 'تاريخ الإكمال:' : 'Completed:'}</span>
            <span style="color: #1f2937; margin-inline-start: 4px;">${a.completed_date ? format(new Date(a.completed_date), 'PP') : '-'}</span>
          </div>
          ${a.verified_at ? `
          <div style="grid-column: span 3; margin-top: 4px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <span style="color: #16a34a;">✓ ${isRTL ? 'تم التحقق بواسطة:' : 'Verified by:'}</span>
            <span style="color: #1f2937; margin-inline-start: 4px;">${a.verified_by_user?.full_name || '-'} ${isRTL ? 'في' : 'on'} ${format(new Date(a.verified_at), 'PP')}</span>
          </div>
          ` : ''}
        </div>
        ${includeEvidence && a.evidence && a.evidence.length > 0 ? `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #d1d5db;">
          <div style="font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 6px;">
            📎 ${isRTL ? 'أدلة الإجراء' : 'Action Evidence'} (${a.evidence.length})
          </div>
          <ul style="margin: 0; padding-inline-start: 16px; font-size: 11px; color: #4b5563;">
            ${a.evidence.map(ev => `
              <li style="margin-bottom: 4px;">
                ${ev.file_name}
                ${ev.description ? ` - ${ev.description}` : ''}
                <span style="color: #9ca3af; margin-inline-start: 4px;">(${ev.created_at ? format(new Date(ev.created_at), 'PP') : '-'})</span>
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
    `).join('')}
  `;
}

function buildAuditLogHtml(logs: AuditLogEntry[], accessLevel: ReportAccessLevel, isRTL: boolean, isFullAuditLog: boolean = false): string {
  if (logs.length === 0) return '';
  
  const title = isFullAuditLog 
    ? (isRTL ? 'سجل المراجعة الكامل (مسار التدقيق القانوني)' : 'Complete Audit Trail (Legal Audit Log)')
    : accessLevel === 'hsse_full' 
      ? (isRTL ? 'سجل المراجعة الكامل' : 'Complete Audit Trail')
      : (isRTL ? 'سجل المراجعة' : 'Audit Log');
  
  const textAlign = isRTL ? 'right' : 'left';
  
  return `
    <div style="page-break-before: always;">
      <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #333; border-bottom: 2px solid #333; padding-bottom: 8px;">
        ${title}
      </h3>
      ${isFullAuditLog ? `
      <div style="margin-bottom: 16px; padding: 10px; background: #f0f9ff; border: 1px solid #0284c7; border-radius: 6px; font-size: 11px; color: #075985;">
        ${isRTL 
          ? '⚠️ هذا السجل يحتوي على جميع الإجراءات المنفذة على هذا السجل، بما في ذلك المشاهدات والتعديلات والتحديثات. يُعد هذا السجل وثيقة قانونية لأغراض التدقيق.'
          : '⚠️ This log contains ALL actions performed on this record, including views, edits, and updates. This serves as a legal audit document for compliance purposes.'}
      </div>
      ` : ''}
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 18%;">${isRTL ? 'التاريخ والوقت' : 'Date/Time'}</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign}; width: 20%;">${isRTL ? 'المستخدم' : 'User'}</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign}; width: 25%;">${isRTL ? 'الإجراء' : 'Action'}</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign}; width: 37%;">${isRTL ? 'التفاصيل' : 'Details'}</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => `
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center; font-size: 10px;">${format(new Date(log.created_at), 'PP p')}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd;">${log.actor_name}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd;">${log.action}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; color: #6b7280;">${log.details || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 16px; font-size: 10px; color: #6b7280; text-align: center;">
        ${isRTL ? `إجمالي الإدخالات: ${logs.length}` : `Total Entries: ${logs.length}`}
      </div>
    </div>
  `;
}

function buildInvestigationHtml(investigation: InvestigationData, isRTL: boolean): string {
  const textAlign = isRTL ? 'right' : 'left';
  
  return `
    <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #333; border-top: 2px solid #e5e7eb; padding-top: 16px;">
      ${isRTL ? 'تفاصيل التحقيق' : 'Investigation Details'}
    </h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; width: 25%; text-align: ${textAlign};">${isRTL ? 'المحقق' : 'Investigator'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${investigation.investigator?.full_name || '-'}</td>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; width: 25%; text-align: ${textAlign};">${isRTL ? 'تاريخ البدء' : 'Started'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${investigation.started_at ? format(new Date(investigation.started_at), 'PPp') : '-'}</td>
      </tr>
      ${investigation.completed_at ? `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'تاريخ الإكمال' : 'Completed'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;" colspan="3">${format(new Date(investigation.completed_at), 'PPp')}</td>
      </tr>
      ` : ''}
    </table>
  `;
}

// Property damage severity and impact labels for PDF
const PROPERTY_DAMAGE_LABELS: Record<string, { en: string; ar: string }> = {
  // Property types
  equipment: { en: 'Equipment', ar: 'معدات' },
  vehicle: { en: 'Vehicle', ar: 'مركبة' },
  structure: { en: 'Structure', ar: 'مبنى' },
  infrastructure: { en: 'Infrastructure', ar: 'بنية تحتية' },
  material: { en: 'Material', ar: 'مواد' },
  other: { en: 'Other', ar: 'أخرى' },
  // Severity
  minor: { en: 'Minor', ar: 'طفيف' },
  moderate: { en: 'Moderate', ar: 'متوسط' },
  major: { en: 'Major', ar: 'كبير' },
  total_loss: { en: 'Total Loss', ar: 'خسارة كلية' },
  // Impact
  none: { en: 'None', ar: 'لا يوجد' },
  minimal: { en: 'Minimal', ar: 'ضئيل' },
  significant: { en: 'Significant', ar: 'كبير' },
  critical: { en: 'Critical', ar: 'حرج' },
  // Status
  pending: { en: 'Pending', ar: 'قيد الانتظار' },
  in_progress: { en: 'In Progress', ar: 'جاري الإصلاح' },
  completed: { en: 'Completed', ar: 'مكتمل' },
  not_repairable: { en: 'Not Repairable', ar: 'غير قابل للإصلاح' },
};

function getPropertyDamageLabel(code: string | null, isRTL: boolean): string {
  if (!code) return '-';
  const label = PROPERTY_DAMAGE_LABELS[code];
  return label ? (isRTL ? label.ar : label.en) : code.replace(/_/g, ' ');
}

function getSeverityBadgeStyle(severity: string | null): string {
  switch (severity) {
    case 'total_loss': return 'background: #fecaca; color: #991b1b;';
    case 'major': return 'background: #fee2e2; color: #dc2626;';
    case 'moderate': return 'background: #ffedd5; color: #ea580c;';
    case 'minor': return 'background: #fef3c7; color: #d97706;';
    default: return 'background: #e2e8f0; color: #475569;';
  }
}

function buildEnvironmentalContaminationsHtml(entries: EnvironmentalContaminationData[], isRTL: boolean): string {
  if (entries.length === 0) return '';
  
  const textAlign = isRTL ? 'right' : 'left';
  const totalCost = entries.reduce((sum, e) => sum + (e.total_environmental_cost || 0), 0);
  const breachCount = entries.filter(e => e.regulatory_breach_flagged).length;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { 
      style: 'currency', 
      currency: 'SAR',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  return `
    <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #16a34a; border-top: 2px solid #e5e7eb; padding-top: 16px;">
      🌿 ${isRTL ? 'الأثر البيئي' : 'Environmental Impact'} (${entries.length})
    </h3>
    
    <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 120px; padding: 10px; background: #dcfce7; border: 1px solid #86efac; border-radius: 6px; text-align: center;">
        <div style="font-size: 18px; font-weight: 700; color: #166534;">${entries.length}</div>
        <div style="font-size: 10px; color: #14532d;">${isRTL ? 'سجلات التلوث' : 'Contamination Records'}</div>
      </div>
      <div style="flex: 1; min-width: 120px; padding: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; text-align: center;">
        <div style="font-size: 14px; font-weight: 700; color: #dc2626;">${formatCurrency(totalCost)}</div>
        <div style="font-size: 10px; color: #991b1b;">${isRTL ? 'التكلفة البيئية' : 'Environmental Cost'}</div>
      </div>
      ${breachCount > 0 ? `
      <div style="flex: 1; min-width: 120px; padding: 10px; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; text-align: center;">
        <div style="font-size: 18px; font-weight: 700; color: #d97706;">${breachCount}</div>
        <div style="font-size: 10px; color: #92400e;">${isRTL ? 'مخالفات تنظيمية' : 'Regulatory Breaches'}</div>
      </div>
      ` : ''}
    </div>
    
    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 5%;">#</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign}; width: 25%;">${isRTL ? 'الملوث' : 'Contaminant'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 15%;">${isRTL ? 'الحجم' : 'Volume'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 15%;">${isRTL ? 'المساحة' : 'Area'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 15%;">${isRTL ? 'الشدة' : 'Severity'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 15%;">${isRTL ? 'التكلفة' : 'Cost'}</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map((e, i) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: 600;">${i + 1}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <div style="font-weight: 600;">${e.contaminant_name}</div>
              ${e.contamination_types?.length ? `<div style="font-size: 10px; color: #6b7280;">${e.contamination_types.join(', ')}</div>` : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${e.volume_released ? `${e.volume_released} m³` : '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${e.area_affected_sqm ? `${e.area_affected_sqm} m²` : '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
              <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; ${
                e.spill_severity === 'tier_3_major' ? 'background: #fecaca; color: #991b1b;' :
                e.spill_severity === 'tier_2_moderate' ? 'background: #ffedd5; color: #ea580c;' :
                'background: #fef3c7; color: #d97706;'
              }">${e.spill_severity?.replace(/_/g, ' ') || '-'}</span>
              ${e.regulatory_breach_flagged ? `<div style="margin-top: 4px; font-size: 9px; color: #dc2626;">⚠️ ${isRTL ? 'مخالفة' : 'Breach'}</div>` : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: 500;">${e.total_environmental_cost ? formatCurrency(e.total_environmental_cost) : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function buildPropertyDamagesHtml(damages: PropertyDamageData[], isRTL: boolean): string {
  if (damages.length === 0) return '';
  
  const textAlign = isRTL ? 'right' : 'left';
  const totalRepairCost = damages.reduce((sum, d) => sum + (d.repair_cost_estimate || 0), 0);
  const totalReplacementCost = damages.reduce((sum, d) => sum + (d.replacement_cost_estimate || 0), 0);
  const totalDowntime = damages.reduce((sum, d) => sum + (d.downtime_hours || 0), 0);
  const currency = damages[0]?.cost_currency || 'SAR';
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { 
      style: 'currency', 
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  return `
    <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #ea580c; border-top: 2px solid #e5e7eb; padding-top: 16px;">
      🔧 ${isRTL ? 'أضرار الممتلكات' : 'Property Damage'} (${damages.length})
    </h3>
    
    <!-- Summary Stats -->
    <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 120px; padding: 10px; background: #fff7ed; border: 1px solid #fb923c; border-radius: 6px; text-align: center;">
        <div style="font-size: 18px; font-weight: 700; color: #ea580c;">${damages.length}</div>
        <div style="font-size: 10px; color: #9a3412;">${isRTL ? 'إجمالي المتضرر' : 'Total Damaged'}</div>
      </div>
      <div style="flex: 1; min-width: 120px; padding: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; text-align: center;">
        <div style="font-size: 14px; font-weight: 700; color: #dc2626;">${formatCurrency(totalRepairCost + totalReplacementCost)}</div>
        <div style="font-size: 10px; color: #991b1b;">${isRTL ? 'التكلفة التقديرية' : 'Est. Cost'}</div>
      </div>
      <div style="flex: 1; min-width: 120px; padding: 10px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 6px; text-align: center;">
        <div style="font-size: 18px; font-weight: 700; color: #0369a1;">${totalDowntime}h</div>
        <div style="font-size: 10px; color: #0c4a6e;">${isRTL ? 'إجمالي التوقف' : 'Total Downtime'}</div>
      </div>
    </div>
    
    <!-- Damage Details Table -->
    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 5%;">#</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign}; width: 22%;">${isRTL ? 'الممتلكات' : 'Property'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 12%;">${isRTL ? 'النوع' : 'Type'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 12%;">${isRTL ? 'الخطورة' : 'Severity'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 15%;">${isRTL ? 'تكلفة الإصلاح' : 'Repair Cost'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 10%;">${isRTL ? 'الأثر' : 'Impact'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 12%;">${isRTL ? 'الحالة' : 'Status'}</th>
        </tr>
      </thead>
      <tbody>
        ${damages.map((d, i) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: 600;">${i + 1}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <div style="font-weight: 600;">${d.property_name}</div>
              ${d.location_description ? `<div style="font-size: 10px; color: #6b7280;">${d.location_description}</div>` : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
              <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; background: #e2e8f0; color: #475569;">
                ${getPropertyDamageLabel(d.property_type, isRTL)}
              </span>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
              <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; ${getSeverityBadgeStyle(d.damage_severity)}">
                ${getPropertyDamageLabel(d.damage_severity, isRTL)}
              </span>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: 500;">
              ${d.repair_cost_estimate ? formatCurrency(d.repair_cost_estimate) : '-'}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
              ${getPropertyDamageLabel(d.operational_impact, isRTL)}
              ${d.downtime_hours > 0 ? `<div style="font-size: 9px; color: #6b7280;">${d.downtime_hours}h</div>` : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
              <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; ${
                d.repair_status === 'completed' ? 'background: #dcfce7; color: #166534;' :
                d.repair_status === 'in_progress' ? 'background: #dbeafe; color: #1e40af;' :
                d.repair_status === 'not_repairable' ? 'background: #fee2e2; color: #991b1b;' :
                'background: #f3f4f6; color: #6b7280;'
              }">
                ${getPropertyDamageLabel(d.repair_status, isRTL)}
              </span>
            </td>
          </tr>
          ${d.damage_description ? `
          <tr>
            <td style="border: 1px solid #ddd;"></td>
            <td style="padding: 6px 8px; border: 1px solid #ddd; font-size: 10px; color: #4b5563; background: #fafafa;" colspan="6">
              <strong>${isRTL ? 'الوصف:' : 'Description:'}</strong> ${d.damage_description}
              ${d.safety_hazard_created ? `<span style="margin-inline-start: 8px; padding: 2px 6px; background: #fef2f2; color: #dc2626; border-radius: 4px; font-size: 9px;">⚠️ ${isRTL ? 'خطر سلامة' : 'Safety Hazard'}</span>` : ''}
            </td>
          </tr>
          ` : ''}
        `).join('')}
      </tbody>
    </table>
    
    <!-- Total Row -->
    <div style="padding: 10px; background: #f9fafb; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; display: flex; justify-content: space-between;">
      <span style="font-weight: 600;">${isRTL ? 'إجمالي التكلفة التقديرية:' : 'Total Estimated Cost:'}</span>
      <span style="font-weight: 700; color: #dc2626;">${formatCurrency(totalRepairCost + totalReplacementCost)}</span>
    </div>
  `;
}

function buildDocumentIntegrityFooter(incident: IncidentReportData['incident'], isRTL: boolean): string {
  const now = new Date();
  const documentId = `${incident.reference_id || incident.id}-${now.getTime()}`;
  
  return `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #1e3a5f;">
      <div style="display: flex; justify-content: space-between; font-size: 10px; color: #6b7280;">
        <div>
          <strong>${isRTL ? 'معرف الوثيقة:' : 'Document ID:'}</strong> ${documentId}
        </div>
        <div>
          <strong>${isRTL ? 'تم الإنشاء:' : 'Generated:'}</strong> ${format(now, 'yyyy-MM-dd HH:mm:ss')}
        </div>
      </div>
      <div style="margin-top: 12px; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 10px; color: #4b5563; text-align: center;">
        ${isRTL 
          ? 'هذه الوثيقة تم إنشاؤها إلكترونياً وتُعتبر سجلاً رسمياً. أي تعديل غير مصرح به يُعد انتهاكاً لسياسة الشركة.'
          : 'This document was electronically generated and constitutes an official record. Any unauthorized modification is a violation of company policy.'}
      </div>
    </div>
  `;
}

// ============= Main Export Function =============

export async function generateIncidentReportPDF(data: IncidentReportData): Promise<void> {
  const { incident, tenantId, userId, language = 'en', fullLegalMode = false, includeFullAuditLog = false } = data;
  const isRTL = language === 'ar';

  // Determine access level based on user role
  const accessLevel = await getReportAccessLevel(userId);
  const isLegalDocument = fullLegalMode || includeFullAuditLog;
  const reportType = isLegalDocument ? 'legal' : (accessLevel === 'hsse_full' ? 'full' : 'summary');

  // Fetch tenant info and document settings
  const [tenantInfo, settings] = await Promise.all([
    fetchTenantInfo(tenantId),
    fetchDocumentSettings(tenantId)
  ]);

  const tenantName = tenantInfo?.name || 'Organization';
  const logoUrl = tenantInfo?.logo_light_url;

  // Preload logo with dimensions for proper aspect ratio
  const logoData = logoUrl ? await preloadImageWithDimensions(logoUrl) : null;

  // Fetch current user name for document header
  const { data: currentUser } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single();
  const generatedByName = currentUser?.full_name || 'Unknown';

  // Define sections based on access level and mode
  const sections = {
    showLegalHeader: isLegalDocument,
    showConfidentialityBanner: isLegalDocument,
    showBasicInfo: true,
    showUpgradeHistory: isLegalDocument || accessLevel === 'hsse_full',
    showWorkflowDecisions: isLegalDocument || accessLevel === 'hsse_full',
    showContractorViolation: isLegalDocument || accessLevel === 'hsse_full',
    showInvestigation: accessLevel === 'hsse_full' || isLegalDocument,
    showEvidence: accessLevel === 'hsse_full' || isLegalDocument,
    showWitnesses: accessLevel === 'hsse_full' || isLegalDocument,
    showRCA: accessLevel === 'hsse_full' || isLegalDocument,
    showActionsBasic: accessLevel === 'manager' && !isLegalDocument,
    showActionsFull: accessLevel === 'hsse_full' || isLegalDocument,
    showAuditLog: true,
    showDocumentIntegrity: isLegalDocument,
    includeActionEvidence: fullLegalMode,
    includeEvidenceUploaders: fullLegalMode,
    showPropertyDamages: incident.has_damage && (accessLevel === 'hsse_full' || isLegalDocument),
  };

  // Fetch data based on sections needed
  let investigation: InvestigationData | null = null;
  let evidence: EvidenceItem[] = [];
  let witnesses: WitnessStatement[] = [];
  let rca: RCAData | null = null;
  let actions: CorrectiveAction[] = [];
  let auditLogs: AuditLogEntry[] = [];
  let workflowDecisions: WorkflowDecision[] = [];
  let contractorViolation: ContractorViolationData | null = null;
  let upgradeHistory: UpgradeHistoryData | null = null;
  let propertyDamages: PropertyDamageData[] = [];

  // Parallel data fetching
  const fetchPromises: Promise<unknown>[] = [];

  if (sections.showInvestigation) {
    fetchPromises.push(
      fetchInvestigationData(incident.id).then(r => { investigation = r; })
    );
  }
  if (sections.showEvidence) {
    fetchPromises.push(
      fetchEvidenceItems(incident.id, sections.includeEvidenceUploaders).then(r => { evidence = r; })
    );
  }
  if (sections.showWitnesses) {
    fetchPromises.push(
      fetchWitnessStatements(incident.id).then(r => { witnesses = r; })
    );
  }
  if (sections.showRCA) {
    fetchPromises.push(
      fetchRCAData(incident.id).then(r => { rca = r; })
    );
  }
  if (sections.showActionsBasic || sections.showActionsFull) {
    fetchPromises.push(
      fetchCorrectiveActions(incident.id, sections.showActionsFull, sections.includeActionEvidence).then(r => { actions = r; })
    );
  }
  if (sections.showAuditLog) {
    fetchPromises.push(
      fetchAuditLogs(incident.id, accessLevel, includeFullAuditLog).then(r => { auditLogs = r; })
    );
  }
  if (sections.showWorkflowDecisions) {
    fetchPromises.push(
      fetchWorkflowDecisions(incident.id).then(r => { workflowDecisions = r; })
    );
  }
  if (sections.showContractorViolation && incident.related_contractor_company_id) {
    fetchPromises.push(
      fetchContractorViolation(incident.id).then(r => { contractorViolation = r; })
    );
  }
  if (sections.showUpgradeHistory) {
    fetchPromises.push(
      fetchUpgradeHistory(incident.id).then(r => { upgradeHistory = r; })
    );
  }
  if (sections.showPropertyDamages) {
    fetchPromises.push(
      fetchPropertyDamages(incident.id).then(r => { propertyDamages = r; })
    );
  }

  await Promise.all(fetchPromises);

  // Create PDF container
  const container = createPDFRenderContainer();
  container.style.direction = isRTL ? 'rtl' : 'ltr';

  // Build HTML content sections
  const legalHeaderHtml = sections.showLegalHeader ? buildLegalDocumentHeader(incident, isRTL, generatedByName) : '';
  const confidentialityBannerHtml = sections.showConfidentialityBanner ? buildConfidentialityBanner(incident, isRTL) : '';
  const basicInfoHtml = buildBasicInfoHtml(incident, isRTL);
  const upgradeHistoryHtml = sections.showUpgradeHistory ? buildUpgradeHistoryHtml(upgradeHistory, isRTL) : '';
  const workflowDecisionsHtml = sections.showWorkflowDecisions && workflowDecisions.length > 0 ? buildWorkflowDecisionsHtml(workflowDecisions, isRTL) : '';
  const contractorViolationHtml = sections.showContractorViolation ? buildContractorViolationHtml(contractorViolation, isRTL) : '';
  const investigationHtml = sections.showInvestigation && investigation ? buildInvestigationHtml(investigation, isRTL) : '';
  const evidenceHtml = sections.showEvidence ? buildFullEvidenceHtml(evidence, isRTL, fullLegalMode) : '';
  const witnessesHtml = sections.showWitnesses ? buildFullWitnessesHtml(witnesses, isRTL) : '';
  const rcaHtml = sections.showRCA && rca ? buildFullRCAHtml(rca, isRTL) : '';
  const actionsHtml = sections.showActionsFull 
    ? buildFullActionsHtml(actions, isRTL, sections.includeActionEvidence) 
    : (sections.showActionsBasic ? buildManagerActionsHtml(actions, isRTL) : '');
  const auditLogHtml = sections.showAuditLog ? buildAuditLogHtml(auditLogs, accessLevel, isRTL, includeFullAuditLog) : '';
  const propertyDamagesHtml = sections.showPropertyDamages ? buildPropertyDamagesHtml(propertyDamages, isRTL) : '';
  const documentIntegrityHtml = sections.showDocumentIntegrity ? buildDocumentIntegrityFooter(incident, isRTL) : '';

  // Report type badge for title section
  const reportTypeLabel = isLegalDocument
    ? (isRTL ? 'وثيقة قانونية كاملة' : 'Full Legal Document')
    : accessLevel === 'hsse_full' 
      ? (isRTL ? 'التقرير الكامل للتحقيق' : 'Full Investigation Report')
      : (isRTL ? 'تقرير ملخص' : 'Summary Report');

  // Manager restricted notice (only for non-legal mode)
  const restrictedNotice = accessLevel === 'manager' && !isLegalDocument ? `
    <div style="margin: 16px 0; padding: 12px; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; font-size: 12px; color: #92400e;">
      ${isRTL 
        ? 'ملاحظة: هذا تقرير ملخص. للحصول على التفاصيل الكاملة بما في ذلك التحقيقات والأدلة وتحليل السبب الجذري، يرجى التواصل مع فريق HSSE.'
        : 'Note: This is a summary report. For full details including investigation, evidence, and root cause analysis, please contact the HSSE team.'}
    </div>
  ` : '';

  // Build content-only HTML
  container.innerHTML = `
    <div style="font-family: 'Rubik', Arial, sans-serif; color: #333;">
      ${legalHeaderHtml}
      ${confidentialityBannerHtml}
      
      ${!isLegalDocument ? `
      <div style="text-align: center; margin-bottom: 20px; padding: 14px; background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 8px; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280; font-weight: 500;">${isRTL ? 'عنوان الحدث' : 'Event Title'}</p>
        <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #1f2937;">${incident.title}</h2>
        <p style="margin: 6px 0 0; font-size: 13px; color: #6b7280;">${incident.reference_id || ''}</p>
        <span style="display: inline-block; margin-top: 8px; padding: 4px 12px; background: ${accessLevel === 'hsse_full' ? '#dcfce7' : '#fef3c7'}; color: ${accessLevel === 'hsse_full' ? '#166534' : '#92400e'}; border-radius: 4px; font-size: 11px; font-weight: 600;">
          ${reportTypeLabel}
        </span>
      </div>
      ` : `
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #1f2937;">${incident.title}</h2>
        <p style="margin: 6px 0 0; font-size: 13px; color: #6b7280;">${incident.reference_id || ''}</p>
      </div>
      `}
      
      ${restrictedNotice}
      ${basicInfoHtml}
      ${upgradeHistoryHtml}
      ${workflowDecisionsHtml}
      ${contractorViolationHtml}
      ${investigationHtml}
      ${propertyDamagesHtml}
      ${evidenceHtml}
      ${witnessesHtml}
      ${rcaHtml}
      ${actionsHtml}
      ${auditLogHtml}
      ${documentIntegrityHtml}
    </div>
  `;

  try {
    // Use branded PDF generator with per-page header, footer, and watermark
    const filenamePrefix = isLegalDocument ? 'legal' : reportType;
    await generateBrandedPDFFromElement(container, {
      filename: `incident-${filenamePrefix}-report-${incident.reference_id || incident.id}.pdf`,
      margin: 15,
      quality: 2,
      header: {
        logoBase64: logoData?.base64,
        logoWidth: logoData?.width,
        logoHeight: logoData?.height,
        logoPosition: settings?.headerLogoPosition || 'left',
        primaryText: settings?.headerTextPrimary || tenantName,
        secondaryText: settings?.headerTextSecondary || (isRTL ? 'تقرير الحادث' : 'Incident Report'),
        bgColor: settings?.headerBgColor || '#ffffff',
        textColor: settings?.headerTextColor || '#1f2937',
      },
      footer: {
        text: settings?.footerText || 'Confidential - Generated by Dhuud Gatekeeper',
        showPageNumbers: settings?.showPageNumbers ?? true,
        showDatePrinted: settings?.showDatePrinted ?? true,
        bgColor: settings?.footerBgColor || '#f3f4f6',
        textColor: settings?.footerTextColor || '#6b7280',
      },
      watermark: {
        text: isLegalDocument ? (isRTL ? 'وثيقة قانونية' : 'LEGAL DOCUMENT') : settings?.watermarkText,
        enabled: isLegalDocument || (settings?.watermarkEnabled ?? false),
        opacity: settings?.watermarkOpacity ?? 15,
      },
      isRTL: isRTL,
    });
  } finally {
    removePDFRenderContainer(container);
  }
}
