import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Building2,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { useCanApproveViolation, useContractControllerApproval } from "@/hooks/use-contractor-violation";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface ContractControllerApprovalCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

export function ContractControllerApprovalCard({ incident, onComplete }: ContractControllerApprovalCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [notes, setNotes] = useState("");
  
  const { data: canApprove } = useCanApproveViolation(incident.id);
  const contractControllerApproval = useContractControllerApproval();
  
  // Only show for pending_contract_controller_approval status
  if ((incident.status as string) !== 'pending_contract_controller_approval') {
    return null;
  }
  
  // Only show if user can approve
  if (!canApprove?.can_approve) {
    return null;
  }
  
  const violationDetails = {
    penaltyType: (incident as any).violation_penalty_type,
    fineAmount: (incident as any).violation_fine_amount,
    occurrence: (incident as any).violation_occurrence,
    actionDescription: (incident as any).violation_action_description,
  };
  
  const handleApprove = () => {
    contractControllerApproval.mutate({
      incidentId: incident.id,
      decision: 'approved',
      notes: notes || undefined,
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleReject = () => {
    contractControllerApproval.mutate({
      incidentId: incident.id,
      decision: 'rejected',
      notes: notes || undefined,
    }, {
      onSuccess: onComplete,
    });
  };
  
  return (
    <Card className="border-green-500/50 bg-green-500/5" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">
              {t('workflow.violation.contractControllerApproval', 'Contract Controller - Fine Approval')}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            {t('workflow.pendingApproval', 'Pending Approval')}
          </Badge>
        </div>
        <CardDescription>
          {t('workflow.violation.contractControllerDescription', 'Review and confirm or reject the fine for this contractor violation')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Violation & Fine Summary */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-600" />
            <span className="font-medium">
              {incident.related_contractor_company?.company_name}
            </span>
          </div>
          
          {/* Fine Amount Highlight */}
          <div className="flex items-center justify-center p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <DollarSign className="h-6 w-6 text-destructive" />
            <span className="text-2xl font-bold text-destructive">
              {String(violationDetails.fineAmount?.toLocaleString() || 0)} SAR
            </span>
          </div>
          
          <div className="grid gap-2 md:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">{t('workflow.violation.occurrence', 'Occurrence')}:</span>
              <Badge variant="secondary" className="ms-2">
                {violationDetails.occurrence === 1 ? '1st' : violationDetails.occurrence === 2 ? '2nd' : '3rd/Repeated'}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">{t('workflow.violation.penaltyType', 'Penalty')}:</span>
              <Badge variant="outline" className="ms-2">
                {String(t(`violations.actionTypes.${violationDetails.penaltyType}`, violationDetails.penaltyType))}
              </Badge>
            </div>
          </div>
          
          {violationDetails.actionDescription && (
            <p className="text-sm text-muted-foreground">
              {violationDetails.actionDescription}
            </p>
          )}
        </div>
        
        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="controller-notes">
            {t('workflow.violation.approvalNotes', 'Approval Notes')}
          </Label>
          <Textarea
            id="controller-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workflow.violation.contractControllerNotesPlaceholder', 'Add notes about fine enforcement...')}
            rows={2}
          />
        </div>
        
        {/* Warning */}
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            {t('workflow.violation.fineApprovalWarning', 'Approving this fine will finalize the violation and make it enforceable.')}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
            onClick={handleReject}
            disabled={contractControllerApproval.isPending}
          >
            {contractControllerApproval.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {t('workflow.violation.rejectFine', 'Reject Fine')}
          </Button>
          
          <Button
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
            onClick={handleApprove}
            disabled={contractControllerApproval.isPending}
          >
            {contractControllerApproval.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {t('workflow.violation.approveFine', 'Approve Fine')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
