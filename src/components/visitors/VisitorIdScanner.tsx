import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Scan, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VisitorIdScannerProps {
  onScan: (value: string) => void;
}

export function VisitorIdScanner({ onScan }: VisitorIdScannerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    if (!containerRef.current) return;

    try {
      const html5QrCode = new Html5Qrcode('id-scanner-container');
      scannerRef.current = html5QrCode;
      setIsScanning(true);

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 100 },
          aspectRatio: 2.5,
        },
        (decodedText) => {
          onScan(decodedText);
          toast({
            title: t('visitors.scan.scanSuccess', 'ID scanned successfully'),
          });
          stopScanner();
          setOpen(false);
        },
        () => {} // Ignore scan errors
      );
    } catch (error) {
      console.error('Scanner error:', error);
      toast({
        title: t('visitors.scan.scanFailed', 'Failed to start scanner'),
        variant: 'destructive',
      });
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  useEffect(() => {
    if (open) {
      // Small delay to ensure container is mounted
      const timer = setTimeout(() => startScanner(), 100);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon">
          <Scan className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('visitors.scan.scanId', 'Scan ID')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div 
            id="id-scanner-container" 
            ref={containerRef}
            className="w-full aspect-video rounded-lg overflow-hidden bg-muted"
          />
          {isScanning && (
            <p className="text-sm text-muted-foreground text-center">
              {t('visitors.scan.scanning', 'Scanning...')}
            </p>
          )}
          <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
            <X className="me-2 h-4 w-4" />
            {t('common.cancel', 'Cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
