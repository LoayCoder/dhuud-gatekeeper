import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode } from 'lucide-react';
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

  const handleScan = (result: { entityType: string; token: string; rawData: string }) => {
    setIsOpen(false);
    onScanResult?.(result);
  };

  return (
    <>
      {/* FAB Button - only visible on mobile */}
      <Button
        size="lg"
        className={cn(
          'fixed bottom-20 z-50 rounded-full shadow-lg',
          'h-14 w-14 p-0',
          'bg-primary hover:bg-primary/90',
          'sm:hidden', // Hide on desktop
          i18n.dir() === 'rtl' ? 'start-4' : 'end-4',
          className
        )}
        onClick={() => setIsOpen(true)}
      >
        <QrCode className="h-6 w-6" />
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
