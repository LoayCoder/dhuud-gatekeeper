import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ExternalLink } from "lucide-react";
import type { SeverityLevelV2 } from "@/lib/hsse-severity-levels";
import {
  HSSEExpertScreeningCard,
  ReporterCorrectionBanner,
  RejectionConfirmationCard,
  ManagerApprovalCard,
  HSSEManagerEscalationCard,
  InvestigatorAssignmentStep,
  DeptRepApprovalCard,
  DeptRepIncidentReviewCard,
  HSSEEscalationReviewCard,
  HSSEValidationCard,
  DeptManagerViolationApprovalCard,
  ContractControllerApprovalCard,
  LegalReviewCard,
  DisputeResolutionCard,
  MonitoringCheckCard,
  ContractorDisputeCard,
  HSSEIncidentValidationCard,
  DeptManagerIncidentApprovalCard,
  ClinicReviewCard,
  TeamInvestigationAssignmentStep,
  HSSEExpertRejectionReviewCard,
  ObservationClosureGate,
  HSSEObservationValidationCard
} from '@/features/investigation';
import { ActionDisputeReviewCard, ConsultantReviewCard, SiteClientActionApprovalCard } from '@/features/investigation';
import { HSSEEnforcementBanner } from '@/features/investigation';
import type { IncidentWithDetails } from '@/features/incidents';

interface InvestigationWorkflowCardsProps {
  incidentData: IncidentWithDetails & Record<string, unknown>;
  investigation: Record<string, unknown>;
  actionsCount: number;
  handleCreateAction: () => void;
  handleRefresh: () => void;
}

export function InvestigationWorkflowCards({
  incidentData,
  investigation,
  actionsCount,
  handleCreateAction,
  handleRefresh
}: InvestigationWorkflowCardsProps) {
  if (!incidentData) return null;

  // Cast status to string to handle new enum values not yet in generated types
  const currentStatus = incidentData.status as string;

  switch (currentStatus) {
    case 'submitted':
      return (
        <HSSEExpertScreeningCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'returned_to_reporter':
      return (
        <ReporterCorrectionBanner
          incident={incidentData}
          onEdit={() => {/* TODO: Navigate to edit form */ }}
          onComplete={handleRefresh}
        />
      );

    case 'expert_rejected':
      return (
        <RejectionConfirmationCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'pending_manager_approval':
      return (
        <ManagerApprovalCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'pending_dept_rep_review':
    case 'pending_dept_rep_approval':
    case 'pending_dept_rep_mandatory_action':
      // Observations go through DeptRepApprovalCard (full access with actions)
      return (
        <DeptRepApprovalCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'pending_dept_rep_incident_review':
      // Incidents go through DeptRepIncidentReviewCard (read-only, approve/reject only)
      return (
        <DeptRepIncidentReviewCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'manager_rejected':
    case 'hsse_manager_escalation':
      return (
        <HSSEManagerEscalationCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'pending_hsse_escalation_review':
      // HSSE Expert reviews escalation request from Dept Rep
      return (
        <HSSEEscalationReviewCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'investigation_pending': {
      // Check severity for team investigation requirement
      const severityLevel = (incidentData.severity_v2 as string) || (incidentData.severity as string);
      const severityNumber = severityLevel ? parseInt(severityLevel.replace('level_', '')) : 1;

      // For L4-5, use TeamInvestigationAssignmentStep; for L3, it handles the toggle internally
      if (severityNumber >= 3) {
        return (
          <TeamInvestigationAssignmentStep
            incident={incidentData}
            onComplete={handleRefresh}
          />
        );
      }

      return (
        <InvestigatorAssignmentStep
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );
    }

    case 'pending_department_manager_approval':
      return (
        <DeptManagerIncidentApprovalCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'pending_clinic_review':
      return (
        <ClinicReviewCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    // --- CONTRACTOR VIOLATION APPROVAL WORKFLOW ---
    case 'pending_department_manager_violation_approval':
      return (
        <DeptManagerViolationApprovalCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'pending_contract_controller_approval':
      return (
        <ContractControllerApprovalCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'upgraded_to_incident':
      // Show info that observation was upgraded with link to the new incident
      return (
        <Card className="border-info/30 bg-info/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-info/10">
                <ArrowUpCircle className="h-5 w-5 text-info" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {t('workflow.upgradedToIncident.title', 'Upgraded to Incident')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('workflow.upgradedToIncident.description', 'This observation has been escalated and converted to a full incident for investigation.')}
                </p>
              </div>
              {incidentData.upgraded_to_incident_id && (
                <Button
                  variant="outline"
                  className="shrink-0"
                  onClick={() => {
                    window.open(`/incidents/${incidentData.upgraded_to_incident_id}`, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4 me-2" />
                  {t('workflow.upgradedToIncident.viewIncident', 'View Incident')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );

    case 'pending_hsse_rejection_review':
      return (
        <HSSEExpertRejectionReviewCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'pending_hsse_manager_closure':
      return (
        <ObservationClosureGate
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'observation_actions_pending':
      // Actions are in progress - show validation card for HSSE to monitor
      return (
        <HSSEObservationValidationCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'pending_hsse_validation':
      return (
        <HSSEObservationValidationCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    // --- NEW INCIDENT WORKFLOW STATUSES ---

    case 'pending_legal_review':
      return (
        <LegalReviewCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'dispute_resolution':
      return (
        <DisputeResolutionCard
          incident={incidentData}
          investigation={investigation || undefined}
          onComplete={handleRefresh}
        />
      );

    case 'monitoring_30_day':
    case 'monitoring_60_day':
    case 'monitoring_90_day':
      return (
        <MonitoringCheckCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'pending_contractor_dispute_review':
      return (
        <ContractorDisputeCard
          incident={incidentData}
          contractorId={incidentData.related_contractor_company_id as string}
          onComplete={handleRefresh}
        />
      );

    case 'pending_final_closure':
    case 'pending_hsse_incident_validation':
      return (
        <HSSEIncidentValidationCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    // --- CONTRACTOR OBSERVATION WORKFLOW STATUSES ---

    // Legacy status (expert_screening) and new status (pending_consultant_screening)
    case 'expert_screening':
    case 'pending_consultant_screening':
    case 'pending_consultant_review':
    case 'pending_consultant_actions':
      return (
        <ConsultantReviewCard
          incidentId={incidentData.id}
          status={currentStatus}
          assigneeId={incidentData.approval_manager_id}
          severityLevel={incidentData.severity_v2 ? incidentData.severity_v2 as SeverityLevelV2 : undefined}
          hasActions={actionsCount > 0}
          actionsCount={actionsCount}
          onActionCreated={handleCreateAction}
          onComplete={handleRefresh}
        />
      );

    case 'pending_site_client_approval':
      return (
        <SiteClientActionApprovalCard
          incidentId={incidentData.id}
          status={currentStatus}
          actionsCount={actionsCount}
          consultantNotes={incidentData.consultant_screening_notes || undefined}
        />
      );

    // Removing duplicate pending_dept_rep_review case

    case 'pending_hsse_expert_review':
      return (
        <HSSEValidationCard
          incident={incidentData}
          onComplete={handleRefresh}
        />
      );

    case 'pending_action_dispute_review':
      return (
        <ActionDisputeReviewCard
          incidentId={incidentData.id as string}
          status={currentStatus}
          disputeReason={incidentData.action_dispute_reason as string}
          contractorComments={incidentData.contractor_dispute_comments as string}
          onResolved={handleRefresh}
        />
      );

    case 'hsse_enforced':
      return (
        <HSSEEnforcementBanner
          enforcedAt={incidentData.hsse_enforced_at as string}
          enforcedBy={incidentData.hsse_enforced_by_profile as Record<string, unknown>}
          enforcementNotes={incidentData.enforcement_notes as string}
        />
      );

    default:
      return null;
  }
}
