import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCanCloseIncident, useRequestIncidentClosure } from '@/hooks/use-incident-closure';

interface IncidentClosureRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentId: string;
}

export function IncidentClosureRequestDialog({
  open,
  onOpenChange,
  incidentId,
}: IncidentClosureRequestDialogProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState({
    evidence: false,
    witnesses: false,
    rca: false,
    actions: false,
  });

  const { data: closureCheck, isLoading: checkingClosure } = useCanCloseIncident(incidentId);
  const requestClosure = useRequestIncidentClosure();

  const allChecked = Object.values(checklist).every(Boolean);
  const canSubmit = allChecked && closureCheck?.can_close;

  const handleSubmit = async () => {
    await requestClosure.mutateAsync({
      incidentId,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
    setNotes('');
    setChecklist({ evidence: false, witnesses: false, rca: false, actions: false });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('investigation.requestClosure', 'Request Closure')}</DialogTitle>
          <DialogDescription>
            {t('investigation.closureChecklistDescription', 'Confirm that all investigation activities are complete before requesting closure approval.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Checklist */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t('investigation.closureChecklist', 'Closure Checklist')}
            </Label>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="evidence"
                  checked={checklist.evidence}
                  onCheckedChange={(checked) => 
                    setChecklist(prev => ({ ...prev, evidence: !!checked }))
                  }
                />
                <label htmlFor="evidence" className="text-sm cursor-pointer">
                  {t('investigation.allEvidenceCollected', 'All evidence collected')}
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="witnesses"
                  checked={checklist.witnesses}
                  onCheckedChange={(checked) => 
                    setChecklist(prev => ({ ...prev, witnesses: !!checked }))
                  }
                />
                <label htmlFor="witnesses" className="text-sm cursor-pointer">
                  {t('investigation.allWitnessesInterviewed', 'All witness statements obtained')}
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rca"
                  checked={checklist.rca}
                  onCheckedChange={(checked) => 
                    setChecklist(prev => ({ ...prev, rca: !!checked }))
                  }
                />
                <label htmlFor="rca" className="text-sm cursor-pointer">
                  {t('investigation.rcaComplete', 'Root cause analysis complete')}
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="actions"
                  checked={checklist.actions}
                  onCheckedChange={(checked) => 
                    setChecklist(prev => ({ ...prev, actions: !!checked }))
                  }
                />
                <label htmlFor="actions" className="text-sm cursor-pointer">
                  {t('investigation.actionsAssigned', 'All corrective actions assigned')}
                </label>
              </div>
            </div>
          </div>

          {/* Action Verification Status */}
          {checkingClosure ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading', 'Loading...')}
            </div>
          ) : closureCheck?.can_close ? (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {t('investigation.allActionsVerified', 'All {{count}} corrective actions are verified and closed.', {
                  count: closureCheck.verified_actions,
                })}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('investigation.pendingActionsWarning', '{{pending}} of {{total}} actions are still pending verification. All actions must be verified before closure.', {
                  pending: (closureCheck?.total_actions || 0) - (closureCheck?.verified_actions || 0),
                  total: closureCheck?.total_actions || 0,
                })}
              </AlertDescription>
            </Alert>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {t('investigation.closureNotes', 'Closure Notes')} ({t('common.optional', 'optional')})
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('investigation.closureNotesPlaceholder', 'Add any notes for the approver...')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || requestClosure.isPending}
          >
            {requestClosure.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('investigation.submitClosureRequest', 'Submit for Approval')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
