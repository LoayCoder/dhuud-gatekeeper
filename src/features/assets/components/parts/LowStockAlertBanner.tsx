import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface LowStockAlertBannerProps {
  parts: Array<{
    id: string;
    name: string;
    part_number: string;
    quantity_in_stock: number | null;
    reorder_point: number | null;
  }>;
  isLoading?: boolean;
}

export function LowStockAlertBanner({ parts, isLoading }: LowStockAlertBannerProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || (!isLoading && parts.length === 0)) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  const criticalParts = parts.filter(
    (p) => (p.quantity_in_stock || 0) <= (p.reorder_point || 0) * 0.5
  );

  return (
    <Alert variant="destructive" className="relative">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{t('parts.lowStock.alertTitle', 'Low Stock Alert')}</AlertTitle>
      <AlertDescription>
        {t('parts.lowStock.alertDescription', '{{count}} parts are below reorder point.', {
          count: parts.length,
        })}
        {criticalParts.length > 0 && (
          <span className="font-medium">
            {' '}
            {t('parts.lowStock.criticalCount', '{{count}} critically low.', {
              count: criticalParts.length,
            })}
          </span>
        )}
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        className="absolute end-2 top-2"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
