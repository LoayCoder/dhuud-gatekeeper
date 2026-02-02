import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Flashlight, FlashlightOff, SwitchCamera, Keyboard, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CameraScanner } from '@/components/ui/camera-scanner';
import { cn } from '@/lib/utils';

interface FullScreenScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  description?: string;
}

export function FullScreenScanner({
  open,
  onClose,
  onScan,
  title,
  description,
}: FullScreenScannerProps) {
  const { t } = useTranslation();
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const handleManualSubmit = useCallback(() => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
      setShowManualInput(false);
    }
  }, [manualCode, onScan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Safe area top */}
      <div 
        className="flex-shrink-0 bg-black/90"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      />

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-black/90">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <QrCode className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">
              {title || t('contractors.gatePasses.scanTitle', 'Gate Pass Scan')}
            </h2>
            {description && (
              <p className="text-white/60 text-sm">{description}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/10 min-h-[48px] min-w-[48px]"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 relative">
        {!showManualInput ? (
          <CameraScanner
            containerId="gate-pass-fullscreen-scanner"
            isOpen={open}
            onScan={onScan}
            qrboxSize={{ width: 280, height: 280 }}
            aspectRatio={1.0}
            showCameraSwitch={true}
            showTorchToggle={true}
            scannerClassName="h-full"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
            <div className="p-6 rounded-2xl bg-muted/20 border border-white/10">
              <QrCode className="h-16 w-16 text-white/60" />
            </div>
            <div className="w-full max-w-sm space-y-4">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={t('contractors.gatePasses.enterToken', 'Enter QR token...')}
                className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/40"
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                autoFocus
              />
              <Button
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
                className="w-full h-14 text-lg"
              >
                {t('contractors.gatePasses.verify', 'Verify')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div 
        className="flex-shrink-0 bg-black/90 px-4 py-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowManualInput(!showManualInput)}
            className={cn(
              "flex-1 max-w-[200px] h-14 gap-2 rounded-xl border-white/20 text-white",
              showManualInput 
                ? "bg-white/20 hover:bg-white/30" 
                : "bg-transparent hover:bg-white/10"
            )}
          >
            {showManualInput ? (
              <>
                <QrCode className="h-5 w-5" />
                {t('contractors.gatePasses.scanMode', 'Scan Mode')}
              </>
            ) : (
              <>
                <Keyboard className="h-5 w-5" />
                {t('contractors.gatePasses.manualEntry', 'Manual Entry')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
