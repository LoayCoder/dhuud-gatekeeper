import { useMemo } from "react";
import { useDocumentControllerAccess } from "./use-document-controller-access";
import { useAuth } from "@/contexts/AuthContext";

export interface ContractorRepPermissions {
  canAddWorkers: boolean;
  canEditBasicInfo: boolean;
  canApprove: boolean;
  canChangeStatus: boolean;
  canBlacklist: boolean;
  canDelete: boolean;
  isDocumentController: boolean;
  isLoading: boolean;
}

/**
 * Hook to get role-based permissions for contractor worker management.
 * 
 * Contractor Site Representatives can:
 * - Add workers (saved as 'pending')
 * - Edit worker basic info (triggers re-approval for approved workers)
 * 
 * Document Controllers and Admins can:
 * - All of the above
 * - Approve/reject workers
 * - Change worker status
 * - Blacklist workers
 * - Delete workers
 */
export function useContractorRepPermissions(): ContractorRepPermissions {
  const { profile, isAdmin } = useAuth();
  const { data: hasDocControllerAccess, isLoading } = useDocumentControllerAccess();

  const permissions = useMemo(() => {
    const isDocumentController = hasDocControllerAccess || isAdmin;

    return {
      canAddWorkers: true, // All authenticated users with company access can add
      canEditBasicInfo: true, // All can edit basic info
      canApprove: isDocumentController,
      canChangeStatus: isDocumentController,
      canBlacklist: isDocumentController,
      canDelete: isDocumentController,
      isDocumentController,
      isLoading,
    };
  }, [hasDocControllerAccess, isAdmin, isLoading]);

  return permissions;
}
