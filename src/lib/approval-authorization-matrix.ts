/**
 * Central Approval Authorization Matrix
 * ======================================
 * Single source of truth for status → allowed roles mapping.
 * 
 * This matrix defines WHO can act on WHAT status, factoring in:
 * - The current workflow status
 * - Whether the record is against a contractor
 * - The user's role
 * - Fallback roles (admin, hsse_manager)
 * 
 * Used for:
 * - Frontend permission gating (action cards, pending approvals visibility)
 * - Documentation of the intended governance model
 * - Regression validation reference
 * 
 * Backend enforcement remains in the RPC functions:
 * - can_approve_investigation (incidents/observations)
 * - can_approve_dept_rep_observation (dept rep specific)
 * - can_approve_gate_pass (gate passes)
 */

// ============================================
// TYPES
// ============================================

export interface ApprovalRule {
  /** Primary owner role for this status */
  primaryOwner: string;
  /** Roles explicitly allowed to act */
  allowedRoles: string[];
  /** Roles explicitly blocked from acting */
  blockedRoles: string[];
  /** Whether this status is contractor-workflow-only */
  contractorOnly: boolean;
  /** Whether self-approval by reporter is blocked */
  reporterBlocked: boolean;
  /** Human-readable action description */
  action: string;
  /** Fallback roles that can always act (admin, hsse_manager) */
  fallbackRoles: string[];
}

// ============================================
// MATRIX DEFINITION
// ============================================

/**
 * Observation & Incident Approval Matrix
 * 
 * Each entry maps: status → { rules for contractor, rules for non-contractor }
 * 
 * IMPORTANT: This matrix is the REFERENCE for what the backend RPCs enforce.
 * Any change here should be reflected in the corresponding RPC migration.
 */
export const APPROVAL_MATRIX: Record<string, {
  contractor: ApprovalRule;
  nonContractor: ApprovalRule;
}> = {
  // =====================================================
  // CONTRACTOR CONSULTANT WORKFLOW STATUSES
  // =====================================================

  expert_screening: {
    contractor: {
      primaryOwner: 'contractor_consultant',
      allowedRoles: ['contractor_consultant', 'admin', 'hsse_manager'],
      blockedRoles: ['hsse_expert', 'hsse_officer', 'hsse_investigator'],
      contractorOnly: false,
      reporterBlocked: false, // Consultant can self-screen
      action: 'screen',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
    nonContractor: {
      primaryOwner: 'hsse_expert',
      allowedRoles: ['hsse_expert', 'hsse_officer', 'hsse_investigator', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'screen',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
  },

  pending_consultant_screening: {
    contractor: {
      primaryOwner: 'contractor_consultant',
      allowedRoles: ['contractor_consultant', 'admin', 'hsse_manager'],
      blockedRoles: ['hsse_expert', 'hsse_officer', 'hsse_investigator'],
      contractorOnly: true,
      reporterBlocked: false,
      action: 'screen',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
    nonContractor: {
      primaryOwner: 'hsse_expert',
      allowedRoles: ['hsse_expert', 'hsse_officer', 'hsse_investigator', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'screen',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
  },

  pending_consultant_review: {
    contractor: {
      primaryOwner: 'contractor_consultant',
      allowedRoles: ['contractor_consultant', 'admin', 'hsse_manager'],
      blockedRoles: ['hsse_expert', 'hsse_officer', 'hsse_investigator'],
      contractorOnly: true,
      reporterBlocked: false,
      action: 'review',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
    nonContractor: {
      primaryOwner: 'hsse_expert',
      allowedRoles: ['hsse_expert', 'hsse_officer', 'hsse_investigator', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'review',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
  },

  pending_consultant_actions: {
    contractor: {
      primaryOwner: 'contractor_consultant',
      allowedRoles: ['contractor_consultant', 'admin', 'hsse_manager'],
      blockedRoles: ['hsse_expert', 'hsse_officer', 'hsse_investigator'],
      contractorOnly: true,
      reporterBlocked: false,
      action: 'create_actions',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
    nonContractor: {
      primaryOwner: 'hsse_expert',
      allowedRoles: ['hsse_expert', 'hsse_officer', 'hsse_investigator', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'create_actions',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
  },

  pending_consultant_verification: {
    contractor: {
      primaryOwner: 'contractor_consultant',
      allowedRoles: ['contractor_consultant', 'admin', 'hsse_manager'],
      blockedRoles: ['hsse_expert', 'hsse_officer', 'hsse_investigator'],
      contractorOnly: true,
      reporterBlocked: false,
      action: 'verify',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
    nonContractor: {
      primaryOwner: 'hsse_expert',
      allowedRoles: ['hsse_expert', 'hsse_officer', 'hsse_investigator', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'verify',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
  },

  pending_site_client_approval: {
    contractor: {
      primaryOwner: 'site_client',
      allowedRoles: ['site_client', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: true,
      reporterBlocked: false,
      action: 'approve',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
    nonContractor: {
      primaryOwner: 'site_client',
      allowedRoles: ['site_client', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'approve',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
  },

  pending_contractor_implementation: {
    contractor: {
      primaryOwner: 'contractor',
      allowedRoles: ['contractor', 'contractor_consultant', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: true,
      reporterBlocked: false,
      action: 'implement',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
    nonContractor: {
      primaryOwner: 'contractor',
      allowedRoles: ['contractor', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'implement',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
  },

  // =====================================================
  // STANDARD WORKFLOW STATUSES
  // =====================================================

  pending_manager_approval: {
    contractor: {
      primaryOwner: 'department_manager',
      allowedRoles: ['department_manager', 'admin'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'approve',
      fallbackRoles: ['admin'],
    },
    nonContractor: {
      primaryOwner: 'department_manager',
      allowedRoles: ['department_manager', 'admin'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'approve',
      fallbackRoles: ['admin'],
    },
  },

  pending_dept_rep_review: {
    contractor: {
      primaryOwner: 'department_representative',
      allowedRoles: ['department_representative', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'review',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
    nonContractor: {
      primaryOwner: 'department_representative',
      allowedRoles: ['department_representative', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'review',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
  },

  pending_hsse_review: {
    contractor: {
      primaryOwner: 'hsse_expert',
      allowedRoles: ['hsse_expert', 'hsse_officer', 'hsse_investigator', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'review',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
    nonContractor: {
      primaryOwner: 'hsse_expert',
      allowedRoles: ['hsse_expert', 'hsse_officer', 'hsse_investigator', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'review',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
  },

  under_investigation: {
    contractor: {
      primaryOwner: 'investigator',
      allowedRoles: ['investigator', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'investigate',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
    nonContractor: {
      primaryOwner: 'investigator',
      allowedRoles: ['investigator', 'admin', 'hsse_manager'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'investigate',
      fallbackRoles: ['admin', 'hsse_manager'],
    },
  },

  pending_closure: {
    contractor: {
      primaryOwner: 'hsse_manager',
      allowedRoles: ['hsse_manager', 'admin'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'close',
      fallbackRoles: ['admin'],
    },
    nonContractor: {
      primaryOwner: 'hsse_manager',
      allowedRoles: ['hsse_manager', 'admin'],
      blockedRoles: [],
      contractorOnly: false,
      reporterBlocked: true,
      action: 'close',
      fallbackRoles: ['admin'],
    },
  },
};

// ============================================
// LOOKUP FUNCTIONS
// ============================================

/**
 * Get the approval rule for a given status and contractor context.
 * Returns null if the status is not in the matrix (terminal states, etc.)
 */
export function getApprovalRule(
  status: string,
  isAgainstContractor: boolean
): ApprovalRule | null {
  const entry = APPROVAL_MATRIX[status];
  if (!entry) return null;
  return isAgainstContractor ? entry.contractor : entry.nonContractor;
}

/**
 * Check if a role is explicitly blocked from acting on a status.
 * This is a frontend-side guard; the backend RPC is the authority.
 */
export function isRoleBlocked(
  status: string,
  role: string,
  isAgainstContractor: boolean
): boolean {
  const rule = getApprovalRule(status, isAgainstContractor);
  if (!rule) return false;
  return rule.blockedRoles.includes(role);
}

/**
 * Check if a role is in the allowed list for a status.
 * Does NOT replace the backend RPC — use for UI pre-filtering only.
 */
export function isRoleAllowed(
  status: string,
  role: string,
  isAgainstContractor: boolean
): boolean {
  const rule = getApprovalRule(status, isAgainstContractor);
  if (!rule) return false;
  return rule.allowedRoles.includes(role) || rule.fallbackRoles.includes(role);
}

/**
 * Get all statuses where a specific role is explicitly blocked
 * when the record is against a contractor.
 * Useful for audit and validation.
 */
export function getBlockedStatusesForRole(role: string): string[] {
  return Object.entries(APPROVAL_MATRIX)
    .filter(([_, entry]) => entry.contractor.blockedRoles.includes(role))
    .map(([status]) => status);
}

/**
 * Validate that the matrix is consistent:
 * - No role appears in both allowedRoles and blockedRoles for same entry
 * - fallbackRoles are always in allowedRoles
 * 
 * Call during development/testing to catch matrix definition errors.
 */
export function validateApprovalMatrix(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [status, entry] of Object.entries(APPROVAL_MATRIX)) {
    for (const context of ['contractor', 'nonContractor'] as const) {
      const rule = entry[context];
      const prefix = `${status}.${context}`;

      // Check no role is in both allowed and blocked
      for (const role of rule.blockedRoles) {
        if (rule.allowedRoles.includes(role)) {
          errors.push(`${prefix}: "${role}" is in both allowedRoles and blockedRoles`);
        }
      }

      // Check fallback roles are in allowed roles
      for (const role of rule.fallbackRoles) {
        if (!rule.allowedRoles.includes(role)) {
          errors.push(`${prefix}: fallback role "${role}" is not in allowedRoles`);
        }
      }

      // Check primaryOwner is in allowedRoles
      if (!rule.allowedRoles.includes(rule.primaryOwner)) {
        errors.push(`${prefix}: primaryOwner "${rule.primaryOwner}" is not in allowedRoles`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
