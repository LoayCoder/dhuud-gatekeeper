// Workflow Definitions for HSSE Process Diagrams

export type NodeType = 'start' | 'end' | 'action' | 'decision' | 'approval' | 'subprocess';
export type ConditionType = 'yes' | 'no' | 'approve' | 'reject' | 'escalate' | 'default';
export type WorkflowCategory = 'hsse_events' | 'inspections' | 'assets' | 'compliance';

export interface WorkflowStep {
  id: string;
  type: NodeType;
  label: string;
  labelAr: string;
  actor?: string;
  actorAr?: string;
  description?: string;
  descriptionAr?: string;
}

export interface WorkflowConnection {
  from: string;
  to: string;
  label?: string;
  labelAr?: string;
  condition?: ConditionType;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: WorkflowCategory;
  steps: WorkflowStep[];
  connections: WorkflowConnection[];
}

// ============= OBSERVATION WORKFLOW =============
// Updated: Observation now goes to Dept Rep first, HSSE Expert is notified (not assigned)
export const observationWorkflow: WorkflowDefinition = {
  id: 'observation-reporting',
  name: 'Observation Reporting',
  nameAr: 'الإبلاغ عن الملاحظات',
  description: 'End-to-end workflow for safety observations - Dept Rep first, HSSE Expert notified',
  descriptionAr: 'سير العمل الكامل لملاحظات السلامة - ممثل القسم أولاً، ثم إشعار خبير السلامة',
  category: 'hsse_events',
  steps: [
    { id: 'start', type: 'start', label: 'Reporter Submits Observation', labelAr: 'المُبلِّغ يقدم الملاحظة', actor: 'Reporter', actorAr: 'المُبلِّغ' },
    { id: 'notify_hsse', type: 'action', label: 'HSSE Expert Notified', labelAr: 'إشعار خبير السلامة', actor: 'System', actorAr: 'النظام', description: 'HSSE Expert receives notification based on observation matrix', descriptionAr: 'يتلقى خبير السلامة إشعاراً بناءً على مصفوفة الملاحظات' },
    { id: 'dept_rep_review', type: 'approval', label: 'Dept Rep Review', labelAr: 'مراجعة ممثل القسم', actor: 'Dept Rep', actorAr: 'ممثل القسم' },
    { id: 'decision_dept_rep', type: 'decision', label: 'Dept Rep Decision', labelAr: 'قرار ممثل القسم' },
    { id: 'close_on_spot', type: 'action', label: 'Close on Spot', labelAr: 'إغلاق فوري', actor: 'Dept Rep', actorAr: 'ممثل القسم', description: 'Low severity (Level 1-2) can be closed directly', descriptionAr: 'الخطورة المنخفضة (المستوى 1-2) يمكن إغلاقها مباشرة' },
    { id: 'assign_actions', type: 'action', label: 'Assign Corrective Actions', labelAr: 'تعيين الإجراءات التصحيحية', actor: 'Dept Rep', actorAr: 'ممثل القسم' },
    { id: 'escalate_hsse', type: 'subprocess', label: 'Escalate to HSSE Expert', labelAr: 'تصعيد لخبير السلامة', actor: 'Dept Rep', actorAr: 'ممثل القسم', description: 'High severity (Level 3+) or complex issues', descriptionAr: 'الخطورة العالية (المستوى 3+) أو المشاكل المعقدة' },
    { id: 'hsse_validation', type: 'approval', label: 'HSSE Validation', labelAr: 'تحقق خبير السلامة', actor: 'HSSE Expert', actorAr: 'خبير السلامة' },
    { id: 'upgrade_incident', type: 'subprocess', label: 'Upgrade to Incident', labelAr: 'ترقية إلى حادث', actor: 'HSSE Expert', actorAr: 'خبير السلامة' },
    { id: 'end', type: 'end', label: 'Observation Closed', labelAr: 'إغلاق الملاحظة' },
  ],
  connections: [
    { from: 'start', to: 'notify_hsse' },
    { from: 'start', to: 'dept_rep_review' },
    { from: 'notify_hsse', to: 'dept_rep_review', label: 'Parallel', labelAr: 'متوازي' },
    { from: 'dept_rep_review', to: 'decision_dept_rep' },
    { from: 'decision_dept_rep', to: 'close_on_spot', condition: 'approve', label: 'Close (L1-L2)', labelAr: 'إغلاق (م1-م2)' },
    { from: 'decision_dept_rep', to: 'assign_actions', condition: 'default', label: 'Assign Actions', labelAr: 'تعيين إجراءات' },
    { from: 'decision_dept_rep', to: 'escalate_hsse', condition: 'escalate', label: 'Escalate (L3+)', labelAr: 'تصعيد (م3+)' },
    { from: 'close_on_spot', to: 'end' },
    { from: 'assign_actions', to: 'hsse_validation' },
    { from: 'escalate_hsse', to: 'hsse_validation' },
    { from: 'hsse_validation', to: 'end', condition: 'approve', label: 'Validated', labelAr: 'تم التحقق' },
    { from: 'hsse_validation', to: 'upgrade_incident', condition: 'escalate', label: 'Upgrade', labelAr: 'ترقية' },
    { from: 'upgrade_incident', to: 'end' },
  ],
};

// ============= INCIDENT WORKFLOW =============
export const incidentWorkflow: WorkflowDefinition = {
  id: 'incident-reporting',
  name: 'Incident Reporting',
  nameAr: 'الإبلاغ عن الحوادث',
  description: 'Complete incident reporting workflow from submission through manager approval',
  descriptionAr: 'سير العمل الكامل للإبلاغ عن الحوادث من التقديم حتى موافقة المدير',
  category: 'hsse_events',
  steps: [
    { id: 'start', type: 'start', label: 'Reporter Submits Incident', labelAr: 'المُبلِّغ يقدم الحادث', actor: 'Reporter', actorAr: 'المُبلِّغ' },
    { id: 'expert_screening', type: 'approval', label: 'HSSE Expert Screening', labelAr: 'فحص خبير السلامة', actor: 'HSSE Expert', actorAr: 'خبير السلامة' },
    { id: 'decision_expert', type: 'decision', label: 'Expert Decision', labelAr: 'قرار الخبير' },
    { id: 'manager_approval', type: 'approval', label: 'Manager Approval', labelAr: 'موافقة المدير', actor: 'Manager', actorAr: 'المدير' },
    { id: 'decision_manager', type: 'decision', label: 'Manager Decision', labelAr: 'قرار المدير' },
    { id: 'hsse_escalation', type: 'approval', label: 'HSSE Manager Escalation', labelAr: 'تصعيد مدير السلامة', actor: 'HSSE Manager', actorAr: 'مدير السلامة' },
    { id: 'investigation_pending', type: 'action', label: 'Awaiting Investigator', labelAr: 'في انتظار المحقق', actor: 'HSSE Expert', actorAr: 'خبير السلامة' },
    { id: 'return_reporter', type: 'action', label: 'Return to Reporter', labelAr: 'إعادة للمُبلِّغ', actor: 'HSSE Expert', actorAr: 'خبير السلامة' },
    { id: 'rejected', type: 'end', label: 'Incident Rejected', labelAr: 'رفض الحادث' },
    { id: 'end', type: 'end', label: 'Ready for Investigation', labelAr: 'جاهز للتحقيق' },
  ],
  connections: [
    { from: 'start', to: 'expert_screening' },
    { from: 'expert_screening', to: 'decision_expert' },
    { from: 'decision_expert', to: 'manager_approval', condition: 'approve', label: 'Recommend', labelAr: 'توصية' },
    { from: 'decision_expert', to: 'return_reporter', condition: 'reject', label: 'Return', labelAr: 'إعادة' },
    { from: 'return_reporter', to: 'start' },
    { from: 'manager_approval', to: 'decision_manager' },
    { from: 'decision_manager', to: 'investigation_pending', condition: 'approve', label: 'Approve', labelAr: 'موافقة' },
    { from: 'decision_manager', to: 'hsse_escalation', condition: 'reject', label: 'Reject', labelAr: 'رفض' },
    { from: 'hsse_escalation', to: 'investigation_pending', condition: 'approve', label: 'Override', labelAr: 'تجاوز' },
    { from: 'hsse_escalation', to: 'rejected', condition: 'reject', label: 'Confirm Reject', labelAr: 'تأكيد الرفض' },
    { from: 'investigation_pending', to: 'end' },
  ],
};

// ============= INVESTIGATION WORKFLOW =============
export const investigationWorkflow: WorkflowDefinition = {
  id: 'investigation-lifecycle',
  name: 'Investigation Lifecycle',
  nameAr: 'دورة حياة التحقيق',
  description: 'Full investigation workflow from assignment to closure with HSSE Manager sign-off',
  descriptionAr: 'سير العمل الكامل للتحقيق من التعيين إلى الإغلاق مع موافقة مدير السلامة',
  category: 'hsse_events',
  steps: [
    { id: 'start', type: 'start', label: 'Investigator Assigned', labelAr: 'تعيين المحقق', actor: 'HSSE Expert', actorAr: 'خبير السلامة' },
    { id: 'start_investigation', type: 'action', label: 'Start Investigation', labelAr: 'بدء التحقيق', actor: 'Investigator', actorAr: 'المحقق' },
    { id: 'collect_evidence', type: 'action', label: 'Collect Evidence', labelAr: 'جمع الأدلة', actor: 'Investigator', actorAr: 'المحقق' },
    { id: 'witness_statements', type: 'action', label: 'Record Witness Statements', labelAr: 'تسجيل شهادات الشهود', actor: 'Investigator', actorAr: 'المحقق' },
    { id: 'rca', type: 'action', label: 'Root Cause Analysis', labelAr: 'تحليل السبب الجذري', actor: 'Investigator', actorAr: 'المحقق' },
    { id: 'assign_actions', type: 'action', label: 'Assign Corrective Actions', labelAr: 'تعيين الإجراءات التصحيحية', actor: 'Investigator', actorAr: 'المحقق' },
    { id: 'request_closure', type: 'action', label: 'Request Closure', labelAr: 'طلب الإغلاق', actor: 'Investigator', actorAr: 'المحقق' },
    { id: 'manager_review', type: 'approval', label: 'HSSE Manager Review', labelAr: 'مراجعة مدير السلامة', actor: 'HSSE Manager', actorAr: 'مدير السلامة' },
    { id: 'decision_closure', type: 'decision', label: 'Closure Decision', labelAr: 'قرار الإغلاق' },
    { id: 'end', type: 'end', label: 'Investigation Closed', labelAr: 'إغلاق التحقيق' },
  ],
  connections: [
    { from: 'start', to: 'start_investigation' },
    { from: 'start_investigation', to: 'collect_evidence' },
    { from: 'collect_evidence', to: 'witness_statements' },
    { from: 'witness_statements', to: 'rca' },
    { from: 'rca', to: 'assign_actions' },
    { from: 'assign_actions', to: 'request_closure' },
    { from: 'request_closure', to: 'manager_review' },
    { from: 'manager_review', to: 'decision_closure' },
    { from: 'decision_closure', to: 'end', condition: 'approve', label: 'Approve', labelAr: 'موافقة' },
    { from: 'decision_closure', to: 'collect_evidence', condition: 'reject', label: 'Reject', labelAr: 'رفض' },
  ],
};

// ============= CORRECTIVE ACTION WORKFLOW =============
export const actionClosureWorkflow: WorkflowDefinition = {
  id: 'action-closure',
  name: 'Corrective Action Closure',
  nameAr: 'إغلاق الإجراء التصحيحي',
  description: 'Corrective action lifecycle with SLA tracking and escalation',
  descriptionAr: 'دورة حياة الإجراء التصحيحي مع تتبع اتفاقية مستوى الخدمة والتصعيد',
  category: 'hsse_events',
  steps: [
    { id: 'start', type: 'start', label: 'Action Assigned', labelAr: 'تعيين الإجراء', actor: 'Investigator', actorAr: 'المحقق' },
    { id: 'in_progress', type: 'action', label: 'Action In Progress', labelAr: 'الإجراء قيد التنفيذ', actor: 'Assignee', actorAr: 'المكلف' },
    { id: 'sla_warning', type: 'action', label: 'SLA Warning Sent', labelAr: 'إرسال تحذير الاتفاقية', actor: 'System', actorAr: 'النظام' },
    { id: 'completed', type: 'action', label: 'Mark as Completed', labelAr: 'تحديد كمكتمل', actor: 'Assignee', actorAr: 'المكلف' },
    { id: 'sla_escalation', type: 'action', label: 'Escalate to Manager', labelAr: 'تصعيد للمدير', actor: 'System', actorAr: 'النظام' },
    { id: 'verification', type: 'approval', label: 'HSSE Verification', labelAr: 'تحقق السلامة', actor: 'HSSE Expert', actorAr: 'خبير السلامة' },
    { id: 'decision_verify', type: 'decision', label: 'Verification Result', labelAr: 'نتيجة التحقق' },
    { id: 'end', type: 'end', label: 'Action Closed', labelAr: 'إغلاق الإجراء' },
  ],
  connections: [
    { from: 'start', to: 'in_progress' },
    { from: 'in_progress', to: 'sla_warning', label: 'Due Soon', labelAr: 'قريب الاستحقاق' },
    { from: 'in_progress', to: 'completed' },
    { from: 'sla_warning', to: 'sla_escalation', label: 'Overdue', labelAr: 'متأخر' },
    { from: 'sla_warning', to: 'completed' },
    { from: 'sla_escalation', to: 'completed' },
    { from: 'completed', to: 'verification' },
    { from: 'verification', to: 'decision_verify' },
    { from: 'decision_verify', to: 'end', condition: 'approve', label: 'Verified', labelAr: 'تم التحقق' },
    { from: 'decision_verify', to: 'in_progress', condition: 'reject', label: 'Rejected', labelAr: 'مرفوض' },
  ],
};

// ============= ASSET INSPECTION WORKFLOW =============
export const assetInspectionWorkflow: WorkflowDefinition = {
  id: 'asset-inspection',
  name: 'Asset Inspection',
  nameAr: 'فحص الأصول',
  description: 'Bulk asset inspection workflow with QR scanning and finding generation',
  descriptionAr: 'سير عمل فحص الأصول الجماعي مع مسح QR وتوليد الملاحظات',
  category: 'assets',
  steps: [
    { id: 'start', type: 'start', label: 'Create Inspection Session', labelAr: 'إنشاء جلسة الفحص', actor: 'Inspector', actorAr: 'المفتش' },
    { id: 'scan_asset', type: 'action', label: 'Scan Asset QR Code', labelAr: 'مسح رمز QR للأصل', actor: 'Inspector', actorAr: 'المفتش' },
    { id: 'record_result', type: 'action', label: 'Record Pass/Fail', labelAr: 'تسجيل النجاح/الفشل', actor: 'Inspector', actorAr: 'المفتش' },
    { id: 'decision_result', type: 'decision', label: 'Inspection Result', labelAr: 'نتيجة الفحص' },
    { id: 'capture_failure', type: 'action', label: 'Capture Failure Details', labelAr: 'التقاط تفاصيل الفشل', actor: 'Inspector', actorAr: 'المفتش' },
    { id: 'generate_finding', type: 'action', label: 'Auto-Generate Finding', labelAr: 'توليد ملاحظة تلقائياً', actor: 'System', actorAr: 'النظام' },
    { id: 'more_assets', type: 'decision', label: 'More Assets?', labelAr: 'المزيد من الأصول؟' },
    { id: 'complete_session', type: 'action', label: 'Complete Session', labelAr: 'إكمال الجلسة', actor: 'Inspector', actorAr: 'المفتش' },
    { id: 'assign_actions', type: 'action', label: 'Assign Corrective Actions', labelAr: 'تعيين الإجراءات التصحيحية', actor: 'HSSE Expert', actorAr: 'خبير السلامة' },
    { id: 'end', type: 'end', label: 'Session Closed', labelAr: 'إغلاق الجلسة' },
  ],
  connections: [
    { from: 'start', to: 'scan_asset' },
    { from: 'scan_asset', to: 'record_result' },
    { from: 'record_result', to: 'decision_result' },
    { from: 'decision_result', to: 'more_assets', condition: 'yes', label: 'Pass', labelAr: 'نجاح' },
    { from: 'decision_result', to: 'capture_failure', condition: 'no', label: 'Fail', labelAr: 'فشل' },
    { from: 'capture_failure', to: 'generate_finding' },
    { from: 'generate_finding', to: 'more_assets' },
    { from: 'more_assets', to: 'scan_asset', condition: 'yes', label: 'Yes', labelAr: 'نعم' },
    { from: 'more_assets', to: 'complete_session', condition: 'no', label: 'No', labelAr: 'لا' },
    { from: 'complete_session', to: 'assign_actions' },
    { from: 'assign_actions', to: 'end' },
  ],
};

// ============= AREA INSPECTION WORKFLOW =============
export const areaInspectionWorkflow: WorkflowDefinition = {
  id: 'area-inspection',
  name: 'Area Inspection',
  nameAr: 'فحص المنطقة',
  description: 'Checklist-based site/area inspection workflow with NC classification',
  descriptionAr: 'سير عمل فحص الموقع/المنطقة بناءً على قائمة المراجعة مع تصنيف عدم المطابقة',
  category: 'inspections',
  steps: [
    { id: 'start', type: 'start', label: 'Select Template', labelAr: 'اختيار القالب', actor: 'Inspector', actorAr: 'المفتش' },
    { id: 'create_session', type: 'action', label: 'Create Inspection Session', labelAr: 'إنشاء جلسة الفحص', actor: 'Inspector', actorAr: 'المفتش' },
    { id: 'checklist_item', type: 'action', label: 'Inspect Checklist Item', labelAr: 'فحص عنصر القائمة', actor: 'Inspector', actorAr: 'المفتش' },
    { id: 'decision_item', type: 'decision', label: 'Item Result', labelAr: 'نتيجة العنصر' },
    { id: 'capture_nc', type: 'action', label: 'Record Non-Conformance', labelAr: 'تسجيل عدم المطابقة', actor: 'Inspector', actorAr: 'المفتش' },
    { id: 'classify_nc', type: 'action', label: 'Classify NC Severity', labelAr: 'تصنيف شدة عدم المطابقة', actor: 'Inspector', actorAr: 'المفتش' },
    { id: 'more_items', type: 'decision', label: 'More Items?', labelAr: 'المزيد من العناصر؟' },
    { id: 'complete_session', type: 'action', label: 'Complete Inspection', labelAr: 'إكمال الفحص', actor: 'Inspector', actorAr: 'المفتش' },
    { id: 'generate_actions', type: 'action', label: 'Generate Corrective Actions', labelAr: 'توليد الإجراءات التصحيحية', actor: 'System', actorAr: 'النظام' },
    { id: 'end', type: 'end', label: 'Inspection Complete', labelAr: 'اكتمال الفحص' },
  ],
  connections: [
    { from: 'start', to: 'create_session' },
    { from: 'create_session', to: 'checklist_item' },
    { from: 'checklist_item', to: 'decision_item' },
    { from: 'decision_item', to: 'more_items', condition: 'yes', label: 'Compliant', labelAr: 'مطابق' },
    { from: 'decision_item', to: 'capture_nc', condition: 'no', label: 'Non-Compliant', labelAr: 'غير مطابق' },
    { from: 'capture_nc', to: 'classify_nc' },
    { from: 'classify_nc', to: 'more_items' },
    { from: 'more_items', to: 'checklist_item', condition: 'yes', label: 'Yes', labelAr: 'نعم' },
    { from: 'more_items', to: 'complete_session', condition: 'no', label: 'No', labelAr: 'لا' },
    { from: 'complete_session', to: 'generate_actions' },
    { from: 'generate_actions', to: 'end' },
  ],
};

// ============= AUDIT COMPLIANCE WORKFLOW =============
export const auditComplianceWorkflow: WorkflowDefinition = {
  id: 'audit-compliance',
  name: 'Audit Compliance',
  nameAr: 'تدقيق الامتثال',
  description: 'ISO-style audit workflow with scoring and NC classification',
  descriptionAr: 'سير عمل التدقيق بنمط ISO مع التسجيل وتصنيف عدم المطابقة',
  category: 'compliance',
  steps: [
    { id: 'start', type: 'start', label: 'Plan Audit', labelAr: 'تخطيط التدقيق', actor: 'Lead Auditor', actorAr: 'المدقق الرئيسي' },
    { id: 'opening_meeting', type: 'action', label: 'Opening Meeting', labelAr: 'اجتماع الافتتاح', actor: 'Audit Team', actorAr: 'فريق التدقيق' },
    { id: 'conduct_audit', type: 'action', label: 'Conduct Audit', labelAr: 'إجراء التدقيق', actor: 'Auditor', actorAr: 'المدقق' },
    { id: 'record_findings', type: 'action', label: 'Record Findings', labelAr: 'تسجيل الملاحظات', actor: 'Auditor', actorAr: 'المدقق' },
    { id: 'classify_nc', type: 'action', label: 'Classify NC (Major/Minor/OFI)', labelAr: 'تصنيف عدم المطابقة', actor: 'Lead Auditor', actorAr: 'المدقق الرئيسي' },
    { id: 'closing_meeting', type: 'action', label: 'Closing Meeting', labelAr: 'اجتماع الإغلاق', actor: 'Audit Team', actorAr: 'فريق التدقيق' },
    { id: 'generate_report', type: 'action', label: 'Generate Audit Report', labelAr: 'توليد تقرير التدقيق', actor: 'Lead Auditor', actorAr: 'المدقق الرئيسي' },
    { id: 'assign_capa', type: 'action', label: 'Assign CAPA', labelAr: 'تعيين الإجراءات التصحيحية', actor: 'Auditee', actorAr: 'الجهة المدققة' },
    { id: 'verify_closure', type: 'approval', label: 'Verify NC Closure', labelAr: 'التحقق من إغلاق عدم المطابقة', actor: 'Lead Auditor', actorAr: 'المدقق الرئيسي' },
    { id: 'end', type: 'end', label: 'Audit Closed', labelAr: 'إغلاق التدقيق' },
  ],
  connections: [
    { from: 'start', to: 'opening_meeting' },
    { from: 'opening_meeting', to: 'conduct_audit' },
    { from: 'conduct_audit', to: 'record_findings' },
    { from: 'record_findings', to: 'classify_nc' },
    { from: 'classify_nc', to: 'closing_meeting' },
    { from: 'closing_meeting', to: 'generate_report' },
    { from: 'generate_report', to: 'assign_capa' },
    { from: 'assign_capa', to: 'verify_closure' },
    { from: 'verify_closure', to: 'end', condition: 'approve', label: 'Verified', labelAr: 'تم التحقق' },
    { from: 'verify_closure', to: 'assign_capa', condition: 'reject', label: 'Re-open', labelAr: 'إعادة فتح' },
  ],
};

// ============= FULL E2E HSSE WORKFLOW =============
export const fullE2EWorkflow: WorkflowDefinition = {
  id: 'full-e2e-hsse',
  name: 'Full HSSE Event Flow',
  nameAr: 'سير العمل الكامل لأحداث السلامة',
  description: 'Complete end-to-end HSSE event workflow from reporting to closure',
  descriptionAr: 'سير العمل الشامل لأحداث السلامة من الإبلاغ إلى الإغلاق',
  category: 'hsse_events',
  steps: [
    { id: 'start', type: 'start', label: 'Event Reported', labelAr: 'الإبلاغ عن الحدث', actor: 'Reporter', actorAr: 'المُبلِّغ' },
    { id: 'expert_screening', type: 'approval', label: 'HSSE Expert Screening', labelAr: 'فحص خبير السلامة', actor: 'HSSE Expert', actorAr: 'خبير السلامة' },
    { id: 'decision_type', type: 'decision', label: 'Event Type?', labelAr: 'نوع الحدث؟' },
    { id: 'manager_approval', type: 'approval', label: 'Manager Approval', labelAr: 'موافقة المدير', actor: 'Manager', actorAr: 'المدير' },
    { id: 'dept_rep', type: 'approval', label: 'Dept Rep Approval', labelAr: 'موافقة ممثل القسم', actor: 'Dept Rep', actorAr: 'ممثل القسم' },
    { id: 'assign_investigator', type: 'action', label: 'Assign Investigator', labelAr: 'تعيين المحقق', actor: 'HSSE Expert', actorAr: 'خبير السلامة' },
    { id: 'investigation', type: 'subprocess', label: 'Investigation Process', labelAr: 'عملية التحقيق', actor: 'Investigator', actorAr: 'المحقق' },
    { id: 'assign_actions', type: 'action', label: 'Assign Corrective Actions', labelAr: 'تعيين الإجراءات التصحيحية', actor: 'Investigator', actorAr: 'المحقق' },
    { id: 'action_completion', type: 'subprocess', label: 'Action Completion', labelAr: 'إكمال الإجراءات', actor: 'Assignees', actorAr: 'المكلفون' },
    { id: 'hsse_verification', type: 'approval', label: 'HSSE Verification', labelAr: 'تحقق السلامة', actor: 'HSSE Expert', actorAr: 'خبير السلامة' },
    { id: 'closure_request', type: 'action', label: 'Request Closure', labelAr: 'طلب الإغلاق', actor: 'Investigator', actorAr: 'المحقق' },
    { id: 'manager_signoff', type: 'approval', label: 'HSSE Manager Sign-off', labelAr: 'موافقة مدير السلامة', actor: 'HSSE Manager', actorAr: 'مدير السلامة' },
    { id: 'end', type: 'end', label: 'Event Closed', labelAr: 'إغلاق الحدث' },
  ],
  connections: [
    { from: 'start', to: 'expert_screening' },
    { from: 'expert_screening', to: 'decision_type' },
    { from: 'decision_type', to: 'manager_approval', condition: 'yes', label: 'Incident', labelAr: 'حادث' },
    { from: 'decision_type', to: 'dept_rep', condition: 'no', label: 'Observation', labelAr: 'ملاحظة' },
    { from: 'manager_approval', to: 'assign_investigator' },
    { from: 'dept_rep', to: 'assign_actions' },
    { from: 'assign_investigator', to: 'investigation' },
    { from: 'investigation', to: 'assign_actions' },
    { from: 'assign_actions', to: 'action_completion' },
    { from: 'action_completion', to: 'hsse_verification' },
    { from: 'hsse_verification', to: 'closure_request' },
    { from: 'closure_request', to: 'manager_signoff' },
    { from: 'manager_signoff', to: 'end' },
  ],
};

// ============= ALL WORKFLOWS =============
export const allWorkflows: WorkflowDefinition[] = [
  observationWorkflow,
  incidentWorkflow,
  investigationWorkflow,
  actionClosureWorkflow,
  assetInspectionWorkflow,
  areaInspectionWorkflow,
  auditComplianceWorkflow,
  fullE2EWorkflow,
];

export function getWorkflowsByCategory(category: WorkflowCategory): WorkflowDefinition[] {
  return allWorkflows.filter(w => w.category === category);
}

export function getWorkflowById(id: string): WorkflowDefinition | undefined {
  return allWorkflows.find(w => w.id === id);
}

export const workflowCategories: { id: WorkflowCategory; name: string; nameAr: string }[] = [
  { id: 'hsse_events', name: 'HSSE Events', nameAr: 'أحداث السلامة' },
  { id: 'inspections', name: 'Inspections & Audits', nameAr: 'عمليات الفحص والتدقيق' },
  { id: 'assets', name: 'Asset Management', nameAr: 'إدارة الأصول' },
  { id: 'compliance', name: 'Compliance', nameAr: 'الامتثال' },
];
