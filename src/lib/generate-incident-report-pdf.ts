import { generatePDFFromElement, createPDFRenderContainer, removePDFRenderContainer } from './pdf-utils';
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
    severity?: string | null;
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
  };
  tenantId: string;
  userId: string;
  language?: 'en' | 'ar';
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
}

interface AuditLogEntry {
  action: string;
  actor_name: string;
  actor_role?: string;
  created_at: string;
  details?: string;
}

interface TenantInfo {
  name: string;
  logo_light_url?: string | null;
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
    .select('investigator:investigator_id(full_name), started_at, completed_at, assignment_notes')
    .eq('incident_id', incidentId)
    .maybeSingle();
  return data as InvestigationData | null;
}

async function fetchEvidenceItems(incidentId: string): Promise<EvidenceItem[]> {
  const { data } = await supabase
    .from('evidence_items')
    .select('id, evidence_type, description, file_name, created_at')
    .eq('incident_id', incidentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  return (data || []) as EvidenceItem[];
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

async function fetchCorrectiveActions(incidentId: string, fullDetails: boolean): Promise<CorrectiveAction[]> {
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
    verified_by_user: fullDetails && a.verified_by ? { full_name: profileMap.get(a.verified_by) || 'Unknown' } : null
  })) as CorrectiveAction[];
}

async function fetchAuditLogs(incidentId: string, accessLevel: ReportAccessLevel): Promise<AuditLogEntry[]> {
  let query = supabase
    .from('incident_audit_logs')
    .select('action, actor_id, created_at, details, old_value, new_value')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: true });
  
  // For managers, filter to allowed actions only
  if (accessLevel === 'manager') {
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
    details: formatAuditDetails(log)
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

function buildHeaderHtml(
  logoUrl: string | null | undefined, 
  settings: DocumentBrandingSettings | null, 
  tenantName: string, 
  isRTL: boolean,
  accessLevel: ReportAccessLevel
): string {
  const headerBg = settings?.headerBgColor || '#ffffff';
  const textColor = settings?.headerTextColor || '#1f2937';
  const logoPosition = settings?.headerLogoPosition || 'left';
  const showLogo = settings?.showLogo !== false && logoUrl;
  
  const primaryText = settings?.headerTextPrimary || tenantName;
  const secondaryText = settings?.headerTextSecondary || (isRTL ? 'تقرير الحادث' : 'Incident Report');
  
  const reportTypeLabel = accessLevel === 'hsse_full' 
    ? (isRTL ? 'التقرير الكامل للتحقيق' : 'Full Investigation Report')
    : (isRTL ? 'تقرير ملخص' : 'Summary Report');

  const flexDirection = logoPosition === 'right' ? 'flex-row-reverse' : 'flex-row';
  
  return `
    <div style="background: ${headerBg}; padding: 20px 24px; margin-bottom: 24px; border-bottom: 3px solid #e5e7eb;">
      <div style="display: flex; ${flexDirection}; align-items: center; justify-content: space-between; gap: 16px;">
        ${showLogo ? `
          <img src="${logoUrl}" alt="Logo" style="height: 60px; max-width: 200px; object-fit: contain;" crossorigin="anonymous" />
        ` : '<div></div>'}
        <div style="text-align: ${isRTL ? 'right' : 'left'}; color: ${textColor};">
          <h1 style="margin: 0; font-size: 20px; font-weight: bold;">${primaryText}</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">${secondaryText}</p>
          <span style="display: inline-block; margin-top: 8px; padding: 4px 12px; background: ${accessLevel === 'hsse_full' ? '#dcfce7' : '#fef3c7'}; color: ${accessLevel === 'hsse_full' ? '#166534' : '#92400e'}; border-radius: 4px; font-size: 11px; font-weight: 600;">
            ${reportTypeLabel}
          </span>
        </div>
      </div>
    </div>
  `;
}

function buildFooterHtml(settings: DocumentBrandingSettings | null, isRTL: boolean): string {
  const footerBg = settings?.footerBgColor || '#f3f4f6';
  const footerColor = settings?.footerTextColor || '#6b7280';
  const footerText = settings?.footerText || 'Confidential - Generated by Dhuud Gatekeeper';
  
  return `
    <div style="margin-top: 40px; padding: 16px 24px; background: ${footerBg}; border-top: 2px solid #e5e7eb; font-size: 10px; color: ${footerColor}; display: flex; justify-content: space-between;">
      <span>${footerText}</span>
      <span>${isRTL ? 'تاريخ الطباعة:' : 'Printed:'} ${format(new Date(), 'PPP p')}</span>
    </div>
  `;
}

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

function buildBasicInfoHtml(incident: IncidentReportData['incident'], isRTL: boolean): string {
  const textAlign = isRTL ? 'right' : 'left';
  
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
        <td style="padding: 10px; border: 1px solid #ddd;">${incident.event_type || '-'}</td>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; text-align: ${textAlign};">${isRTL ? 'الخطورة' : 'Severity'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">
          <span style="padding: 4px 10px; border-radius: 4px; font-size: 11px; ${getSeverityStyle(incident.severity)}">
            ${incident.severity?.toUpperCase() || '-'}
          </span>
        </td>
      </tr>
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

function buildFullEvidenceHtml(evidence: EvidenceItem[], isRTL: boolean): string {
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
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign}; width: 15%;">${isRTL ? 'النوع' : 'Type'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign}; width: 25%;">${isRTL ? 'الملف' : 'File'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign}; width: 40%;">${isRTL ? 'الوصف' : 'Description'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 15%;">${isRTL ? 'التاريخ' : 'Date'}</th>
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
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11px;">${e.created_at ? format(new Date(e.created_at), 'PP') : '-'}</td>
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

function buildFullActionsHtml(actions: CorrectiveAction[], isRTL: boolean): string {
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
      </div>
    `).join('')}
  `;
}

function buildAuditLogHtml(logs: AuditLogEntry[], accessLevel: ReportAccessLevel, isRTL: boolean): string {
  if (logs.length === 0) return '';
  
  const title = accessLevel === 'hsse_full' 
    ? (isRTL ? 'سجل المراجعة الكامل' : 'Complete Audit Trail')
    : (isRTL ? 'سجل المراجعة' : 'Audit Log');
  
  const textAlign = isRTL ? 'right' : 'left';
  
  return `
    <div style="page-break-before: always;">
      <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #333; border-bottom: 2px solid #333; padding-bottom: 8px;">
        ${title}
      </h3>
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

// ============= Main Export Function =============

export async function generateIncidentReportPDF(data: IncidentReportData): Promise<void> {
  const { incident, tenantId, userId, language = 'en' } = data;
  const isRTL = language === 'ar';

  // Determine access level based on user role
  const accessLevel = await getReportAccessLevel(userId);

  // Fetch tenant info and document settings
  const [tenantInfo, settings] = await Promise.all([
    fetchTenantInfo(tenantId),
    fetchDocumentSettings(tenantId)
  ]);

  const tenantName = tenantInfo?.name || 'Organization';
  const logoUrl = tenantInfo?.logo_light_url;

  // Define sections based on access level
  const sections = {
    showBasicInfo: true,
    showInvestigation: accessLevel === 'hsse_full',
    showEvidence: accessLevel === 'hsse_full',
    showWitnesses: accessLevel === 'hsse_full',
    showRCA: accessLevel === 'hsse_full',
    showActionsBasic: accessLevel === 'manager',
    showActionsFull: accessLevel === 'hsse_full',
    showAuditLog: true, // Both roles see audit log (filtered for managers)
  };

  // Fetch data based on sections needed
  let investigation: InvestigationData | null = null;
  let evidence: EvidenceItem[] = [];
  let witnesses: WitnessStatement[] = [];
  let rca: RCAData | null = null;
  let actions: CorrectiveAction[] = [];
  let auditLogs: AuditLogEntry[] = [];

  // Parallel data fetching
  const fetchPromises: Promise<unknown>[] = [];

  if (sections.showInvestigation || sections.showEvidence || sections.showWitnesses || sections.showRCA) {
    fetchPromises.push(
      fetchInvestigationData(incident.id).then(r => { investigation = r; })
    );
  }
  if (sections.showEvidence) {
    fetchPromises.push(
      fetchEvidenceItems(incident.id).then(r => { evidence = r; })
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
      fetchCorrectiveActions(incident.id, sections.showActionsFull).then(r => { actions = r; })
    );
  }
  if (sections.showAuditLog) {
    fetchPromises.push(
      fetchAuditLogs(incident.id, accessLevel).then(r => { auditLogs = r; })
    );
  }

  await Promise.all(fetchPromises);

  // Create PDF container
  const container = createPDFRenderContainer();
  container.style.direction = isRTL ? 'rtl' : 'ltr';

  // Build HTML content
  const headerHtml = buildHeaderHtml(logoUrl, settings, tenantName, isRTL, accessLevel);
  const basicInfoHtml = buildBasicInfoHtml(incident, isRTL);
  const investigationHtml = sections.showInvestigation && investigation ? buildInvestigationHtml(investigation, isRTL) : '';
  const evidenceHtml = sections.showEvidence ? buildFullEvidenceHtml(evidence, isRTL) : '';
  const witnessesHtml = sections.showWitnesses ? buildFullWitnessesHtml(witnesses, isRTL) : '';
  const rcaHtml = sections.showRCA && rca ? buildFullRCAHtml(rca, isRTL) : '';
  const actionsHtml = sections.showActionsFull 
    ? buildFullActionsHtml(actions, isRTL) 
    : (sections.showActionsBasic ? buildManagerActionsHtml(actions, isRTL) : '');
  const auditLogHtml = sections.showAuditLog ? buildAuditLogHtml(auditLogs, accessLevel, isRTL) : '';
  const footerHtml = buildFooterHtml(settings, isRTL);

  // Manager restricted notice
  const restrictedNotice = accessLevel === 'manager' ? `
    <div style="margin: 16px 0; padding: 12px; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; font-size: 12px; color: #92400e;">
      ${isRTL 
        ? 'ملاحظة: هذا تقرير ملخص. للحصول على التفاصيل الكاملة بما في ذلك التحقيقات والأدلة وتحليل السبب الجذري، يرجى التواصل مع فريق HSSE.'
        : 'Note: This is a summary report. For full details including investigation, evidence, and root cause analysis, please contact the HSSE team.'}
    </div>
  ` : '';

  container.innerHTML = `
    <div style="font-family: 'Rubik', Arial, sans-serif; color: #333;">
      ${headerHtml}
      
      <div style="text-align: center; margin-bottom: 20px; padding: 14px; background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 8px; border: 1px solid #e5e7eb;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #1f2937;">${incident.title}</h2>
        <p style="margin: 6px 0 0; font-size: 13px; color: #6b7280;">${incident.reference_id || ''}</p>
      </div>
      
      ${restrictedNotice}
      ${basicInfoHtml}
      ${investigationHtml}
      ${evidenceHtml}
      ${witnessesHtml}
      ${rcaHtml}
      ${actionsHtml}
      ${auditLogHtml}
      ${footerHtml}
    </div>
  `;

  try {
    const reportType = accessLevel === 'hsse_full' ? 'full' : 'summary';
    await generatePDFFromElement(container, {
      filename: `incident-${reportType}-report-${incident.reference_id || incident.id}.pdf`,
      margin: 15,
      quality: 2,
    });
  } finally {
    removePDFRenderContainer(container);
  }
}
