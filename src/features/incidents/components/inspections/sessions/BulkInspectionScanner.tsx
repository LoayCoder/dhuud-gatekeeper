import { useTranslation } from 'react-i18next';
import { Camera, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CameraScanner } from '@/components/ui/camera-scanner';

interface BulkInspectionScannerProps {
  onScan: (assetId: string) => void;
  onClose: () => void;
  isProcessing: boolean;
}

export function BulkInspectionScanner({ onScan, onClose, isProcessing }: BulkInspectionScannerProps) {
  const { t } = useTranslation();
  
  const handleScan = (decodedText: string) => {
    // Extract asset ID from QR code
    // Format: tenant_id:asset_id or just asset_id (UUID)
    let assetId = decodedText;
    
    // Check if it's in tenant:asset format
    if (decodedText.includes(':')) {
      assetId = decodedText.split(':')[1];
    }
    
    // Check if it's a URL with asset ID
    if (decodedText.includes('/assets/')) {
      const match = decodedText.match(/\/assets\/([a-f0-9-]+)/i);
      if (match) {
        assetId = match[1];
      }
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(assetId)) {
      onScan(assetId);
    }
  };
  
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {t('inspectionSessions.scanAssetQR', 'Scan Asset QR')}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative">
        {isProcessing && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t('common.processing', 'Processing...')}</p>
            </div>
          </div>
        )}
        
        <CameraScanner
          containerId="bulk-qr-reader"
          isOpen={true}
          onScan={handleScan}
          qrboxSize={{ width: 250, height: 250 }}
          aspectRatio={1.0}
          showCameraSwitch={true}
          showTorchToggle={true}
        />
      </CardContent>
    </Card>
  );
}
