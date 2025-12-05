import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, SUPPORTED_CURRENCIES, type CurrencyConfig } from '@/lib/currency-utils';

export interface SupportedCurrency {
  code: string;
  name: string;
  name_ar: string;
  symbol: string;
  symbol_ar: string | null;
  decimal_places: number;
  is_active: boolean;
  sort_order: number;
}

export interface UseTenantCurrencyReturn {
  currency: string;
  currencyConfig: CurrencyConfig;
  isLoading: boolean;
  formatAmount: (amount: number) => string;
  supportedCurrencies: SupportedCurrency[];
  isLoadingCurrencies: boolean;
}

/**
 * Hook to get the tenant's preferred currency and format amounts accordingly
 */
export function useTenantCurrency(): UseTenantCurrencyReturn {
  const { profile } = useAuth();

  // Fetch tenant's preferred currency
  const { data: tenantData, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant-currency', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      
      const { data, error } = await supabase
        .from('tenants')
        .select('preferred_currency')
        .eq('id', profile.tenant_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Fetch all supported currencies
  const { data: currencies = [], isLoading: currenciesLoading } = useQuery({
    queryKey: ['supported-currencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supported_currencies')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as SupportedCurrency[];
    },
  });

  const currency = tenantData?.preferred_currency || 'SAR';
  const currencyConfig = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.SAR;

  const formatAmount = (amount: number): string => {
    return formatCurrency(amount, currency);
  };

  return {
    currency,
    currencyConfig,
    isLoading: tenantLoading,
    formatAmount,
    supportedCurrencies: currencies,
    isLoadingCurrencies: currenciesLoading,
  };
}

/**
 * Simplified hook for components that just need to format amounts
 */
export function useCurrencyFormatter() {
  const { currency, formatAmount } = useTenantCurrency();
  return { currency, formatAmount };
}
