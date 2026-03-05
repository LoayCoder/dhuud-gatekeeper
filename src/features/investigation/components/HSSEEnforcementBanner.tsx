import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Lock, Calendar, User } from 'lucide-react';

interface HSSEEnforcementBannerProps {
  enforcedAt?: string | null;
  enforcedBy?: {
    full_name?: string;
    email?: string;
  } | null;
  enforcementNotes?: string | null;
}

export function HSSEEnforcementBanner({
  enforcedAt,
  enforcedBy,
  enforcementNotes
}: HSSEEnforcementBannerProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const locale = i18n.language === 'ar' ? ar : enUS;

  if (!enforcedAt) return null;

  const formattedDate = format(new Date(enforcedAt), 'PPpp', { locale });
  const enforcerName = enforcedBy?.full_name || enforcedBy?.email || t('common.unknown', 'Unknown');

  return (
    <Alert 
      variant="destructive" 
      className="border-2 border-destructive bg-destructive/10"
      dir={direction}
    >
      <ShieldAlert className="h-5 w-5" />
      <AlertTitle className="flex items-center gap-2 text-lg">
        <Lock className="h-4 w-4" />
        {t('workflow.hsseEnforcement.title', 'HSSE Expert Decision Enforced')}
        <Badge variant="destructive" className="ms-auto">
          {t('workflow.hsseEnforcement.final', 'FINAL')}
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-3 space-y-2">
        <p className="text-sm font-medium">
          {t('workflow.hsseEnforcement.description', 'This observation has been resolved by HSSE Expert authority. No further appeals or modifications are allowed.')}
        </p>
        
        <div className="flex flex-wrap gap-4 pt-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>{t('workflow.hsseEnforcement.enforcedBy', 'Enforced by')}:</span>
            <span className="font-medium text-foreground">{enforcerName}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{t('workflow.hsseEnforcement.enforcedAt', 'On')}:</span>
            <span className="font-medium text-foreground">{formattedDate}</span>
          </div>
        </div>

        {enforcementNotes && (
          <div className="mt-3 rounded-md bg-background/50 p-3 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {t('workflow.hsseEnforcement.notes', 'Enforcement Notes')}:
            </p>
            <p className="text-sm">{enforcementNotes}</p>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
