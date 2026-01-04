import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  Loader2,
  AlertTriangle,
  User,
  Calendar
} from "lucide-react";
import { useCanReviewHSSERejection, useHSSERejectionReview } from "@/hooks/use-observation-rejection";
import type { IncidentWithDetails } from "@/hooks/use-incidents";
import { format } from "date-fns";

interface HSSEExpertRejectionReviewCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

export function HSSEExpertRejectionReviewCard({ incident, onComplete }: HSSEExpertRejectionReviewCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [notes, setNotes] = useState("");
  
  const { data: canReview, isLoading: isCheckingPermission } = useCanReviewHSSERejection(incident.id);
  const rejectionReview = useHSSERejectionReview();
  
  // Only show for observations in pending_hsse_rejection_review status
  // Using string comparison since the new status values are in DB but not yet in TS types
  if (incident.event_type !== 'observation' || (incident.status as string) !== 'pending_hsse_rejection_review') {
    return null;
  }
  
  // Wait for permission check
  if (isCheckingPermission) {
    return null;
  }
  
  // Don't show if user can't review
  if (!canReview) {
    return null;
  }
  
  // Type assertion for rejection fields
  const rejectionData = incident as IncidentWithDetails & {
    dept_rep_rejection_reason?: string;
    dept_rep_rejected_by?: string;
    dept_rep_rejected_at?: string;
  };
  
  const handleApproveRejection = () => {
    rejectionReview.mutate({
      incidentId: incident.id,
      decision: 'approve_rejection',
      notes,
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleRejectRejection = () => {
    rejectionReview.mutate({
      incidentId: incident.id,
      decision: 'reject_rejection',
      notes,
    }, {
      onSuccess: onComplete,
    });
  };

  return (
    <Card className="border-amber-500/50 bg-amber-500/5" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg">
              {t('workflow.hsseRejectionReview.title', 'Rejection Review Required')}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            {t('workflow.hsseRejectionReview.pendingAction', 'HSSE Review Required')}
          </Badge>
        </div>
        <CardDescription>
          {t('workflow.hsseRejectionReview.description', 'The Department Representative has rejected this observation. Review and make a final decision.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Observation Summary */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{incident.reference_id}</span>
            <Badge variant="secondary">{incident.event_type}</Badge>
          </div>
          <h4 className="font-medium">{incident.title}</h4>
          <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
        </div>
        
        {/* Rejection Details */}
        <Alert variant="destructive" className="border-red-300 bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {t('workflow.hsseRejectionReview.rejectionReason', 'Rejection Reason')}
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p className="text-sm">
              {rejectionData.dept_rep_rejection_reason || t('common.notSpecified', 'Not specified')}
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
              {rejectionData.dept_rep_rejected_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(rejectionData.dept_rep_rejected_at), 'PPp')}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
        
        {/* Review Notes */}
        <div className="space-y-2">
          <Label htmlFor="hsse-review-notes">
            {t('workflow.hsseRejectionReview.notes', 'Review Notes')}
          </Label>
          <Textarea
            id="hsse-review-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workflow.hsseRejectionReview.notesPlaceholder', 'Add notes about your decision...')}
            rows={3}
          />
        </div>
        
        {/* Decision Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
            onClick={handleRejectRejection}
            disabled={rejectionReview.isPending}
          >
            {rejectionReview.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {t('workflow.hsseRejectionReview.rejectRejection', 'Return to Dept Rep')}
          </Button>
          
          <Button
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleApproveRejection}
            disabled={rejectionReview.isPending}
          >
            {rejectionReview.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {t('workflow.hsseRejectionReview.approveRejection', 'Approve & Close')}
          </Button>
        </div>
        
        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2">
          <p>
            <strong>{t('workflow.hsseRejectionReview.approveHelp', 'Approve & Close')}:</strong>{' '}
            {t('workflow.hsseRejectionReview.approveHelpText', 'Confirms the rejection. Observation will be closed as rejected.')}
          </p>
          <p>
            <strong>{t('workflow.hsseRejectionReview.returnHelp', 'Return to Dept Rep')}:</strong>{' '}
            {t('workflow.hsseRejectionReview.returnHelpText', 'Rejects the rejection. Dept Rep must add actions or escalate.')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
