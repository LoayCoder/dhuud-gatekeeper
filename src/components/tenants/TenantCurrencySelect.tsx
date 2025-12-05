import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import { Skeleton } from '@/components/ui/skeleton';

interface TenantCurrencySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TenantCurrencySelect({ value, onChange, disabled }: TenantCurrencySelectProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const isArabic = i18n.language === 'ar';
  const { supportedCurrencies, isLoadingCurrencies } = useTenantCurrency();

  if (isLoadingCurrencies) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger dir={direction}>
        <SelectValue placeholder={t('tenantManagement.selectCurrency', 'Select currency')} />
      </SelectTrigger>
      <SelectContent dir={direction}>
        {supportedCurrencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{currency.code}</span>
              <span>{isArabic ? currency.name_ar : currency.name}</span>
              <span className="text-muted-foreground">
                ({isArabic ? currency.symbol_ar || currency.symbol : currency.symbol})
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
