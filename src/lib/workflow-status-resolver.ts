/**
 * Unified Workflow Status Resolver
 * Single source of truth for workflow status → owner/action mapping
 * 
 * This resolves the architectural issue of multiple workflow tracking components
 * with duplicated and potentially conflicting status logic.
 */

export interface WorkflowOwner {
  role: string;
  roleKey: string;
  label: string;
  labelAr: string;
}

export interface WorkflowStepInfo {
  stepKey: string;
  owner: WorkflowOwner;
  allowedActions: string[];
  nextStep?: string;
}

// ============================================
// CONTRACTOR OBSERVATION WORKFLOW STATUSES
// ============================================

/**
 * Statuses where Contractor Consultant is the current owner/actor
 * Includes both legacy ('expert_screening') and new status names
 */
export const CONTRACTOR_CONSULTANT_STATUSES = [
  'expert_screening',              // Legacy status for contractor consultant screening
  'pending_consultant_screening',  // New status name
  'pending_consultant_review',     // Consultant reviewing actions
  'pending_consultant_actions',    // Consultant creating actions
  'pending_action_dispute_review', // Consultant reviewing action dispute from contractor
] as const;

/**
 * Statuses where Site Client is the current owner/actor
 */
export const SITE_CLIENT_STATUSES = [
  'pending_site_client_approval',
  'pending_site_client_action_approval',
] as const;

/**
 * Statuses where Contractor is the current owner/actor
 */
export const CONTRACTOR_STATUSES = [
  'contractor_action_implementation',
  'pending_contractor_action',
  'pending_contractor_dispute',
] as const;

/**
 * Statuses where HSSE Expert is the current owner/actor
 */
export const HSSE_EXPERT_STATUSES = [
  'pending_hsse_expert_review',
  'pending_hsse_expert_approval',
] as const;

/**
 * Statuses where HSSE Manager is the current owner/actor
 */
export const HSSE_MANAGER_STATUSES = [
  'pending_hsse_manager_closure',
  'pending_hsse_manager_approval',
] as const;

/**
 * Statuses where Department Representative is the current owner/actor
 */
export const DEPT_REP_STATUSES = [
  'pending_dept_rep_approval',
  'pending_dept_rep_review',
] as const;

// ============================================
// OWNER DEFINITIONS
// ============================================

export const WORKFLOW_OWNERS: Record<string, WorkflowOwner> = {
  contractor_consultant: {
    role: 'contractor_consultant',
    roleKey: 'contractor_consultant',
    label: 'Contractor Consultant',
    labelAr: 'مستشار المقاول',
  },
  site_client: {
    role: 'site_client',
    roleKey: 'site_client',
    label: 'Site Client',
    labelAr: 'عميل الموقع',
  },
  contractor: {
    role: 'contractor',
    roleKey: 'contractor',
    label: 'Contractor',
    labelAr: 'المقاول',
  },
  hsse_expert: {
    role: 'hsse_expert',
    roleKey: 'hsse_expert',
    label: 'HSSE Expert',
    labelAr: 'خبير السلامة',
  },
  hsse_manager: {
    role: 'hsse_manager',
    roleKey: 'hsse_manager',
    label: 'HSSE Manager',
    labelAr: 'مدير السلامة',
  },
  dept_rep: {
    role: 'dept_rep',
    roleKey: 'dept_rep',
    label: 'Department Representative',
    labelAr: 'ممثل القسم',
  },
  reporter: {
    role: 'reporter',
    roleKey: 'reporter',
    label: 'Reporter',
    labelAr: 'المبلغ',
  },
};

// ============================================
// RESOLVER FUNCTIONS
// ============================================

/**
 * Get the current workflow owner based on incident status
 * Works for both contractor and normal observation workflows
 */
export function getWorkflowOwner(status: string, isContractor: boolean): WorkflowOwner | null {
  if (!status) return null;
  
  // Contractor observation workflow
  if (isContractor) {
    if ((CONTRACTOR_CONSULTANT_STATUSES as readonly string[]).includes(status)) {
      return WORKFLOW_OWNERS.contractor_consultant;
    }
    if ((SITE_CLIENT_STATUSES as readonly string[]).includes(status)) {
      return WORKFLOW_OWNERS.site_client;
    }
    if ((CONTRACTOR_STATUSES as readonly string[]).includes(status)) {
      return WORKFLOW_OWNERS.contractor;
    }
  }
  
  // Common statuses (both contractor and normal workflows)
  if ((HSSE_EXPERT_STATUSES as readonly string[]).includes(status)) {
    return WORKFLOW_OWNERS.hsse_expert;
  }
  if ((HSSE_MANAGER_STATUSES as readonly string[]).includes(status)) {
    return WORKFLOW_OWNERS.hsse_manager;
  }
  if ((DEPT_REP_STATUSES as readonly string[]).includes(status)) {
    return WORKFLOW_OWNERS.dept_rep;
  }
  
  // Initial submission
  if (status === 'submitted' || status === 'draft') {
    return WORKFLOW_OWNERS.reporter;
  }
  
  return null;
}

/**
 * Check if a user role can act on the current workflow status
 */
export function canRoleActOnStatus(role: string, status: string, isContractor: boolean): boolean {
  const owner = getWorkflowOwner(status, isContractor);
  if (!owner) return false;
  
  // Normalize role names for comparison
  const normalizedRole = role.toLowerCase().replace(/[^a-z_]/g, '');
  const normalizedOwnerRole = owner.role.toLowerCase().replace(/[^a-z_]/g, '');
  
  return normalizedRole === normalizedOwnerRole;
}

/**
 * Check if status is at contractor consultant step
 * This is the primary check for showing ConsultantReviewCard
 */
export function isContractorConsultantStep(status: string): boolean {
  return (CONTRACTOR_CONSULTANT_STATUSES as readonly string[]).includes(status);
}

/**
 * Check if status is at site client step
 */
export function isSiteClientStep(status: string): boolean {
  return (SITE_CLIENT_STATUSES as readonly string[]).includes(status);
}

/**
 * Check if status is at contractor implementation step
 */
export function isContractorImplementationStep(status: string): boolean {
  return (CONTRACTOR_STATUSES as readonly string[]).includes(status);
}

/**
 * Check if status is at HSSE expert step
 */
export function isHSSEExpertStep(status: string): boolean {
  return (HSSE_EXPERT_STATUSES as readonly string[]).includes(status);
}

/**
 * Check if status is at HSSE manager step
 */
export function isHSSEManagerStep(status: string): boolean {
  return (HSSE_MANAGER_STATUSES as readonly string[]).includes(status);
}

/**
 * Get the display label for a status
 */
export function getStatusDisplayLabel(status: string, isArabic: boolean = false): string {
  const statusLabels: Record<string, { en: string; ar: string }> = {
    // Contractor Consultant steps
    expert_screening: { en: 'Consultant Screening', ar: 'فحص المستشار' },
    pending_consultant_screening: { en: 'Consultant Screening', ar: 'فحص المستشار' },
    pending_consultant_review: { en: 'Consultant Review', ar: 'مراجعة المستشار' },
    pending_consultant_actions: { en: 'Creating Actions', ar: 'إنشاء الإجراءات' },
    pending_action_dispute_review: { en: 'Dispute Review', ar: 'مراجعة النزاع' },
    
    // Site Client steps
    pending_site_client_approval: { en: 'Site Client Approval', ar: 'موافقة عميل الموقع' },
    pending_site_client_action_approval: { en: 'Action Approval', ar: 'موافقة الإجراءات' },
    
    // Contractor steps
    contractor_action_implementation: { en: 'Contractor Implementation', ar: 'تنفيذ المقاول' },
    pending_contractor_action: { en: 'Contractor Action', ar: 'إجراء المقاول' },
    pending_contractor_dispute: { en: 'Contractor Dispute', ar: 'نزاع المقاول' },
    
    // HSSE steps
    pending_hsse_expert_review: { en: 'HSSE Expert Review', ar: 'مراجعة خبير السلامة' },
    pending_hsse_manager_closure: { en: 'HSSE Manager Closure', ar: 'إغلاق مدير السلامة' },
    
    // Department Rep steps
    pending_dept_rep_approval: { en: 'Dept Rep Approval', ar: 'موافقة ممثل القسم' },
    pending_dept_rep_review: { en: 'Dept Rep Review', ar: 'مراجعة ممثل القسم' },
    
    // Terminal states
    closed: { en: 'Closed', ar: 'مغلق' },
    hsse_enforced: { en: 'HSSE Enforced', ar: 'تم الإنفاذ' },
    submitted: { en: 'Submitted', ar: 'مقدم' },
    draft: { en: 'Draft', ar: 'مسودة' },
  };
  
  const labels = statusLabels[status];
  if (!labels) return status;
  
  return isArabic ? labels.ar : labels.en;
}
