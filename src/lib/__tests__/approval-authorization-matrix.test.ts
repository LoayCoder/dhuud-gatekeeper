import { describe, it, expect } from 'vitest';
import {
  APPROVAL_MATRIX,
  getApprovalRule,
  isRoleBlocked,
  isRoleAllowed,
  getBlockedStatusesForRole,
  validateApprovalMatrix,
} from '@/lib/approval-authorization-matrix';
import {
  CONTRACTOR_CONSULTANT_STATUSES,
  HSSE_EXPERT_STATUSES,
  getWorkflowOwner,
  canRoleActOnStatus,
} from '@/lib/workflow-status-resolver';

describe('Approval Authorization Matrix', () => {
  describe('Matrix Integrity', () => {
    it('should pass internal validation (no contradictions)', () => {
      const result = validateApprovalMatrix();
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.error('Matrix validation errors:', result.errors);
      }
    });

    it('should have no overlap between CONTRACTOR_CONSULTANT_STATUSES and HSSE_EXPERT_STATUSES', () => {
      const consultantSet = new Set(CONTRACTOR_CONSULTANT_STATUSES as readonly string[]);
      const expertSet = new Set(HSSE_EXPERT_STATUSES as readonly string[]);
      const overlap = [...consultantSet].filter(s => expertSet.has(s));
      expect(overlap).toEqual([]);
    });
  });

  describe('HSSE Expert Contractor Restriction (Root Cause Fix)', () => {
    const consultantStatuses = [
      'expert_screening',
      'pending_consultant_screening',
      'pending_consultant_review',
      'pending_consultant_actions',
      'pending_consultant_verification',
    ];

    it.each(consultantStatuses)(
      'HSSE Expert should be BLOCKED for contractor observations in %s',
      (status) => {
        expect(isRoleBlocked(status, 'hsse_expert', true)).toBe(true);
        expect(isRoleBlocked(status, 'hsse_officer', true)).toBe(true);
        expect(isRoleBlocked(status, 'hsse_investigator', true)).toBe(true);
      }
    );

    it.each(consultantStatuses)(
      'HSSE Expert should be ALLOWED for non-contractor observations in %s',
      (status) => {
        expect(isRoleAllowed(status, 'hsse_expert', false)).toBe(true);
      }
    );

    it.each(consultantStatuses)(
      'Contractor Consultant should be ALLOWED for contractor observations in %s',
      (status) => {
        expect(isRoleAllowed(status, 'contractor_consultant', true)).toBe(true);
      }
    );

    it.each(consultantStatuses)(
      'Admin should ALWAYS be allowed in %s regardless of contractor flag',
      (status) => {
        expect(isRoleAllowed(status, 'admin', true)).toBe(true);
        expect(isRoleAllowed(status, 'admin', false)).toBe(true);
      }
    );

    it.each(consultantStatuses)(
      'HSSE Manager should ALWAYS be allowed in %s as fallback',
      (status) => {
        expect(isRoleAllowed(status, 'hsse_manager', true)).toBe(true);
        expect(isRoleAllowed(status, 'hsse_manager', false)).toBe(true);
      }
    );
  });

  describe('Standard Workflow Statuses', () => {
    it('pending_manager_approval should allow department_manager and admin', () => {
      expect(isRoleAllowed('pending_manager_approval', 'department_manager', false)).toBe(true);
      expect(isRoleAllowed('pending_manager_approval', 'admin', false)).toBe(true);
    });

    it('pending_hsse_review should allow HSSE roles', () => {
      expect(isRoleAllowed('pending_hsse_review', 'hsse_expert', false)).toBe(true);
      expect(isRoleAllowed('pending_hsse_review', 'hsse_manager', false)).toBe(true);
      expect(isRoleAllowed('pending_hsse_review', 'admin', false)).toBe(true);
    });

    it('pending_closure should only allow hsse_manager and admin', () => {
      expect(isRoleAllowed('pending_closure', 'hsse_manager', false)).toBe(true);
      expect(isRoleAllowed('pending_closure', 'admin', false)).toBe(true);
      expect(isRoleAllowed('pending_closure', 'hsse_expert', false)).toBe(false);
    });
  });

  describe('Blocked Statuses Audit', () => {
    it('should return all consultant statuses as blocked for hsse_expert with contractor', () => {
      const blocked = getBlockedStatusesForRole('hsse_expert');
      expect(blocked).toContain('pending_consultant_screening');
      expect(blocked).toContain('pending_consultant_review');
      expect(blocked).toContain('pending_consultant_actions');
      expect(blocked).toContain('pending_consultant_verification');
      expect(blocked).toContain('expert_screening');
    });
  });

  describe('Workflow Owner Resolution', () => {
    it('should return Contractor Consultant for contractor observation in consultant statuses', () => {
      const owner = getWorkflowOwner('pending_consultant_screening', true);
      expect(owner?.role).toBe('contractor_consultant');
    });

    it('should return HSSE Expert for non-contractor observation in expert statuses', () => {
      const owner = getWorkflowOwner('pending_hsse_validation', false);
      expect(owner?.role).toBe('hsse_expert');
    });

    it('should return null for terminal statuses', () => {
      expect(getWorkflowOwner('closed', false)).toBeNull();
    });
  });

  describe('canRoleActOnStatus Integration', () => {
    it('should block hsse_expert from contractor consultant statuses', () => {
      expect(canRoleActOnStatus('hsse_expert', 'pending_consultant_screening', true)).toBe(false);
    });

    it('should allow contractor_consultant on contractor consultant statuses', () => {
      expect(canRoleActOnStatus('contractor_consultant', 'pending_consultant_screening', true)).toBe(true);
    });

    it('should allow admin on any status', () => {
      expect(canRoleActOnStatus('admin', 'pending_consultant_screening', true)).toBe(true);
      expect(canRoleActOnStatus('admin', 'pending_closure', false)).toBe(true);
    });
  });
});
