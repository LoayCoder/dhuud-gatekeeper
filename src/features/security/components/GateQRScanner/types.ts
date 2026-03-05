export interface GateQRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanResult: (result: QRScanResult) => void;
  expectedType?: 'worker' | 'visitor';
}

export interface QRScanResult {
  type: 'visitor' | 'worker' | 'gatepass' | 'unknown';
  id?: string;
  status: 'valid' | 'invalid' | 'expired' | 'revoked' | 'not_found' | 'used';
  data?: {
    name?: string;
    company?: string;
    projectName?: string;
    inductionStatus?: string;
    expiresAt?: string;
    warnings?: string[];
    isOnSite?: boolean;
    entryTime?: string;
    entryId?: string;
    qrUsedAt?: string;
    nationalId?: string;
    photoUrl?: string;
    materialDescription?: string;
    quantity?: string;
    vehiclePlate?: string;
    driverName?: string;
    driverMobile?: string;
  };
  rawCode: string;
  isOfflineCached?: boolean;
  cachedAt?: number;
}

