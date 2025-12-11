import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/use-user-roles";

interface Investigation {
  id: string;
  investigator_id?: string | null;
  [key: string]: unknown;
}

interface Incident {
  id: string;
  status?: string | null;
  [key: string]: unknown;
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
  
  const isClosed = incident?.status === 'closed';

  // Can edit: only assigned investigator when incident is not closed
  const canEdit = isAssignedInvestigator && !isClosed;

  // Can view: oversight roles or assigned investigator
  const canView = isOversightRole || isAssignedInvestigator;

  // Is read-only: not the assigned investigator OR incident is closed
  const isReadOnly = !isAssignedInvestigator || isClosed;

  // Can reopen: only HSSE Manager when incident is closed
  const canReopen = (isHSSEManager || isAdmin) && isClosed;

  return {
    canEdit,
    canView,
    isReadOnly,
    isOversightRole,
    isAssignedInvestigator,
    isClosed,
    canReopen,
    isLoading,
  };
}
