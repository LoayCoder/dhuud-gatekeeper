import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WarrantyClaimStatus } from '@/hooks/use-warranty-claims';

const STATUS_STYLES: Record<WarrantyClaimStatus, string> = {
  submitted: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  under_review: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  completed: 'bg-muted text-muted-foreground border-muted',
};

interface WarrantyStatusBadgeProps {
  status: WarrantyClaimStatus;
  className?: string;
}

export function WarrantyStatusBadge({ status, className }: WarrantyStatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <Badge
      variant="outline"
      className={cn('text-xs', STATUS_STYLES[status], className)}
    >
      {t(`assets.warranty.status.${status}`)}
    </Badge>
  );
}

interface WarrantyExpiryBadgeProps {
  expiryDate: string | null;
  className?: string;
}

export function WarrantyExpiryBadge({ expiryDate, className }: WarrantyExpiryBadgeProps) {
  const { t } = useTranslation();

  if (!expiryDate) {
    return (
      <Badge variant="outline" className={cn('text-xs text-muted-foreground', className)}>
        {t('assets.warranty.noWarranty')}
      </Badge>
    );
  }

  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return (
      <Badge variant="outline" className={cn('text-xs bg-red-500/10 text-red-700 dark:text-red-400', className)}>
        {t('assets.warranty.expired')}
      </Badge>
    );
  }

  if (daysUntilExpiry <= 30) {
    return (
      <Badge variant="outline" className={cn('text-xs bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', className)}>
        {t('assets.warranty.expiringSoon', { days: daysUntilExpiry })}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn('text-xs bg-green-500/10 text-green-700 dark:text-green-400', className)}>
      {t('assets.warranty.active')}
    </Badge>
  );
}
