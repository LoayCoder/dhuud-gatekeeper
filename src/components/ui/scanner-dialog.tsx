import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X, QrCode, ScanLine } from 'lucide-react';
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
  children?: ReactNode;
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
  children,
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
      <DialogContent className={cn(
        "sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl bg-gradient-to-b from-background to-muted/30",
        className
      )}>
        {/* Header with gradient */}
        <DialogHeader className="p-5 pb-3 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              {icon || <QrCode className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex flex-col gap-0.5">
              <span>{title || t('scanner.scanCode', 'Scan Code')}</span>
              {description && (
                <span className="text-sm font-normal text-muted-foreground">{description}</span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Scanner or Custom Children */}
        <div className="p-4">
          {children ? children : (
            <CameraScanner
              containerId={containerId}
              isOpen={open}
              onScan={handleScan}
              qrboxSize={qrboxSize}
              aspectRatio={aspectRatio}
              showCameraSwitch={showCameraSwitch}
              showTorchToggle={showTorchToggle}
            />
          )}
        </div>

        {/* Footer - only show if no children */}
        {!children && (
          <div className="p-4 pt-0">
            <Button 
              variant="outline" 
              className="w-full gap-2 rounded-xl h-12 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-300" 
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
