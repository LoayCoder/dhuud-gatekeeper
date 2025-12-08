import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Check, X, Loader2, AlertTriangle } from "lucide-react";
import { useManagerApproval, useCanApproveInvestigation } from "@/hooks/use-hsse-workflow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface ManagerApprovalCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

export function ManagerApprovalCard({ incident, onComplete }: ManagerApprovalCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  
  const { data: canApprove } = useCanApproveInvestigation(incident.id);
  const managerApproval = useManagerApproval();
  
  if (!canApprove) {
    return null;
  }
  
  const handleApprove = () => {
    managerApproval.mutate({
      incidentId: incident.id,
      decision: 'approved',
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleReject = () => {
    if (!rejectionReason.trim()) return;
    
    managerApproval.mutate({
      incidentId: incident.id,
      decision: 'rejected',
      rejectionReason,
    }, {
      onSuccess: onComplete,
    });
  };

  return (
    <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">{t('workflow.managerApproval.title', 'Manager Approval Required')}</CardTitle>
          </div>
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            {t('workflow.managerApproval.pending', 'Awaiting Approval')}
          </Badge>
        </div>
        <CardDescription>
          {t('workflow.managerApproval.description', 'HSSE Expert has recommended this event for investigation. Please review and approve or reject.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Expert Notes if available */}
        {(incident as IncidentWithDetails & { expert_screening_notes?: string }).expert_screening_notes && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {t('workflow.managerApproval.expertNotes', 'HSSE Expert Notes')}:
            </p>
            <p className="text-sm">
              {(incident as IncidentWithDetails & { expert_screening_notes?: string }).expert_screening_notes}
            </p>
          </div>
        )}
        
        {showRejectionForm ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('workflow.managerApproval.rejectWarning', 'Rejecting will escalate to HSSE Manager for final decision.')}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="rejection-reason" className="text-destructive">
                {t('workflow.managerApproval.rejectionReason', 'Rejection Reason')} *
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('workflow.managerApproval.rejectionPlaceholder', 'Explain why you are rejecting the investigation...')}
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectionForm(false);
                  setRejectionReason("");
                }}
                disabled={managerApproval.isPending}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || managerApproval.isPending}
              >
                {managerApproval.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <X className="h-4 w-4 me-2" />
                )}
                {t('workflow.managerApproval.confirmReject', 'Confirm Rejection')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => setShowRejectionForm(true)}
              disabled={managerApproval.isPending}
            >
              <X className="h-4 w-4 me-2" />
              {t('workflow.managerApproval.reject', 'Reject Investigation')}
            </Button>
            
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={managerApproval.isPending}
            >
              {managerApproval.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Check className="h-4 w-4 me-2" />
              )}
              {t('workflow.managerApproval.approve', 'Approve Investigation')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
