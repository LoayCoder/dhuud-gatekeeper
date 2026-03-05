import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { QRScanResult, GateQRScannerProps } from '../types';
import { playAudioFeedback, AUTO_RESET_DELAY_MS } from './helpers';

export type GateActionType = 'entry' | 'exit' | 'verify';

export function useGateQRScanner({ open, onOpenChange, onScanResult, expectedType }: GateQRScannerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [isScannerActive, setIsScannerActive] = useState(true);
  const [autoResetCountdown, setAutoResetCountdown] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<GateActionType | null>(null);
  const scannerKeyRef = useRef(0);

  const handleScan = useCallback(async (code: string) => {
    // Stub implementation
    setScanResult(null);
    onScanResult?.({ type: 'unknown', status: 'not_found', rawCode: code });
  }, [onScanResult]);

  const handleClose = useCallback(() => {
    setScanResult(null);
    setIsScannerActive(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleScanNext = useCallback(() => {
    setScanResult(null);
    setIsScannerActive(true);
    scannerKeyRef.current += 1;
  }, []);

  const handleUseAndClose = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handleActionRequest = useCallback((action: GateActionType) => {
    setConfirmAction(action);
    setConfirmDialogOpen(true);
  }, []);

  const handleRecordExit = useCallback(async () => {
    // Stub
  }, []);

  const handleConfirmedEntry = useCallback(async () => {
    // Stub
  }, []);

  return {
    t,
    profile,
    user,
    isVerifying,
    isLogging,
    scanResult,
    isScannerActive,
    autoResetCountdown,
    confirmDialogOpen,
    setConfirmDialogOpen,
    confirmAction,
    scannerKeyRef,
    handleScan,
    handleClose,
    handleScanNext,
    handleUseAndClose,
    handleActionRequest,
    handleRecordExit,
    handleConfirmedEntry,
  };
}
