import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { QrCode, X } from 'lucide-react';

interface ContractorQRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
}

export function ContractorQRScanner({ open, onOpenChange, onScan }: ContractorQRScannerProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && containerRef.current) {
      const scanner = new Html5Qrcode('qr-reader-contractor');
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Extract contractor code from QR data
            let code = decodedText;
            if (decodedText.startsWith('CONTRACTOR:')) {
              code = decodedText.replace('CONTRACTOR:', '');
            }
            onScan(code);
            stopScanner();
            onOpenChange(false);
          },
          () => {
            // Ignore scan errors (no QR found in frame)
          }
        )
        .catch((err) => {
          setError(err.message || 'Failed to start camera');
        });

      return () => {
        stopScanner();
      };
    }
  }, [open]);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .catch(() => {})
        .finally(() => {
          scannerRef.current = null;
        });
    }
  };

  const handleClose = () => {
    stopScanner();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t('security.contractorCheck.scannerTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            id="qr-reader-contractor"
            ref={containerRef}
            className="w-full aspect-square rounded-lg overflow-hidden bg-muted"
          />

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <p className="text-sm text-muted-foreground text-center">
            {t('security.contractorCheck.scannerDescription')}
          </p>

          <Button variant="outline" className="w-full" onClick={handleClose}>
            <X className="h-4 w-4 me-2" />
            {t('common.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
