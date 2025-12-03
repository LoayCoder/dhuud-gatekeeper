import { useTranslation } from 'react-i18next';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Calendar, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BillingPeriod } from '@/hooks/use-price-calculator';

interface BillingPeriodToggleProps {
  value: BillingPeriod;
  onChange: (value: BillingPeriod) => void;
  disabled?: boolean;
  className?: string;
}

export function BillingPeriodToggle({
  value,
  onChange,
  disabled,
  className,
}: BillingPeriodToggleProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as BillingPeriod)}
        disabled={disabled}
        className="bg-muted p-1 rounded-lg"
      >
        <ToggleGroupItem
          value="monthly"
          className="rounded-md px-4 data-[state=on]:bg-background data-[state=on]:shadow-sm"
        >
          <Calendar className="h-4 w-4 me-2" />
          {t('subscription.monthly')}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="yearly"
          className="rounded-md px-4 data-[state=on]:bg-background data-[state=on]:shadow-sm"
        >
          <CalendarDays className="h-4 w-4 me-2" />
          {t('subscription.yearly')}
          <Badge variant="secondary" className="ms-2 bg-green-500/10 text-green-600 text-xs">
            {t('subscription.save10Percent')}
          </Badge>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
