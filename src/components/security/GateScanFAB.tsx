import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UniversalQRScanner } from './UniversalQRScanner';

interface GateScanFABProps {
  className?: string;
  onScanResult?: (result: { entityType: string; token: string; rawData: string }) => void;
}

export function GateScanFAB({ className, onScanResult }: GateScanFABProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(() => {
    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    setIsLoading(true);
    // Small delay to show loading state, then open scanner
    requestAnimationFrame(() => {
      setIsOpen(true);
      setIsLoading(false);
    });
  }, []);

  const handleScan = (result: { entityType: string; token: string; rawData: string }) => {
    // Haptic feedback on successful scan
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }
    setIsOpen(false);
    onScanResult?.(result);
  };

  return (
    <>
      {/* FAB Button - only visible on mobile */}
      <Button
        size="lg"
        className={cn(
          'fixed bottom-24 z-50 rounded-full shadow-lg',
          'h-14 w-14 p-0',
          'bg-primary hover:bg-primary/90',
          'active:scale-95 transition-all duration-150',
          'sm:hidden', // Hide on desktop
          i18n.dir() === 'rtl' ? 'start-4' : 'end-4',
          className
        )}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <QrCode className="h-6 w-6" />
        )}
        <span className="sr-only">{t('security.gateDashboard.quickScan', 'Quick Scan')}</span>
      </Button>

      {/* Scanner Dialog */}
      <UniversalQRScanner
        open={isOpen}
        onOpenChange={setIsOpen}
        onScan={handleScan}
      />
    </>
  );
}
