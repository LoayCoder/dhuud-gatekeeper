import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/use-user-roles";

interface Investigation {
  id: string;
  investigator_id?: string | null;
}

interface Incident {
  id: string;
  status?: string | null;
}

/**
 * Hook to determine investigation edit access based on user roles and incident status.
 * 
 * - Only the assigned investigator can edit investigation data
 * - HSSE Managers, HSSE Experts, and Admins have read-only access for oversight
 * - Closed incidents are read-only for everyone
 * - Only HSSE Managers can reopen closed incidents
 */
export function useInvestigationEditAccess(
  investigation: Investigation | null | undefined,
  incident: Incident | null | undefined
) {
  const { user, isAdmin } = useAuth();
  const { hasRole, hasRoleInCategory, isLoading } = useUserRoles();

  const isAssignedInvestigator = !!(investigation?.investigator_id && user?.id && investigation.investigator_id === user.id);
  const isHSSEManager = hasRole('hsse_manager');
  const isHSSEExpert = hasRole('hsse_officer') || hasRole('hsse_expert') || hasRole('hsse_investigator');
  const isOversightRole = !!(isAdmin || isHSSEManager || isHSSEExpert);
  
  const isPendingClosure = incident?.status === 'pending_closure';
  const isInvestigationClosed = incident?.status === 'investigation_closed';
  const isPendingFinalClosure = incident?.status === 'pending_final_closure';
  const isClosed = incident?.status === 'closed';
  // All post-investigation statuses are locked for editing
  const isLocked = isClosed || isPendingClosure || isInvestigationClosed || isPendingFinalClosure;

  // Can edit: only assigned investigator when incident is not locked
  const canEdit = isAssignedInvestigator && !isLocked;

  // Can view: oversight roles or assigned investigator
  const canView = isOversightRole || isAssignedInvestigator;

  // Is read-only: not the assigned investigator OR incident is locked
  const isReadOnly = !isAssignedInvestigator || isLocked;

  // Can reopen: only HSSE Manager when incident is closed
  const canReopen = (isHSSEManager || isAdmin) && isClosed;

  // Can reject closure: only HSSE Manager when pending closure
  const canRejectClosure = (isHSSEManager || isAdmin) && isPendingClosure;

  // Can approve final closure: HSSE Manager when pending_final_closure
  const canApproveFinalClosure = (isHSSEManager || isAdmin) && isPendingFinalClosure;

  return {
    canEdit,
    canView,
    isReadOnly,
    isOversightRole,
    isAssignedInvestigator,
    isClosed,
    isPendingClosure,
    isInvestigationClosed,
    isPendingFinalClosure,
    isLocked,
    canReopen,
    canRejectClosure,
    canApproveFinalClosure,
    isLoading,
  };
}
