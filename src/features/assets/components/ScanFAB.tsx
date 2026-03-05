import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { QrCode, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AssetQRScanner } from './AssetQRScanner';

interface ScanFABProps {
  className?: string;
}

export function ScanFAB({ className }: ScanFABProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleScanSuccess = (assetId: string) => {
    setIsOpen(false);
    navigate(`/assets/${assetId}`);
  };

  return (
    <>
      {/* FAB Button - only visible on mobile */}
      <Button
        size="lg"
        className={cn(
          'fixed bottom-20 z-50 rounded-full shadow-lg',
          'h-14 w-14 p-0',
          'sm:hidden', // Hide on desktop
          i18n.dir() === 'rtl' ? 'left-4' : 'right-4',
          className
        )}
        onClick={() => setIsOpen(true)}
      >
        <QrCode className="h-6 w-6" />
        <span className="sr-only">{t('assets.mobile.scanAsset')}</span>
      </Button>

      {/* Scanner Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {t('assets.scanQRCode')}
            </DialogTitle>
          </DialogHeader>
          
          <AssetQRScanner 
            onScanSuccess={handleScanSuccess}
            autoNavigate={false}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
