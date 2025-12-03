import { useTranslation } from 'react-i18next';
import { useModuleAccess } from '@/hooks/use-module-access';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function TrialBanner() {
  const { t } = useTranslation();
  const { subscription, isTrialActive, getTrialDaysRemaining } = useModuleAccess();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if not in trial or banner dismissed
  if (!isTrialActive() || dismissed) {
    return null;
  }

  const daysRemaining = getTrialDaysRemaining();
  const isUrgent = daysRemaining <= 3;

  return (
    <Alert 
      className={`relative mb-4 ${isUrgent ? 'border-destructive bg-destructive/10' : 'border-primary bg-primary/10'}`}
    >
      <Clock className={`h-4 w-4 ${isUrgent ? 'text-destructive' : 'text-primary'}`} />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          {daysRemaining === 1 
            ? t('trial.lastDay')
            : t('trial.daysRemaining', { days: daysRemaining })
          }
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isUrgent ? 'destructive' : 'default'}
            onClick={() => navigate('/settings/subscription')}
            className="gap-1"
          >
            <Sparkles className="h-3 w-3" />
            {t('trial.upgradNow')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
