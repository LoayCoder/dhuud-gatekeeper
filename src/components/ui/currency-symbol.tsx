import { cn } from '@/lib/utils';

interface CurrencySymbolProps {
  currencyCode: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASSES = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const;

// Text symbols for non-SAR currencies
const CURRENCY_TEXT_SYMBOLS: Record<string, string> = {
  AED: 'د.إ',
  BHD: 'د.ب',
  KWD: 'د.ك',
  OMR: 'ر.ع',
  QAR: 'ر.ق',
  USD: '$',
  CNY: '¥',
};

/**
 * Renders the official currency symbol for SAR (as SVG) 
 * or text symbols for other supported currencies.
 */
export function CurrencySymbol({ 
  currencyCode, 
  className, 
  size = 'sm' 
}: CurrencySymbolProps) {
  // For SAR, render the official symbol SVG
  if (currencyCode === 'SAR') {
    return (
      <img
        src="/images/currencies/sar-symbol.svg"
        alt="SAR"
        className={cn(SIZE_CLASSES[size], 'inline-block', className)}
        aria-label="Saudi Riyal"
      />
    );
  }

  // For other currencies, render text symbol
  const symbol = CURRENCY_TEXT_SYMBOLS[currencyCode] || currencyCode;
  
  return (
    <span className={cn('inline-block', className)} aria-label={currencyCode}>
      {symbol}
    </span>
  );
}

interface FormattedCurrencyProps {
  amount: number;
  currencyCode?: string;
  symbolSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  symbolClassName?: string;
  showSymbol?: boolean;
}

/**
 * Renders a formatted currency amount with the appropriate symbol.
 * Uses official SAR symbol SVG for Saudi Riyal.
 */
export function FormattedCurrency({
  amount,
  currencyCode = 'SAR',
  symbolSize = 'sm',
  className,
  symbolClassName,
  showSymbol = true,
}: FormattedCurrencyProps) {
  // Get decimal places for currency
  const decimals = ['BHD', 'KWD', 'OMR'].includes(currencyCode) ? 3 : 2;
  
  // Format number without currency symbol
  const formattedNumber = new Intl.NumberFormat('en', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(amount);

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span>{formattedNumber}</span>
      {showSymbol && (
        <CurrencySymbol 
          currencyCode={currencyCode} 
          size={symbolSize}
          className={symbolClassName}
        />
      )}
    </span>
  );
}
