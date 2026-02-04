// Workflow Definitions for HSSE Process Diagrams
// V1.1 MASTER WORKFLOW - Refactored to match Mermaid V1.1 Specification

export type NodeType = 'start' | 'end' | 'action' | 'decision' | 'approval' | 'subprocess' | 'notification' | 'gate' | 'ai';
export type ConditionType = 'yes' | 'no' | 'approve' | 'reject' | 'escalate' | 'default' | 'l1_l2' | 'l3' | 'l4_l5' | 'valid' | 'invalid' | 'incomplete';
export type WorkflowCategory = 'hsse_events' | 'inspections' | 'assets' | 'compliance' | 'contractor';

export interface WorkflowStep {
  id: string;
  type: NodeType;
  label: string;
  labelAr: string;
  actor?: string;
  actorAr?: string;
  description?: string;
  descriptionAr?: string;
  // Status mapping for database
  dbStatus?: string;
  // Notification trigger
  notificationAction?: string;
  // Gap indicator
  hasGap?: boolean;
  gapDescription?: string;
  // Validation Gate ID
  gateId?: string;
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
  gaps?: string[];
  version: string;
}

export const workflowCategories: { id: WorkflowCategory; name: string; nameAr: string }[] = [
  { id: 'hsse_events', name: 'HSSE Events', nameAr: 'أحداث الصحة والسلامة' },
  { id: 'inspections', name: 'Inspections', nameAr: 'التفتيشات' },
  { id: 'assets', name: 'Assets', nameAr: 'الأصول' },
  { id: 'compliance', name: 'Compliance', nameAr: 'الامتثال' },
  { id: 'contractor', name: 'Contractor', nameAr: 'المقاولين' }
];

// ============= V1.1 MASTER INCIDENT WORKFLOW =============
export const incidentWorkflowV1_1: WorkflowDefinition = {
  id: 'incident-v1-1',
  name: 'Incident Workflow V1.1',
  nameAr: 'سير عمل الحوادث الإصدار 1.1',
  description: 'Master workflow including AI analysis, screening loops, investigation gates, and structured RCA',
  descriptionAr: 'سير العمل الرئيسي بما في ذلك تحليل الذكاء الاصطناعي، حلقات الفرز، بوابات التحقيق، وتحليل السبب الجذري المنظم',
  category: 'hsse_events',
  version: '1.1',
  steps: [
    // --- 1. INITIAL ENTRY & AI ---
    {
      id: 'desc_entry',
      type: 'start',
      label: 'Description & Details Entry',
      labelAr: 'إدخال الوصف والتفاصيل',
      actor: 'Reporter',
      actorAr: 'المُبلِّغ'
    },
    {
      id: 'ai_analysis',
      type: 'ai',
      label: 'AI Analysis Service',
      labelAr: 'خدمة تحليل الذكاء الاصطناعي',
      description: 'Generates Title, Tags, Category, Severity, etc.',
      descriptionAr: 'يولد العنوان، العلامات، الفئة، الخطورة، إلخ.'
    },
    {
      id: 'user_review',
      type: 'action',
      label: 'User Review / Edit',
      labelAr: 'مراجعة / تعديل المستخدم',
      actor: 'Reporter',
      actorAr: 'المُبلِّغ'
    },
    {
      id: 'contractor_check',
      type: 'decision',
      label: 'Report Against Contractor?',
      labelAr: 'تقرير ضد مقاول؟'
    },
    {
      id: 'final_submit',
      type: 'action',
      label: 'Final Submit',
      labelAr: 'إرسال نهائي',
      dbStatus: 'submitted',
      notificationAction: 'incident_submitted'
    },

    // --- 2. SCREENING & SLA ---
    {
      id: 'resolve_reps',
      type: 'action',
      label: 'System: Resolve Dept/Site Reps',
      labelAr: 'النظام: تحديد ممثلي القسم/الموقع',
      actor: 'System',
      actorAr: 'النظام'
    },
    {
      id: 'contractor_submission_check',
      type: 'decision',
      label: 'Contractor Submission?',
      labelAr: 'تقديم مقاول؟'
    },

    // Path A: Dept Rep (Internal)
    {
      id: 'notify_dept_rep',
      type: 'notification',
      label: 'Notify Dept Rep',
      labelAr: 'إشعار ممثل القسم',
      notificationAction: 'dept_rep_review_required'
    },
    {
      id: 'dept_rep_review',
      type: 'approval',
      label: 'Dept Rep Review',
      labelAr: 'مراجعة ممثل القسم',
      actor: 'Dept Rep',
      actorAr: 'ممثل القسم',
      dbStatus: 'pending_dept_rep_approval'
    },
    {
      id: 'dept_manager_approval',
      type: 'approval',
      label: 'Dept Manager Approval',
      labelAr: 'موافقة مدير القسم',
      actor: 'Dept Manager',
      actorAr: 'مدير القسم',
      dbStatus: 'pending_department_manager_approval'
    },

    // Path B: Contractor (External)
    {
      id: 'contractor_screen',
      type: 'approval',
      label: 'Contractor Consultant Screening',
      labelAr: 'فحص استشاري المقاول',
      actor: 'Consultant',
      actorAr: 'الاستشاري',
      dbStatus: 'pending_consultant_screening'
    },
    {
      id: 'consultant_review',
      type: 'decision',
      label: 'Consultant Approval?',
      labelAr: 'موافقة الاستشاري؟'
    },
    {
      id: 'site_approval',
      type: 'approval',
      label: 'Site Client Approval',
      labelAr: 'موافقة عميل الموقع',
      actor: 'Client Site Rep',
      actorAr: 'ممثل عميل الموقع',
      dbStatus: 'pending_site_client_approval'
    },
    {
      id: 'contractor_implement',
      type: 'action',
      label: 'Contractor Acknowledge',
      labelAr: 'إقرار المقاول',
      actor: 'Contractor Rep',
      actorAr: 'ممثل المقاول'
    },

    // SLA Logic Node
    {
      id: 'sla_timer_check',
      type: 'action',
      label: 'SLA Timer Check (2 Hours)',
      labelAr: 'فحص مؤقت SLA (ساعتان)',
      description: 'Auto-escalate if screening delayed',
      descriptionAr: 'تصعيد تلقائي إذا تأخر الفحص'
    },

    // HSSE Screening (Central)
    {
      id: 'hsse_screen',
      type: 'approval',
      label: 'HSSE Expert Screening',
      labelAr: 'فحص خبير السلامة',
      actor: 'HSSE Expert',
      actorAr: 'خبير السلامة',
      dbStatus: 'pending_expert_screening'
    },
    {
      id: 'investigator_assign_decision',
      type: 'decision',
      label: 'Investigator Assignment Mode',
      labelAr: 'وضع تعيين المحقق'
    },

    // --- 3. INVESTIGATION PHASE ---
    {
      id: 'investigation_start',
      type: 'subprocess',
      label: 'Start Investigation',
      labelAr: 'بدء التحقيق',
      dbStatus: 'investigation_in_progress'
    },

    // Sub-components
    { id: 'evidence_mgmt', type: 'action', label: 'Evidence Management', labelAr: 'إدارة الأدلة' },
    { id: 'witness_stmts', type: 'action', label: 'Witness Statements', labelAr: 'شهادات الشهود' },
    { id: 'rca_process', type: 'action', label: 'Root Cause Analysis', labelAr: 'تحليل السبب الجذري' },
    { id: 'injury_impact', type: 'action', label: 'Injury Impact', labelAr: 'تأثير الإصابة' },
    { id: 'property_damage', type: 'action', label: 'Property Damage', labelAr: 'أضرار الممتلكات' },
    { id: 'env_impact', type: 'action', label: 'Environmental Impact', labelAr: 'التأثير البيئي' },

    // Validation Gate 1
    {
      id: 'data_validation_gate',
      type: 'gate',
      label: 'System Data Validation Gate',
      labelAr: 'بوابة التحقق من بيانات النظام',
      gateId: 'n26',
      description: 'Checks completeness of Evidence, Witness, RCA, and Impacts',
      descriptionAr: 'يتحقق من اكتمال الأدلة والشهود وتحليل السبب الجذري والتأثيرات'
    },

    {
      id: 'investigation_done',
      type: 'action',
      label: 'Investigation Completed',
      labelAr: 'اكتمل التحقيق',
      dbStatus: 'investigation_pending_approval'
    },
    {
      id: 'hsse_mgr_approval',
      type: 'approval',
      label: 'HSSE Manager Approval',
      labelAr: 'موافقة مدير السلامة',
      actor: 'HSSE Manager',
      actorAr: 'مدير السلامة',
      dbStatus: 'pending_hsse_manager_approval'
    },
    {
      id: 'investigation_closed_status',
      type: 'action',
      label: 'Status: INVESTIGATION CLOSED',
      labelAr: 'الحالة: تم إغلاق التحقيق',
      dbStatus: 'investigation_closed'
    },

    // --- 4. ACTION MANAGEMENT & CLOSURE ---
    {
      id: 'hsse_verify_actions',
      type: 'action',
      label: 'Verify Actions',
      labelAr: 'التحقق من الإجراءات',
      actor: 'HSSE Expert',
      actorAr: 'خبير السلامة'
    },
    {
      id: 'action_closure_check',
      type: 'decision',
      label: 'All Actions Closed?',
      labelAr: 'هل أغلقت جميع الإجراءات؟'
    },
    // Validation Gate 2
    {
      id: 'action_evidence_gate',
      type: 'gate',
      label: 'Action Evidence Validation',
      labelAr: 'التحقق من أدلة الإجراء',
      gateId: 'n57',
      description: 'System validates required evidence for action closure',
      descriptionAr: 'النظام يتحقق من الأدلة المطلوبة لإغلاق الإجراء'
    },
    {
      id: 'ready_close',
      type: 'approval',
      label: 'Final Closure Review',
      labelAr: 'مراجعة الإغلاق النهائي',
      actor: 'HSSE Expert',
      actorAr: 'خبير السلامة',
      dbStatus: 'pending_final_closure'
    },
    {
      id: 'incident_closed',
      type: 'end',
      label: 'Status: INCIDENT CLOSED',
      labelAr: 'الحالة: تم إغلاق الحادث',
      dbStatus: 'closed'
    }
  ],
  connections: [
    // Entry
    { from: 'desc_entry', to: 'ai_analysis' },
    { from: 'ai_analysis', to: 'user_review' },
    { from: 'user_review', to: 'contractor_check' },
    { from: 'contractor_check', to: 'final_submit' },
    { from: 'final_submit', to: 'resolve_reps' },

    // Screening Split
    { from: 'resolve_reps', to: 'contractor_submission_check' },

    // Internal Path
    { from: 'contractor_submission_check', to: 'notify_dept_rep', condition: 'no' },
    { from: 'notify_dept_rep', to: 'dept_rep_review' },
    { from: 'dept_rep_review', to: 'dept_manager_approval', condition: 'approve' },
    { from: 'dept_manager_approval', to: 'hsse_screen', condition: 'approve' },
    { from: 'dept_rep_review', to: 'desc_entry', condition: 'reject', label: 'Return', labelAr: 'إعادة' },

    // External Path
    { from: 'contractor_submission_check', to: 'contractor_screen', condition: 'yes' },
    { from: 'contractor_screen', to: 'consultant_review' },
    { from: 'consultant_review', to: 'site_approval', condition: 'approve' },
    { from: 'consultant_review', to: 'desc_entry', condition: 'reject', label: 'Return', labelAr: 'إعادة' },
    { from: 'consultant_review', to: 'hsse_screen', condition: 'escalate' },
    { from: 'site_approval', to: 'contractor_implement', condition: 'approve' },
    { from: 'contractor_implement', to: 'hsse_screen' },

    // SLA Timer (Implicit connection to HSSE Screen)
    { from: 'dept_rep_review', to: 'sla_timer_check' },
    { from: 'contractor_screen', to: 'sla_timer_check' },
    { from: 'sla_timer_check', to: 'hsse_screen', label: 'Auto-Escalate', labelAr: 'تصعيد تلقائي' },

    // HSSE to Investigation
    { from: 'hsse_screen', to: 'investigator_assign_decision' },
    { from: 'investigator_assign_decision', to: 'investigation_start' },

    // Investigation Sub-processes
    { from: 'investigation_start', to: 'evidence_mgmt' },
    { from: 'investigation_start', to: 'witness_stmts' },
    { from: 'investigation_start', to: 'rca_process' },
    { from: 'investigation_start', to: 'injury_impact' },
    { from: 'investigation_start', to: 'property_damage' },
    { from: 'investigation_start', to: 'env_impact' },

    // Validation Gate 1
    { from: 'evidence_mgmt', to: 'data_validation_gate' },
    { from: 'witness_stmts', to: 'data_validation_gate' },
    { from: 'rca_process', to: 'data_validation_gate' },
    { from: 'injury_impact', to: 'data_validation_gate' },
    { from: 'property_damage', to: 'data_validation_gate' },
    { from: 'env_impact', to: 'data_validation_gate' },

    { from: 'data_validation_gate', to: 'investigation_done', condition: 'valid' },
    { from: 'data_validation_gate', to: 'investigation_start', condition: 'invalid', label: 'Incomplete', labelAr: 'غير مكتمل' },

    // Investigation Approval
    { from: 'investigation_done', to: 'hsse_mgr_approval' },
    { from: 'hsse_mgr_approval', to: 'investigation_closed_status', condition: 'approve' },
    { from: 'hsse_mgr_approval', to: 'investigation_start', condition: 'reject' },

    // Closure Phase
    { from: 'investigation_closed_status', to: 'hsse_verify_actions' },
    { from: 'hsse_verify_actions', to: 'action_closure_check' },
    { from: 'action_closure_check', to: 'action_evidence_gate', condition: 'yes' },
    { from: 'action_closure_check', to: 'hsse_verify_actions', condition: 'no', label: 'Wait', labelAr: 'انتظار' },

    { from: 'action_evidence_gate', to: 'ready_close', condition: 'valid' },
    { from: 'action_evidence_gate', to: 'hsse_verify_actions', condition: 'invalid' },

    { from: 'ready_close', to: 'incident_closed', condition: 'approve' }
  ]
};

// ============= INTERNAL GATE PASS WORKFLOW =============
export const internalGatePassWorkflow: WorkflowDefinition = {
  id: 'internal-gate-pass-v1',
  name: 'Internal Gate Pass Workflow',
  nameAr: 'سير عمل تصريح البوابة الداخلي',
  description: 'Workflow for internal employee material gate pass requests',
  descriptionAr: 'سير عمل لطلبات تصريح بوابة المواد للموظفين الداخليين',
  category: 'contractor',
  version: '1.0',
  steps: [
    // --- 1. REQUEST SUBMISSION ---
    {
      id: 'request_submit',
      type: 'start',
      label: 'Submit Gate Pass Request',
      labelAr: 'تقديم طلب تصريح البوابة',
      actor: 'Internal Employee',
      actorAr: 'موظف داخلي',
      dbStatus: 'pending_dept_approval',
      description: 'Employee submits material movement request with items & photos',
      descriptionAr: 'يقدم الموظف طلب نقل المواد مع العناصر والصور'
    },
    
    // --- 2. DEPARTMENT APPROVAL ---
    {
      id: 'dept_approval',
      type: 'approval',
      label: 'Department Approval',
      labelAr: 'موافقة القسم',
      actor: 'Dept Rep / Manager',
      actorAr: 'ممثل القسم / المدير',
      dbStatus: 'pending_dept_approval',
      description: 'Auto-routed: Employee → Dept Rep, Dept Rep → Manager',
      descriptionAr: 'توجيه تلقائي: موظف ← ممثل القسم، ممثل القسم ← المدير'
    },
    {
      id: 'dept_decision',
      type: 'decision',
      label: 'Approved?',
      labelAr: 'تمت الموافقة؟'
    },
    
    // --- 3. GOLF CLUB MANAGEMENT ACKNOWLEDGMENT ---
    {
      id: 'club_mgmt_ack',
      type: 'approval',
      label: 'Golf Club Management Acknowledgment',
      labelAr: 'إقرار إدارة النادي',
      actor: 'Golf Club Management Rep',
      actorAr: 'ممثل إدارة نادي الجولف',
      dbStatus: 'pending_club_mgmt_ack',
      description: 'Mandatory site entry acknowledgment',
      descriptionAr: 'إقرار دخول الموقع إلزامي'
    },
    {
      id: 'club_mgmt_decision',
      type: 'decision',
      label: 'Acknowledged?',
      labelAr: 'تم الإقرار؟'
    },
    
    // --- 4. SECURITY APPROVAL ---
    {
      id: 'security_approval',
      type: 'approval',
      label: 'Security Supervisor Approval',
      labelAr: 'موافقة مشرف الأمن',
      actor: 'Security Supervisor',
      actorAr: 'مشرف الأمن',
      dbStatus: 'pending_security_approval',
      description: 'Final approval & QR code generation',
      descriptionAr: 'الموافقة النهائية وإنشاء رمز QR'
    },
    {
      id: 'security_decision',
      type: 'decision',
      label: 'Approved?',
      labelAr: 'تمت الموافقة؟'
    },
    
    // --- 5. APPROVED STATUS ---
    {
      id: 'pass_approved',
      type: 'action',
      label: 'Pass Approved (QR Generated)',
      labelAr: 'تمت الموافقة على التصريح (تم إنشاء QR)',
      dbStatus: 'approved',
      notificationAction: 'gate_pass_approved'
    },
    
    // --- 6. GATE OPERATIONS ---
    {
      id: 'guard_scan_entry',
      type: 'action',
      label: 'Security Guard: Scan & Verify Entry',
      labelAr: 'حارس الأمن: مسح والتحقق من الدخول',
      actor: 'Security Guard',
      actorAr: 'حارس الأمن',
      dbStatus: 'used',
      description: 'Item-by-item verification with photos',
      descriptionAr: 'التحقق من عنصر تلو الآخر مع الصور'
    },
    {
      id: 'movement_type_check',
      type: 'decision',
      label: 'Entry & Exit Pass?',
      labelAr: 'تصريح دخول وخروج؟'
    },
    {
      id: 'guard_scan_exit',
      type: 'action',
      label: 'Security Guard: Scan & Verify Exit',
      labelAr: 'حارس الأمن: مسح والتحقق من الخروج',
      actor: 'Security Guard',
      actorAr: 'حارس الأمن',
      dbStatus: 'completed',
      description: 'Vehicle & driver matching validation',
      descriptionAr: 'التحقق من مطابقة المركبة والسائق'
    },
    
    // --- 7. COMPLETION ---
    {
      id: 'pass_completed',
      type: 'end',
      label: 'Pass Completed',
      labelAr: 'اكتمل التصريح',
      dbStatus: 'completed'
    },
    
    // --- REJECTION PATH ---
    {
      id: 'pass_rejected',
      type: 'end',
      label: 'Pass Rejected',
      labelAr: 'تم رفض التصريح',
      dbStatus: 'rejected'
    }
  ],
  connections: [
    // Main flow
    { from: 'request_submit', to: 'dept_approval' },
    { from: 'dept_approval', to: 'dept_decision' },
    { from: 'dept_decision', to: 'club_mgmt_ack', condition: 'approve' },
    { from: 'dept_decision', to: 'pass_rejected', condition: 'reject' },
    
    { from: 'club_mgmt_ack', to: 'club_mgmt_decision' },
    { from: 'club_mgmt_decision', to: 'security_approval', condition: 'approve' },
    { from: 'club_mgmt_decision', to: 'pass_rejected', condition: 'reject' },
    
    { from: 'security_approval', to: 'security_decision' },
    { from: 'security_decision', to: 'pass_approved', condition: 'approve' },
    { from: 'security_decision', to: 'pass_rejected', condition: 'reject' },
    
    // Gate operations
    { from: 'pass_approved', to: 'guard_scan_entry' },
    { from: 'guard_scan_entry', to: 'movement_type_check' },
    { from: 'movement_type_check', to: 'guard_scan_exit', condition: 'yes', label: 'In & Out', labelAr: 'دخول وخروج' },
    { from: 'movement_type_check', to: 'pass_completed', condition: 'no', label: 'Entry Only', labelAr: 'دخول فقط' },
    { from: 'guard_scan_exit', to: 'pass_completed' }
  ]
};

// ============= EXTERNAL (CONTRACTOR) GATE PASS WORKFLOW =============
export const externalGatePassWorkflow: WorkflowDefinition = {
  id: 'external-gate-pass-v1',
  name: 'External Gate Pass Workflow',
  nameAr: 'سير عمل تصريح البوابة الخارجي',
  description: 'Workflow for contractor material gate pass requests',
  descriptionAr: 'سير عمل لطلبات تصريح بوابة مواد المقاولين',
  category: 'contractor',
  version: '1.0',
  steps: [
    // --- 1. REQUEST SUBMISSION ---
    {
      id: 'request_submit',
      type: 'start',
      label: 'Submit Gate Pass Request',
      labelAr: 'تقديم طلب تصريح البوابة',
      actor: 'Contractor Representative',
      actorAr: 'ممثل المقاول',
      dbStatus: 'pending_contractor_approval',
      description: 'Contractor submits material movement request with items & photos',
      descriptionAr: 'يقدم المقاول طلب نقل المواد مع العناصر والصور'
    },
    
    // --- 2. CONTRACTOR CONSULTANT APPROVAL ---
    {
      id: 'contractor_approval',
      type: 'approval',
      label: 'Contractor Consultant Approval',
      labelAr: 'موافقة استشاري المقاول',
      actor: 'Contractor Consultant',
      actorAr: 'استشاري المقاول',
      dbStatus: 'pending_contractor_approval',
      description: 'Reviews contractor request and material list',
      descriptionAr: 'مراجعة طلب المقاول وقائمة المواد'
    },
    {
      id: 'contractor_decision',
      type: 'decision',
      label: 'Approved?',
      labelAr: 'تمت الموافقة؟'
    },
    
    // --- 3. GOLF CLUB MANAGEMENT ACKNOWLEDGMENT ---
    {
      id: 'club_mgmt_ack',
      type: 'approval',
      label: 'Golf Club Management Acknowledgment',
      labelAr: 'إقرار إدارة النادي',
      actor: 'Golf Club Management Rep',
      actorAr: 'ممثل إدارة نادي الجولف',
      dbStatus: 'pending_club_mgmt_ack',
      description: 'Mandatory site entry acknowledgment',
      descriptionAr: 'إقرار دخول الموقع إلزامي'
    },
    {
      id: 'club_mgmt_decision',
      type: 'decision',
      label: 'Acknowledged?',
      labelAr: 'تم الإقرار؟'
    },
    
    // --- 4. SECURITY APPROVAL ---
    {
      id: 'security_approval',
      type: 'approval',
      label: 'Security Supervisor Approval',
      labelAr: 'موافقة مشرف الأمن',
      actor: 'Security Supervisor',
      actorAr: 'مشرف الأمن',
      dbStatus: 'pending_security_approval',
      description: 'Final approval & QR code generation',
      descriptionAr: 'الموافقة النهائية وإنشاء رمز QR'
    },
    {
      id: 'security_decision',
      type: 'decision',
      label: 'Approved?',
      labelAr: 'تمت الموافقة؟'
    },
    
    // --- 5. APPROVED STATUS ---
    {
      id: 'pass_approved',
      type: 'action',
      label: 'Pass Approved (QR Generated)',
      labelAr: 'تمت الموافقة على التصريح (تم إنشاء QR)',
      dbStatus: 'approved',
      notificationAction: 'gate_pass_approved'
    },
    
    // --- 6. GATE OPERATIONS ---
    {
      id: 'guard_scan_entry',
      type: 'action',
      label: 'Security Guard: Scan & Verify Entry',
      labelAr: 'حارس الأمن: مسح والتحقق من الدخول',
      actor: 'Security Guard',
      actorAr: 'حارس الأمن',
      dbStatus: 'used',
      description: 'Item-by-item verification with photos',
      descriptionAr: 'التحقق من عنصر تلو الآخر مع الصور'
    },
    {
      id: 'movement_type_check',
      type: 'decision',
      label: 'Entry & Exit Pass?',
      labelAr: 'تصريح دخول وخروج؟'
    },
    {
      id: 'guard_scan_exit',
      type: 'action',
      label: 'Security Guard: Scan & Verify Exit',
      labelAr: 'حارس الأمن: مسح والتحقق من الخروج',
      actor: 'Security Guard',
      actorAr: 'حارس الأمن',
      dbStatus: 'completed',
      description: 'Vehicle & driver matching validation',
      descriptionAr: 'التحقق من مطابقة المركبة والسائق'
    },
    
    // --- 7. COMPLETION ---
    {
      id: 'pass_completed',
      type: 'end',
      label: 'Pass Completed',
      labelAr: 'اكتمل التصريح',
      dbStatus: 'completed'
    },
    
    // --- REJECTION PATH ---
    {
      id: 'pass_rejected',
      type: 'end',
      label: 'Pass Rejected',
      labelAr: 'تم رفض التصريح',
      dbStatus: 'rejected'
    }
  ],
  connections: [
    // Main flow
    { from: 'request_submit', to: 'contractor_approval' },
    { from: 'contractor_approval', to: 'contractor_decision' },
    { from: 'contractor_decision', to: 'club_mgmt_ack', condition: 'approve' },
    { from: 'contractor_decision', to: 'pass_rejected', condition: 'reject' },
    
    { from: 'club_mgmt_ack', to: 'club_mgmt_decision' },
    { from: 'club_mgmt_decision', to: 'security_approval', condition: 'approve' },
    { from: 'club_mgmt_decision', to: 'pass_rejected', condition: 'reject' },
    
    { from: 'security_approval', to: 'security_decision' },
    { from: 'security_decision', to: 'pass_approved', condition: 'approve' },
    { from: 'security_decision', to: 'pass_rejected', condition: 'reject' },
    
    // Gate operations
    { from: 'pass_approved', to: 'guard_scan_entry' },
    { from: 'guard_scan_entry', to: 'movement_type_check' },
    { from: 'movement_type_check', to: 'guard_scan_exit', condition: 'yes', label: 'In & Out', labelAr: 'دخول وخروج' },
    { from: 'movement_type_check', to: 'pass_completed', condition: 'no', label: 'Entry Only', labelAr: 'دخول فقط' },
    { from: 'guard_scan_exit', to: 'pass_completed' }
  ]
};

// ============= ALL WORKFLOWS =============
export const allWorkflows: WorkflowDefinition[] = [
  incidentWorkflowV1_1,
  internalGatePassWorkflow,
  externalGatePassWorkflow,
];

export function getWorkflowsByCategory(category: WorkflowCategory): WorkflowDefinition[] {
  return allWorkflows.filter(w => w.category === category);
}

export function getWorkflowById(id: string): WorkflowDefinition | undefined {
  return allWorkflows.find(w => w.id === id);
}
