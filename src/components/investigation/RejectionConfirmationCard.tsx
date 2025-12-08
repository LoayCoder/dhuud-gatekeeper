import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { XCircle, Check, MessageSquareWarning, Loader2, AlertTriangle } from "lucide-react";
import { useReporterResponse } from "@/hooks/use-hsse-workflow";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface RejectionConfirmationCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

type ExtendedIncident = IncidentWithDetails & {
  expert_rejection_reason?: string;
};

export function RejectionConfirmationCard({ incident, onComplete }: RejectionConfirmationCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { user } = useAuth();
  
  const [disputeNotes, setDisputeNotes] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  
  const reporterResponse = useReporterResponse();
  
  // Only show to the original reporter
  if (incident.reporter_id !== user?.id) {
    return null;
  }
  
  const extendedIncident = incident as ExtendedIncident;
  
  const handleConfirm = () => {
    reporterResponse.mutate({
      incidentId: incident.id,
      action: 'confirm_rejection',
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleDispute = () => {
    if (!disputeNotes.trim()) return;
    
    reporterResponse.mutate({
      incidentId: incident.id,
      action: 'dispute_rejection',
      disputeNotes,
    }, {
      onSuccess: onComplete,
    });
  };

  return (
    <Card className="border-destructive/50 bg-destructive/5" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">{t('workflow.rejectionConfirm.title', 'Report Rejected')}</CardTitle>
          </div>
          <Badge variant="destructive">
            {t('workflow.rejectionConfirm.status', 'Action Required')}
          </Badge>
        </div>
        <CardDescription>
          {t('workflow.rejectionConfirm.description', 'Your event report has been rejected by HSSE Expert. Please review the reason and confirm or dispute.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rejection Reason */}
        {extendedIncident.expert_rejection_reason && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('workflow.rejectionConfirm.reason', 'Rejection Reason')}:</strong>
              <p className="mt-1">{extendedIncident.expert_rejection_reason}</p>
            </AlertDescription>
          </Alert>
        )}
        
        {showDisputeForm ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dispute-notes" className="text-destructive">
                {t('workflow.rejectionConfirm.disputeNotes', 'Dispute Explanation')} *
              </Label>
              <Textarea
                id="dispute-notes"
                value={disputeNotes}
                onChange={(e) => setDisputeNotes(e.target.value)}
                placeholder={t('workflow.rejectionConfirm.disputePlaceholder', 'Explain why you believe this rejection is incorrect...')}
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                {t('workflow.rejectionConfirm.disputeInfo', 'Your dispute will be reviewed by the HSSE Manager for final decision.')}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDisputeForm(false);
                  setDisputeNotes("");
                }}
                disabled={reporterResponse.isPending}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleDispute}
                disabled={!disputeNotes.trim() || reporterResponse.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {reporterResponse.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <MessageSquareWarning className="h-4 w-4 me-2" />
                )}
                {t('workflow.rejectionConfirm.submitDispute', 'Submit Dispute')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDisputeForm(true)}
              disabled={reporterResponse.isPending}
            >
              <MessageSquareWarning className="h-4 w-4 me-2" />
              {t('workflow.rejectionConfirm.dispute', 'Dispute Rejection')}
            </Button>
            
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleConfirm}
              disabled={reporterResponse.isPending}
            >
              {reporterResponse.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Check className="h-4 w-4 me-2" />
              )}
              {t('workflow.rejectionConfirm.confirm', 'Confirm & Close')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
