import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface SubmissionSuccessDialogProps {
  open: boolean;
  referenceId: string;
  incidentId: string;
  onViewIncident: () => void;
  redirectSeconds?: number;
}

export function SubmissionSuccessDialog({
  open,
  referenceId,
  incidentId,
  onViewIncident,
  redirectSeconds = 3,
}: SubmissionSuccessDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [countdown, setCountdown] = useState(redirectSeconds);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setCountdown(redirectSeconds);
      setProgress(0);
      return;
    }

    const startTime = Date.now();
    const duration = redirectSeconds * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const newProgress = ((duration - remaining) / duration) * 100;
      
      setProgress(newProgress);
      setCountdown(Math.ceil(remaining / 1000));
    }, 50);

    return () => clearInterval(interval);
  }, [open, redirectSeconds]);

  return (
    <Dialog open={open}>
      <DialogContent 
        className="sm:max-w-md text-center" 
        dir={direction}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center gap-6 py-4">
          {/* Animated Success Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-success/20 rounded-full animate-ping" />
            <div className="relative w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-success animate-in zoom-in duration-300" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {t('incidents.submissionSuccess', 'Submitted Successfully!')}
            </h2>
            <p className="text-muted-foreground">
              {t('incidents.submissionSuccessDescription', 'Your report has been recorded and assigned a reference number.')}
            </p>
          </div>

          {/* Reference ID Card */}
          <div className="w-full bg-muted/50 rounded-lg p-4 border-2 border-dashed border-primary/30">
            <p className="text-sm text-muted-foreground mb-1">
              {t('incidents.referenceNumber', 'Reference Number')}
            </p>
            <p className="text-2xl font-mono font-bold text-primary">
              {referenceId || '---'}
            </p>
          </div>

          {/* Countdown Progress */}
          <div className="w-full space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('incidents.redirectingIn', 'Redirecting to incident details in {{seconds}} seconds...', { seconds: countdown })}
            </p>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Manual Action Button */}
          <Button 
            onClick={onViewIncident} 
            size="lg" 
            className="w-full gap-2"
          >
            {t('incidents.viewIncidentDetails', 'View Incident Details')}
            <ArrowRight className={cn("h-4 w-4", direction === 'rtl' && "rotate-180")} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
