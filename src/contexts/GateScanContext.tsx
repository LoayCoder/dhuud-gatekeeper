import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { QRScanResult } from '@/components/security/GateQRScanner';

interface GateScanContextType {
  pendingScanResult: QRScanResult | null;
  setPendingScanResult: (result: QRScanResult | null) => void;
  clearPendingScanResult: () => void;
}

const GateScanContext = createContext<GateScanContextType | undefined>(undefined);

export function GateScanProvider({ children }: { children: ReactNode }) {
  const [pendingScanResult, setPendingScanResult] = useState<QRScanResult | null>(null);

  const clearPendingScanResult = useCallback(() => {
    setPendingScanResult(null);
  }, []);

  return (
    <GateScanContext.Provider value={{ 
      pendingScanResult, 
      setPendingScanResult,
      clearPendingScanResult 
    }}>
      {children}
    </GateScanContext.Provider>
  );
}

export function useGateScan() {
  const context = useContext(GateScanContext);
  if (context === undefined) {
    throw new Error('useGateScan must be used within a GateScanProvider');
  }
  return context;
}
