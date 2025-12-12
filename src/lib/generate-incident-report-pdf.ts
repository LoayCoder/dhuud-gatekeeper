import { generatePDFFromElement, createPDFRenderContainer, removePDFRenderContainer } from './pdf-utils';
import { fetchDocumentSettings } from '@/hooks/use-document-branding';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

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
  tenantName?: string;
  language?: 'en' | 'ar';
}

interface InvestigationData {
  investigator?: { full_name: string } | null;
  started_at?: string | null;
  completed_at?: string | null;
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
  status: string;
  priority?: string | null;
  due_date?: string | null;
  assigned_user?: { full_name: string } | null;
}

async function fetchInvestigationData(incidentId: string): Promise<InvestigationData | null> {
  const { data } = await supabase
    .from('investigations')
    .select('investigator:investigator_id(full_name), started_at, completed_at')
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
    .select('id, witness_name, statement_type, created_at')
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

  // Fetch root causes and contributing factors
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

async function fetchCorrectiveActions(incidentId: string): Promise<CorrectiveAction[]> {
  const { data } = await supabase
    .from('corrective_actions')
    .select('id, title, status, priority, due_date, assigned_to')
    .eq('incident_id', incidentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  
  if (!data) return [];
  
  // Fetch assigned user names separately
  const userIds = data.map(a => a.assigned_to).filter(Boolean) as string[];
  const { data: profiles } = userIds.length > 0 
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  
  const profileMap = new Map<string, string>();
  profiles?.forEach(p => profileMap.set(p.id, p.full_name));
  
  return data.map(a => ({
    id: a.id,
    title: a.title,
    status: a.status || 'assigned',
    priority: a.priority,
    due_date: a.due_date,
    assigned_user: a.assigned_to ? { full_name: profileMap.get(a.assigned_to) || 'Unknown' } : null
  })) as CorrectiveAction[];
}

// Determine which sections to include based on status
function getReportSections(status: string | null | undefined) {
  const closureStages = ['pending_closure', 'investigation_closed', 'pending_final_closure', 'closed'];
  const investigationStages = ['investigation_in_progress', ...closureStages];
  
  return {
    showBasicInfo: true,
    showEvidence: investigationStages.includes(status || ''),
    showWitnesses: investigationStages.includes(status || ''),
    showRCA: closureStages.includes(status || ''),
    showActions: closureStages.includes(status || ''),
    showClosureInfo: status === 'closed'
  };
}

export async function generateIncidentReportPDF(data: IncidentReportData): Promise<void> {
  const { incident, tenantId, tenantName = 'Organization', language = 'en' } = data;
  const isRTL = language === 'ar';
  const sections = getReportSections(incident.status);

  // Fetch additional data based on sections needed
  let investigation: InvestigationData | null = null;
  let evidence: EvidenceItem[] = [];
  let witnesses: WitnessStatement[] = [];
  let rca: RCAData | null = null;
  let actions: CorrectiveAction[] = [];

  if (sections.showEvidence || sections.showWitnesses || sections.showRCA || sections.showActions) {
    investigation = await fetchInvestigationData(incident.id);
  }
  if (sections.showEvidence) {
    evidence = await fetchEvidenceItems(incident.id);
  }
  if (sections.showWitnesses) {
    witnesses = await fetchWitnessStatements(incident.id);
  }
  if (sections.showRCA) {
    rca = await fetchRCAData(incident.id);
  }
  if (sections.showActions) {
    actions = await fetchCorrectiveActions(incident.id);
  }

  // Fetch document branding settings
  const settings = await fetchDocumentSettings(tenantId);
  
  const container = createPDFRenderContainer();
  container.style.direction = isRTL ? 'rtl' : 'ltr';
  
  const primaryText = settings?.headerTextPrimary || tenantName;
  const secondaryText = settings?.headerTextSecondary || (isRTL ? 'تقرير حادث' : 'Incident Report');
  
  // Build severity color
  const getSeverityStyle = (severity: string | null | undefined) => {
    switch (severity) {
      case 'critical': return 'background: #fee2e2; color: #991b1b;';
      case 'high': return 'background: #ffedd5; color: #c2410c;';
      case 'medium': return 'background: #fef3c7; color: #92400e;';
      case 'low': return 'background: #dcfce7; color: #166534;';
      default: return 'background: #f5f5f5; color: #666;';
    }
  };

  // Basic info section
  const basicInfoHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; width: 25%;">${isRTL ? 'الرقم المرجعي' : 'Reference ID'}</td>
        <td style="padding: 10px; border: 1px solid #ddd; width: 25%;">${incident.reference_id || '-'}</td>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; width: 25%;">${isRTL ? 'الحالة' : 'Status'}</td>
        <td style="padding: 10px; border: 1px solid #ddd; width: 25%;">
          <span style="padding: 4px 10px; border-radius: 4px; font-size: 11px; ${getSeverityStyle(null)}">
            ${incident.status?.replace(/_/g, ' ').toUpperCase() || '-'}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'نوع الحدث' : 'Event Type'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${incident.event_type || '-'}</td>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'الخطورة' : 'Severity'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">
          <span style="padding: 4px 10px; border-radius: 4px; font-size: 11px; ${getSeverityStyle(incident.severity)}">
            ${incident.severity?.toUpperCase() || '-'}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'تاريخ الحدوث' : 'Occurred At'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${incident.occurred_at ? format(new Date(incident.occurred_at), 'PPpp') : '-'}</td>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'المُبلّغ' : 'Reporter'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${incident.reporter?.full_name || '-'}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'الفرع' : 'Branch'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${incident.branch?.name || '-'}</td>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'الموقع' : 'Site'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${incident.site?.name || '-'}</td>
      </tr>
      ${incident.department_info ? `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'القسم' : 'Department'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;" colspan="3">${incident.department_info.name}</td>
      </tr>
      ` : ''}
      ${incident.location ? `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'تفاصيل الموقع' : 'Location Details'}</td>
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
      ${(incident.injury_details as Record<string, unknown>)?.count ? `<p><strong>${isRTL ? 'عدد المصابين:' : 'Injured Count:'}</strong> ${(incident.injury_details as Record<string, unknown>).count}</p>` : ''}
      ${(incident.injury_details as Record<string, unknown>)?.description ? `<p>${(incident.injury_details as Record<string, unknown>).description}</p>` : ''}
    </div>
    ` : ''}
    
    ${incident.has_damage && incident.damage_details ? `
    <h3 style="margin: 20px 0 10px; font-size: 14px; font-weight: 600; color: #ea580c;">${isRTL ? 'تفاصيل الأضرار' : 'Damage Details'}</h3>
    <div style="padding: 12px; border: 1px solid #fb923c; border-radius: 4px; background: #fff7ed; font-size: 13px;">
      ${(incident.damage_details as Record<string, unknown>)?.description ? `<p>${(incident.damage_details as Record<string, unknown>).description}</p>` : ''}
      ${(incident.damage_details as Record<string, unknown>)?.estimated_cost ? `<p><strong>${isRTL ? 'التكلفة التقديرية:' : 'Estimated Cost:'}</strong> ${(incident.damage_details as Record<string, unknown>).estimated_cost}</p>` : ''}
    </div>
    ` : ''}
  `;

  // Investigation section
  const investigationHtml = investigation ? `
    <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #333; border-top: 2px solid #e5e7eb; padding-top: 16px;">${isRTL ? 'تفاصيل التحقيق' : 'Investigation Details'}</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; width: 25%;">${isRTL ? 'المحقق' : 'Investigator'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${investigation.investigator?.full_name || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; width: 25%;">${isRTL ? 'تاريخ البدء' : 'Started'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${investigation.started_at ? format(new Date(investigation.started_at), 'PPp') : '-'}</td>
      </tr>
    </table>
  ` : '';

  // Evidence section
  const evidenceHtml = evidence.length > 0 ? `
    <h3 style="margin: 20px 0 10px; font-size: 14px; font-weight: 600; color: #333;">${isRTL ? 'الأدلة المجمعة' : 'Evidence Collected'} (${evidence.length})</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">#</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'النوع' : 'Type'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'الملف' : 'File'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'الوصف' : 'Description'}</th>
        </tr>
      </thead>
      <tbody>
        ${evidence.map((e, i) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${i + 1}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${e.evidence_type}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${e.file_name || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${e.description || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  // Witnesses section
  const witnessesHtml = witnesses.length > 0 ? `
    <h3 style="margin: 20px 0 10px; font-size: 14px; font-weight: 600; color: #333;">${isRTL ? 'إفادات الشهود' : 'Witness Statements'} (${witnesses.length})</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">#</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'اسم الشاهد' : 'Witness Name'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'نوع الإفادة' : 'Statement Type'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'التاريخ' : 'Date'}</th>
        </tr>
      </thead>
      <tbody>
        ${witnesses.map((w, i) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${i + 1}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${w.witness_name}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${w.statement_type}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${w.created_at ? format(new Date(w.created_at), 'PP') : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  // RCA section
  const rcaHtml = rca ? `
    <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #333; border-top: 2px solid #e5e7eb; padding-top: 16px;">${isRTL ? 'تحليل السبب الجذري' : 'Root Cause Analysis'}</h3>
    
    ${rca.why_1 || rca.why_2 || rca.why_3 || rca.why_4 || rca.why_5 ? `
    <h4 style="margin: 12px 0 8px; font-size: 13px; font-weight: 600;">${isRTL ? 'طريقة الـ 5 لماذا' : '5 Whys Analysis'}</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
      ${[1, 2, 3, 4, 5].map(n => {
        const why = rca[`why_${n}` as keyof RCAData] as string | null;
        return why ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; width: 15%;">${isRTL ? 'لماذا' : 'Why'} ${n}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${why}</td>
        </tr>
        ` : '';
      }).join('')}
    </table>
    ` : ''}
    
    ${rca.immediate_cause ? `
    <div style="margin-bottom: 12px;">
      <strong style="color: #dc2626;">${isRTL ? 'السبب المباشر:' : 'Immediate Cause:'}</strong>
      <p style="margin: 4px 0 0; padding: 8px; border: 1px solid #fecaca; border-radius: 4px; background: #fef2f2;">${rca.immediate_cause}</p>
    </div>
    ` : ''}
    
    ${rca.underlying_cause ? `
    <div style="margin-bottom: 12px;">
      <strong style="color: #ea580c;">${isRTL ? 'السبب الكامن:' : 'Underlying Cause:'}</strong>
      <p style="margin: 4px 0 0; padding: 8px; border: 1px solid #fed7aa; border-radius: 4px; background: #fff7ed;">${rca.underlying_cause}</p>
    </div>
    ` : ''}
    
    ${rca.root_causes && rca.root_causes.length > 0 ? `
    <div style="margin-bottom: 12px;">
      <strong style="color: #7c3aed;">${isRTL ? 'الأسباب الجذرية:' : 'Root Causes:'}</strong>
      <ul style="margin: 4px 0 0; padding-${isRTL ? 'right' : 'left'}: 20px;">
        ${rca.root_causes.map(rc => `<li style="margin-bottom: 4px;">${rc.description}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    ${rca.contributing_factors && rca.contributing_factors.length > 0 ? `
    <div style="margin-bottom: 12px;">
      <strong style="color: #0891b2;">${isRTL ? 'العوامل المساهمة:' : 'Contributing Factors:'}</strong>
      <ul style="margin: 4px 0 0; padding-${isRTL ? 'right' : 'left'}: 20px;">
        ${rca.contributing_factors.map(cf => `<li style="margin-bottom: 4px;">${cf.description}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  ` : '';

  // Actions section
  const actionsHtml = actions.length > 0 ? `
    <h3 style="margin: 24px 0 10px; font-size: 14px; font-weight: 600; color: #333; border-top: 2px solid #e5e7eb; padding-top: 16px;">${isRTL ? 'الإجراءات التصحيحية' : 'Corrective Actions'} (${actions.length})</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'العنوان' : 'Title'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">${isRTL ? 'الحالة' : 'Status'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">${isRTL ? 'الأولوية' : 'Priority'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'المسؤول' : 'Assigned To'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
        </tr>
      </thead>
      <tbody>
        ${actions.map((a) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${a.title}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
              <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${a.status === 'verified' || a.status === 'closed' ? '#dcfce7' : a.status === 'completed' ? '#fef3c7' : '#e2e8f0'}; color: ${a.status === 'verified' || a.status === 'closed' ? '#166534' : a.status === 'completed' ? '#92400e' : '#475569'};">
                ${a.status}
              </span>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${a.priority || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${a.assigned_user?.full_name || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${a.due_date ? format(new Date(a.due_date), 'PP') : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  // Footer
  const footerHtml = `
    <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #666; display: flex; justify-content: space-between;">
      <span>${settings?.footerText || ''}</span>
      <span>${isRTL ? 'تاريخ الطباعة:' : 'Printed:'} ${format(new Date(), 'PPP')}</span>
    </div>
  `;
  
  container.innerHTML = `
    <div style="font-family: 'Rubik', Arial, sans-serif; color: #333;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: bold;">${primaryText}</h1>
        <p style="margin: 4px 0 0; font-size: 14px; color: #666;">${secondaryText}</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 20px; padding: 12px; background: #f9fafb; border-radius: 6px;">
        <h2 style="margin: 0; font-size: 16px; font-weight: 600;">${incident.title}</h2>
      </div>
      
      ${basicInfoHtml}
      ${sections.showEvidence || sections.showWitnesses ? investigationHtml : ''}
      ${sections.showEvidence ? evidenceHtml : ''}
      ${sections.showWitnesses ? witnessesHtml : ''}
      ${sections.showRCA ? rcaHtml : ''}
      ${sections.showActions ? actionsHtml : ''}
      ${footerHtml}
    </div>
  `;
  
  try {
    await generatePDFFromElement(container, {
      filename: `incident-report-${incident.reference_id || incident.id}.pdf`,
      margin: 15,
      quality: 2,
    });
  } finally {
    removePDFRenderContainer(container);
  }
}
