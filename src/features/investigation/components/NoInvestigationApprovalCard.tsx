import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, CheckCircle2, XCircle, Loader2, Info } from "lucide-react";
import { useNoInvestigationApproval, useCanApproveNoInvestigation } from "@/hooks/use-dept-manager-incident-approval";
import type { IncidentWithDetails } from '@/features/incidents';

interface NoInvestigationApprovalCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

/**
 * C4: Dept Manager approval card for "No Investigation Required" decisions.
 * When HSSE Expert recommends no investigation, the Dept Manager must approve or reject.
 */
export function NoInvestigationApprovalCard({ incident, onComplete }: NoInvestigationApprovalCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);

  const { data: canApprove, isLoading: checkingPermission } = useCanApproveNoInvestigation(incident.id);
  const noInvestigationApproval = useNoInvestigationApproval();

  if (checkingPermission || !canApprove) {
    return null;
  }

  const handleApprove = () => {
    noInvestigationApproval.mutate({
      incidentId: incident.id,
      decision: 'approved',
      notes: notes.trim() || undefined,
    }, {
      onSuccess: onComplete,
    });
  };

  const handleReject = () => {
    if (!notes.trim()) {
      setNotesError(t('workflow.noInvestigationApproval.notesRequired', 'Notes are required when rejecting'));
      return;
    }
    noInvestigationApproval.mutate({
      incidentId: incident.id,
      decision: 'rejected',
      notes: notes.trim(),
    }, {
      onSuccess: onComplete,
    });
  };

  const justification = (incident as unknown).no_investigation_justification;

  return (
    <Card className="border-amber-500/50 bg-amber-500/5" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg">
              {t('workflow.noInvestigationApproval.title', 'No Investigation Approval')}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            {t('workflow.noInvestigationApproval.pendingAction', 'Manager Decision Required')}
          </Badge>
        </div>
        <CardDescription>
          {t('workflow.noInvestigationApproval.description', 'HSSE Expert has recommended no investigation for this incident. Review the justification and approve or reject.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Expert Justification */}
        {justification && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <strong className="text-blue-800">
                {t('workflow.noInvestigationApproval.expertJustification', 'Expert Justification')}:
              </strong>
              <p className="mt-1 text-blue-700">{justification}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Incident Summary */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono font-medium">{incident.reference_id}</span>
            <Badge variant="secondary">{incident.event_type}</Badge>
          </div>
          <h4 className="font-semibold text-foreground">{incident.title}</h4>
          <p className="text-sm text-muted-foreground line-clamp-3">{incident.description}</p>
        </div>

        {/* Manager Notes */}
        <div className="space-y-2">
          <Label htmlFor="no-inv-notes">
            {t('workflow.noInvestigationApproval.notes', 'Manager Notes')}
            <span className="text-muted-foreground font-normal ms-1">
              ({t('workflow.noInvestigationApproval.requiredForReject', 'Required for rejection')})
            </span>
          </Label>
          <Textarea
            id="no-inv-notes"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (notesError) setNotesError(null);
            }}
            placeholder={t('workflow.noInvestigationApproval.notesPlaceholder', 'Add your review notes...')}
            rows={3}
            className={notesError ? 'border-destructive' : ''}
          />
          {notesError && <p className="text-sm text-destructive">{notesError}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleReject}
            disabled={noInvestigationApproval.isPending}
          >
            {noInvestigationApproval.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <XCircle className="h-4 w-4 me-2" />
            )}
            {t('workflow.noInvestigationApproval.reject', 'Reject â€” Return to Expert')}
          </Button>

          <Button
            className="flex-1 bg-amber-600 hover:bg-amber-700"
            onClick={handleApprove}
            disabled={noInvestigationApproval.isPending}
          >
            {noInvestigationApproval.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 me-2" />
            )}
            {t('workflow.noInvestigationApproval.approve', 'Approve â€” Close as No Investigation')}
          </Button>
        </div>

        {/* Decision Info */}
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3 space-y-1">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-600" />
            <span>{t('workflow.noInvestigationApproval.approveInfo', 'Approve: Incident closed as "No Investigation Required".')}</span>
          </p>
          <p className="flex items-start gap-2">
            <XCircle className="h-3 w-3 mt-0.5 text-destructive" />
            <span>{t('workflow.noInvestigationApproval.rejectInfo', 'Reject: Returns to HSSE Expert for re-screening.')}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

