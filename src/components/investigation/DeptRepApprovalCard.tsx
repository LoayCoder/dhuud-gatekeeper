import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ClipboardList, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Loader2,
  Plus,
  XCircle,
  Info
} from "lucide-react";
import { useDeptRepApproval, useCanApproveDeptRep } from "@/hooks/use-hsse-workflow";
import { useCorrectiveActionsCount, useDeptRepRejectObservation } from "@/hooks/use-observation-rejection";
import { ActionsPanel } from "./ActionsPanel";
import type { IncidentWithDetails } from "@/hooks/use-incidents";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DeptRepApprovalCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

const MIN_REJECTION_REASON_LENGTH = 20;

export function DeptRepApprovalCard({ incident, onComplete }: DeptRepApprovalCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [notes, setNotes] = useState("");
  const [showActions, setShowActions] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Use the new can_approve_dept_rep_observation RPC function for observations
  const { data: canApprove } = useCanApproveDeptRep(incident.id);
  const { data: actionsCount = 0, refetch: refetchActionsCount } = useCorrectiveActionsCount(incident.id);
  const deptRepApproval = useDeptRepApproval();
  const deptRepReject = useDeptRepRejectObservation();
  
  // Check if this is a mandatory action status (returned from HSSE Expert)
  // Using string comparison since the new status values are in DB but not yet in TS types
  const isMandatoryActionStatus = (incident.status as string) === 'pending_dept_rep_mandatory_action';
  
  // Only show for observations in pending_dept_rep_approval or pending_dept_rep_mandatory_action status
  if (!canApprove || incident.event_type !== 'observation') {
    return null;
  }
  
  // Validation: at least 1 corrective action required for approval
  const canApproveObservation = actionsCount >= 1;
  
  // Rejection reason validation
  const isRejectionReasonValid = rejectionReason.length >= MIN_REJECTION_REASON_LENGTH;
  
  const handleApproveAndClose = () => {
    deptRepApproval.mutate({
      incidentId: incident.id,
      decision: 'approve',
      notes,
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleEscalateToInvestigation = () => {
    deptRepApproval.mutate({
      incidentId: incident.id,
      decision: 'escalate',
      notes,
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleReject = () => {
    deptRepReject.mutate({
      incidentId: incident.id,
      rejectionReason,
    }, {
      onSuccess: () => {
        setShowRejectDialog(false);
        onComplete();
      },
    });
  };

  return (
    <div className="space-y-4" dir={direction}>
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">
                {t('workflow.deptRepApproval.title', 'Department Representative Review')}
              </CardTitle>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
              {t('workflow.deptRepApproval.pendingAction', 'Action Required')}
            </Badge>
          </div>
          <CardDescription>
            {t('workflow.deptRepApproval.description', 'Review this observation and assign corrective actions before approval')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mandatory Action Alert - shown when HSSE Expert rejected the rejection */}
          {isMandatoryActionStatus && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {t('workflow.deptRepApproval.mandatoryActionRequired', 'Action Required')}
              </AlertTitle>
              <AlertDescription>
                {t('workflow.deptRepApproval.mandatoryActionDescription', 'HSSE Expert rejected your rejection. You must add corrective action(s) and approve, or escalate to investigation.')}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Observation Summary */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{incident.reference_id}</span>
              <Badge variant="secondary">{incident.event_type}</Badge>
            </div>
            <h4 className="font-medium">{incident.title}</h4>
            <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
          </div>
          
          {/* Expert Screening Notes if available */}
          {(incident as IncidentWithDetails & { expert_screening_notes?: string }).expert_screening_notes && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm font-medium text-amber-800 mb-1">
                {t('workflow.deptRepApproval.expertNotes', 'HSSE Expert Notes')}:
              </p>
              <p className="text-sm text-amber-700">
                {(incident as IncidentWithDetails & { expert_screening_notes?: string }).expert_screening_notes}
              </p>
            </div>
          )}
          
          {/* Action Count Indicator */}
          <div className={`rounded-lg p-3 flex items-center gap-2 ${
            canApproveObservation 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}>
            <Info className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">
              {actionsCount === 0 
                ? t('workflow.deptRepApproval.noActionsWarning', 'You must add at least one corrective action before approving.')
                : t('workflow.deptRepApproval.actionsCount', '{{count}} corrective action(s) added.', { count: actionsCount })
              }
            </span>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="dept-rep-notes">
              {t('workflow.deptRepApproval.notes', 'Review Notes')}
            </Label>
            <Textarea
              id="dept-rep-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('workflow.deptRepApproval.notesPlaceholder', 'Add notes about your review and actions...')}
              rows={3}
            />
          </div>
          
          {/* Toggle Actions Section */}
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => {
                setShowActions(!showActions);
                // Refetch actions count when panel is shown
                if (!showActions) {
                  setTimeout(() => refetchActionsCount(), 500);
                }
              }}
            >
              <Plus className="h-4 w-4" />
              {showActions 
                ? t('workflow.deptRepApproval.hideActions', 'Hide Corrective Actions')
                : t('workflow.deptRepApproval.manageActions', 'Manage Corrective Actions')
              }
            </Button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {/* Reject Button - hidden in mandatory action status */}
            {!isMandatoryActionStatus && (
              <Button
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setShowRejectDialog(true)}
                disabled={deptRepApproval.isPending || deptRepReject.isPending}
              >
                <XCircle className="h-4 w-4" />
                {t('workflow.deptRepApproval.reject', 'Reject')}
              </Button>
            )}
            
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
              onClick={handleEscalateToInvestigation}
              disabled={deptRepApproval.isPending || deptRepReject.isPending}
            >
              <AlertTriangle className="h-4 w-4" />
              {t('workflow.deptRepApproval.escalate', 'Escalate to Investigation')}
            </Button>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex-1">
                    <Button
                      className="w-full flex items-center justify-center gap-2"
                      onClick={handleApproveAndClose}
                      disabled={!canApproveObservation || deptRepApproval.isPending || deptRepReject.isPending}
                    >
                      {deptRepApproval.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {t('workflow.deptRepApproval.approveClose', 'Approve & Close')}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canApproveObservation && (
                  <TooltipContent>
                    <p>{t('workflow.deptRepApproval.approveTooltip', 'Add at least one corrective action to enable approval')}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
      
      {/* Corrective Actions Panel - shown when expanded */}
      {showActions && (
        <ActionsPanel 
          incidentId={incident.id} 
          onActionChange={() => refetchActionsCount()}
        />
      )}
      
      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('workflow.deptRepApproval.rejectDialogTitle', 'Reject Observation?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('workflow.deptRepApproval.rejectDialogDescription', 'Are you sure you want to reject this observation? It will be sent to the HSSE Expert for final review.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2 py-4">
            <Label htmlFor="rejection-reason">
              {t('workflow.deptRepApproval.rejectionReason', 'Rejection Reason')} *
            </Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={t('workflow.deptRepApproval.rejectionReasonPlaceholder', 'Explain why you are rejecting this observation (min 20 characters)...')}
              rows={3}
            />
            <p className={`text-xs ${rejectionReason.length < MIN_REJECTION_REASON_LENGTH ? 'text-muted-foreground' : 'text-green-600'}`}>
              {rejectionReason.length}/{MIN_REJECTION_REASON_LENGTH} {t('common.characters', 'characters')}
            </p>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!isRejectionReasonValid || deptRepReject.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deptRepReject.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t('workflow.deptRepApproval.confirmReject', 'Reject Observation')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}