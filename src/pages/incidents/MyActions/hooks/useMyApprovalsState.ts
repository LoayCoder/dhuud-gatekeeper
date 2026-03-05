import { useState } from 'react';
import { useUserRoles } from '@/features/users';
import { usePendingActionApprovals, usePendingSeverityApprovals, usePendingPotentialSeverityApprovals, usePendingIncidentApprovals, useCanAccessApprovals, type PendingActionApproval } from '@/hooks/use-pending-approvals';
import { usePendingClosureRequests } from '@/features/incidents';
import { usePendingExtensionRequests } from '@/features/incidents';
import { usePendingWorkerApprovals } from '@/features/contractors/hooks/use-contractor-workers';
import { usePendingGatePassApprovals, useApproveGatePass, MaterialGatePass } from '@/features/contractors/hooks/use-material-gate-passes';
import { usePendingCompanyApprovals, useApproveCompany, useRejectCompany, useHardDeleteContractorCompany, ContractorCompany } from '@/features/contractors/hooks/use-contractor-companies';

export function useMyApprovalsState() {
  const { canAccess: canAccessApprovals, canApproveSeverity, canVerifyActions } = useCanAccessApprovals();
  const { hasRole } = useUserRoles();
  const { data: pendingApprovals, isLoading: pendingApprovalsLoading } = usePendingActionApprovals();
  const { data: pendingSeverity, isLoading: severityLoading } = usePendingSeverityApprovals();
  const { data: pendingPotentialSeverity, isLoading: potentialSeverityLoading } = usePendingPotentialSeverityApprovals();
  const { data: pendingIncidentApprovals, isLoading: incidentApprovalsLoading } = usePendingIncidentApprovals();
  const { data: pendingClosures, isLoading: closuresLoading } = usePendingClosureRequests();
  const { data: pendingExtensions, isLoading: extensionsLoading } = usePendingExtensionRequests();
  const [selectedActionForVerification, setSelectedActionForVerification] = useState<PendingActionApproval | null>(null);

  const { data: pendingWorkers, isLoading: workersLoading } = usePendingWorkerApprovals();
  const { data: pendingGatePasses, isLoading: gatePassesLoading } = usePendingGatePassApprovals();
  const canApproveWorkers = hasRole('admin') || hasRole('security_supervisor') || hasRole('security_manager');
  const canApproveGatePasses = hasRole('admin') || hasRole('security_supervisor') || hasRole('project_manager');

  const [gatePassApprovalNotes, setGatePassApprovalNotes] = useState<Record<string, string>>({});
  const [rejectingGatePass, setRejectingGatePass] = useState<MaterialGatePass | null>(null);
  const approveGatePass = useApproveGatePass();

  const { data: pendingCompanies, isLoading: companiesLoading } = usePendingCompanyApprovals();
  const approveCompany = useApproveCompany();
  const rejectCompany = useRejectCompany();
  const hardDeleteCompany = useHardDeleteContractorCompany();
  const [rejectingCompany, setRejectingCompany] = useState<ContractorCompany | null>(null);
  const [companyRejectionReason, setCompanyRejectionReason] = useState("");
  const [deletingCompany, setDeletingCompany] = useState<ContractorCompany | null>(null);

  const handleApproveGatePass = (pass: MaterialGatePass) => {
    approveGatePass.mutate({ passId: pass.id, action: "approve", notes: gatePassApprovalNotes[pass.id] });
  };

  const canApproveClosures = hasRole('admin') || hasRole('hsse_manager');
  const isHSSEManager = hasRole('hsse_manager');

  const totalExtensions = pendingExtensions?.length || 0;
  const contractorApprovalCount = (canApproveWorkers ? (pendingWorkers?.length || 0) : 0) + (canApproveGatePasses ? (pendingGatePasses?.length || 0) : 0);
  const totalPendingApprovals = (canVerifyActions ? (pendingApprovals?.length || 0) : 0) + (canApproveSeverity ? ((pendingSeverity?.length || 0) + (pendingPotentialSeverity?.length || 0)) : 0) + (pendingIncidentApprovals?.length || 0) + (canApproveClosures ? (pendingClosures?.length || 0) : 0) + totalExtensions + contractorApprovalCount;

  const approvalsLoading = false;

  return {
    canAccessApprovals, canApproveSeverity, canVerifyActions, pendingApprovals, pendingSeverity, pendingPotentialSeverity, pendingIncidentApprovals, pendingClosures, pendingExtensions, selectedActionForVerification, setSelectedActionForVerification, pendingWorkers, pendingGatePasses, canApproveWorkers, canApproveGatePasses, gatePassApprovalNotes, setGatePassApprovalNotes, rejectingGatePass, setRejectingGatePass, approveGatePass, pendingCompanies, approveCompany, rejectCompany, hardDeleteCompany, rejectingCompany, setRejectingCompany, companyRejectionReason, setCompanyRejectionReason, deletingCompany, setDeletingCompany, handleApproveGatePass, canApproveClosures, isHSSEManager, totalPendingApprovals, approvalsLoading
  };
}
