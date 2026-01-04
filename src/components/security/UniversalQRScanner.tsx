import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, User, HardHat, Package, AlertCircle } from 'lucide-react';
import { ScannerDialog } from '@/components/ui/scanner-dialog';
import { Badge } from '@/components/ui/badge';

export type QREntityType = 'visitor' | 'worker' | 'gatepass' | 'unknown';

interface ScanResult {
  entityType: QREntityType;
  token: string;
  rawData: string;
}

interface UniversalQRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (result: ScanResult) => void;
}

/**
 * Detects the entity type from QR code data
 * Formats:
 * - WORKER:{token} -> worker
 * - VISITOR:{token} -> visitor
 * - GATEPASS:{token} -> gatepass
 * - {uuid} -> Could be any, returns unknown for further lookup
 */
function detectQRFormat(data: string): ScanResult {
  const upperData = data.toUpperCase().trim();
  
  if (upperData.startsWith('WORKER:')) {
    return {
      entityType: 'worker',
      token: data.substring(7).trim(),
      rawData: data,
    };
  }
  
  if (upperData.startsWith('VISITOR:')) {
    return {
      entityType: 'visitor',
      token: data.substring(8).trim(),
      rawData: data,
    };
  }
  
  if (upperData.startsWith('GATEPASS:')) {
    return {
      entityType: 'gatepass',
      token: data.substring(9).trim(),
      rawData: data,
    };
  }
  
  // Check for CONTRACTOR: prefix (legacy)
  if (upperData.startsWith('CONTRACTOR:')) {
    return {
      entityType: 'worker',
      token: data.substring(11).trim(),
      rawData: data,
    };
  }
  
  // UUID format - could be any entity
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(data.trim())) {
    return {
      entityType: 'unknown',
      token: data.trim(),
      rawData: data,
    };
  }
  
  // Default to unknown
  return {
    entityType: 'unknown',
    token: data.trim(),
    rawData: data,
  };
}

const entityConfig: Record<QREntityType, { icon: typeof User; label: string; color: string }> = {
  visitor: { icon: User, label: 'Visitor', color: 'bg-blue-500' },
  worker: { icon: HardHat, label: 'Worker', color: 'bg-amber-500' },
  gatepass: { icon: Package, label: 'Gate Pass', color: 'bg-green-500' },
  unknown: { icon: AlertCircle, label: 'Unknown', color: 'bg-muted' },
};

export function UniversalQRScanner({ open, onOpenChange, onScan }: UniversalQRScannerProps) {
  const { t } = useTranslation();
  const [lastDetectedType, setLastDetectedType] = useState<QREntityType | null>(null);

  const handleScan = (decodedText: string) => {
    const result = detectQRFormat(decodedText);
    setLastDetectedType(result.entityType);
    onScan(result);
  };

  return (
    <ScannerDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) setLastDetectedType(null);
        onOpenChange(isOpen);
      }}
      onScan={handleScan}
      title={t('security.accessControl.scanQR', 'Scan Access QR Code')}
      description={t('security.accessControl.scanQRDescription', 'Scan visitor, worker, or gate pass QR code')}
      icon={<QrCode className="h-5 w-5 text-primary" />}
      containerId="universal-qr-scanner"
      qrboxSize={{ width: 280, height: 280 }}
    >
      {/* Supported QR types indicator */}
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {(['visitor', 'worker', 'gatepass'] as QREntityType[]).map((type) => {
          const config = entityConfig[type];
          const Icon = config.icon;
          return (
            <Badge 
              key={type} 
              variant="outline" 
              className={`gap-1.5 ${lastDetectedType === type ? config.color + ' text-white' : ''}`}
            >
              <Icon className="h-3 w-3" />
              {t(`security.accessControl.entityTypes.${type}`, config.label)}
            </Badge>
          );
        })}
      </div>
    </ScannerDialog>
  );
}

export { detectQRFormat, type ScanResult };
