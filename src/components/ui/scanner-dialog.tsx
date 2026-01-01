import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X, QrCode } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CameraScanner } from './camera-scanner';
import { cn } from '@/lib/utils';

interface ScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (result: string) => void;
  title?: string;
  description?: string;
  icon?: ReactNode;
  containerId?: string;
  qrboxSize?: { width: number; height: number };
  aspectRatio?: number;
  showCameraSwitch?: boolean;
  showTorchToggle?: boolean;
  className?: string;
}

export function ScannerDialog({
  open,
  onOpenChange,
  onScan,
  title,
  description,
  icon,
  containerId = 'scanner-dialog-container',
  qrboxSize = { width: 250, height: 250 },
  aspectRatio = 1.0,
  showCameraSwitch = true,
  showTorchToggle = true,
  className,
}: ScannerDialogProps) {
  const { t } = useTranslation();

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleScan = (result: string) => {
    onScan(result);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("sm:max-w-md p-0 gap-0 overflow-hidden", className)}>
        {/* Header */}
        <DialogHeader className="p-4 pb-2 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {icon || <QrCode className="h-5 w-5 text-primary" />}
            {title || t('scanner.scanCode', 'Scan Code')}
          </DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>

        {/* Scanner */}
        <div className="p-4">
          <CameraScanner
            containerId={containerId}
            isOpen={open}
            onScan={handleScan}
            qrboxSize={qrboxSize}
            aspectRatio={aspectRatio}
            showCameraSwitch={showCameraSwitch}
            showTorchToggle={showTorchToggle}
          />
        </div>

        {/* Footer */}
        <div className="p-4 pt-0">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleClose}
          >
            <X className="h-4 w-4 me-2" />
            {t('common.cancel', 'Cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
