import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { InvestigationReadiness } from '@/features/investigation';

interface InvestigationReadinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readiness: InvestigationReadiness | undefined;
}

export function InvestigationReadinessDialog({
  open,
  onOpenChange,
  readiness
}: InvestigationReadinessDialogProps) {
  const { t } = useTranslation();

  if (!readiness) return null;

  const items = [
    {
      label: t('investigation.gates.evidence', 'Evidence Collection'),
      passed: readiness.has_evidence,
      errorText: t('investigation.gates.evidenceError', 'At least one piece of evidence is required')
    },
    {
      label: t('investigation.gates.witnesses', 'Witness Statements'),
      passed: readiness.witnesses_approved,
      errorText: t('investigation.gates.witnessesError', 'All witness statements must be processed (none pending)')
    },
    {
      label: t('investigation.gates.rca', 'Root Cause Analysis'),
      passed: readiness.rca_locked,
      errorText: t('investigation.gates.rcaError', 'RCA must be locked by HSSE Manager')
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-6 w-6" />
            <DialogTitle className="text-destructive">
              {t('investigation.gates.title', 'Validation Failed')}
            </DialogTitle>
          </div>
          <DialogDescription>
            {t('investigation.gates.description', 'The following requirements must be met before submitting the investigation:')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50">
              {item.passed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`font-medium ${item.passed ? 'text-foreground' : 'text-destructive'}`}>
                  {item.label}
                </p>
                {!item.passed && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.errorText}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

