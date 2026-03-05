import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, PenLine, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SignaturePad, SignaturePadRef } from '@/components/ui/signature-pad';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface IncidentClosureSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (signatureDataUrl: string, notes?: string) => Promise<void>;
  isFinalClosure: boolean;
  isLoading?: boolean;
}

export function IncidentClosureSignatureDialog({
  open,
  onOpenChange,
  onConfirm,
  isFinalClosure,
  isLoading = false,
}: IncidentClosureSignatureDialogProps) {
  const { t } = useTranslation();
  const signatureRef = useRef<SignaturePadRef>(null);
  const [notes, setNotes] = useState('');
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    
    if (signatureRef.current?.isEmpty()) {
      setError(t('investigation.signatureRequired', 'A signature is required to proceed'));
      return;
    }

    const signatureDataUrl = signatureRef.current?.getSignatureDataUrl();
    if (!signatureDataUrl) {
      setError(t('investigation.signatureError', 'Could not capture signature'));
      return;
    }

    try {
      await onConfirm(signatureDataUrl, notes.trim() || undefined);
      // Reset state on success
      setNotes('');
      setSignatureEmpty(true);
      signatureRef.current?.clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleCancel = () => {
    setNotes('');
    setError(null);
    signatureRef.current?.clear();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            {isFinalClosure
              ? t('investigation.signFinalClosureTitle', 'Sign to Close Incident')
              : t('investigation.signApprovalTitle', 'Sign to Approve Investigation')
            }
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isFinalClosure
              ? t('investigation.signFinalClosureDescription', 'Your signature confirms that all corrective actions have been completed and verified, and this incident can be officially closed.')
              : t('investigation.signApprovalDescription', 'Your signature confirms that the investigation is complete and corrective actions will be released to assignees.')
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Signature Pad */}
          <div>
            <SignaturePad
              ref={signatureRef}
              label={t('investigation.yourSignature', 'Your Signature') + ' *'}
              height={120}
              onSignatureChange={(isEmpty) => setSignatureEmpty(isEmpty)}
            />
          </div>

          {/* Optional Notes */}
          <div>
            <Label htmlFor="closure-notes">
              {t('investigation.approvalNotes', 'Approval Notes (Optional)')}
            </Label>
            <Textarea
              id="closure-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('investigation.closureNotesPlaceholder', 'Add any notes about this approval...')}
              rows={2}
              className="mt-2"
            />
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            {t('common.cancel', 'Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || signatureEmpty}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {isFinalClosure
              ? t('investigation.signAndClose', 'Sign & Close Incident')
              : t('investigation.signAndApprove', 'Sign & Approve')
            }
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
