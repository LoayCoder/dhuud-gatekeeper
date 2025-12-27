import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ImportValidationBadgeProps {
  status: 'valid' | 'error' | 'warning';
  errorCount?: number;
  warningCount?: number;
  className?: string;
}

export function ImportValidationBadge({ 
  status, 
  errorCount = 0, 
  warningCount = 0,
  className 
}: ImportValidationBadgeProps) {
  const { t } = useTranslation();

  if (status === 'valid') {
    return (
      <div className={cn("flex items-center gap-1 text-green-600", className)}>
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-xs font-medium">{t('assets.import.valid')}</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={cn("flex items-center gap-1 text-destructive", className)}>
        <XCircle className="h-4 w-4" />
        <span className="text-xs font-medium">
          {t('assets.import.errorsCount', { count: errorCount })}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 text-amber-600", className)}>
      <AlertTriangle className="h-4 w-4" />
      <span className="text-xs font-medium">
        {t('assets.import.warningsCount', { count: warningCount })}
      </span>
    </div>
  );
}
