import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { gateOfflineCache } from '@/lib/gate-offline-cache';
import { useHostArrivalNotification } from '@/hooks/use-host-arrival-notification';
import { useConfirmGatePassEntry, useConfirmGatePassExit } from '@/features/contractors/hooks/use-gate-pass-verification';
import { logger } from '@/lib/logger';
import { QRScanResult, GateQRScannerProps } from '../types';
import { playAudioFeedback, AUTO_RESET_DELAY_MS } from './helpers';
import type { GateActionType } from '../GateActionConfirmDialog';

export function useGateQRScanner({ open, onOpenChange, onScanResult, expectedType }: GateQRScannerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [isScannerActive, setIsScannerActive] = useState(true);
  const [autoResetCountdown, setAutoResetCountdown] = useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<GateActionType>('entry');
  const scannerKeyRef = useRef(0);

  const confirmEntry = useConfirmGatePassEntry();
  const confirmExit = useConfirmGatePassExit();

  const handleScan = useCallback(async (rawCode: string) => {
    if (isVerifying || !isScannerActive) return;
    setIsVerifying(true);
    setIsScannerActive(false);

    try {
      logger.info('[GateQR] Scanning code:', rawCode);
      // Try to parse QR code and verify
      const result: QRScanResult = {
        type: 'unknown',
        status: 'invalid',
        rawCode,
      };

      // Try gate pass verification
      try {
        const { data, error } = await (supabase as any)
          .from('contractor_gate_passes')
          .select('*, worker:contractor_workers(full_name, company:contractor_companies(company_name))')
          .eq('qr_code', rawCode)
          .is('deleted_at', null)
          .maybeSingle();

        if (data) {
          result.type = 'gatepass';
          result.id = data.id;
          result.status = data.status === 'active' ? 'valid' : data.status === 'expired' ? 'expired' : 'invalid';
          result.data = {
            name: (data.worker as any)?.full_name,
            company: (data.worker as any)?.company?.company_name,
            expiresAt: data.expires_at,
          };
        }
      } catch (e) {
        logger.debug('[GateQR] Not a gate pass');
      }

      setScanResult(result);
      onScanResult(result);
      playAudioFeedback(result.status === 'valid' ? 'success' : result.status === 'expired' ? 'warning' : 'error');

      // Start auto-reset countdown
      setAutoResetCountdown(AUTO_RESET_DELAY_MS / 1000);
    } catch (error) {
      logger.error('[GateQR] Scan error:', error);
      playAudioFeedback('error');
    } finally {
      setIsVerifying(false);
    }
  }, [isVerifying, isScannerActive, onScanResult]);

  // Auto-reset countdown
  useEffect(() => {
    if (autoResetCountdown === null || autoResetCountdown <= 0) return;
    const timer = setTimeout(() => {
      setAutoResetCountdown(prev => prev !== null ? prev - 1 : null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoResetCountdown]);

  useEffect(() => {
    if (autoResetCountdown === 0) {
      handleScanNext();
    }
  }, [autoResetCountdown]);

  const handleClose = useCallback(() => {
    setScanResult(null);
    setIsScannerActive(false);
    setAutoResetCountdown(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleScanNext = useCallback(() => {
    setScanResult(null);
    setIsScannerActive(true);
    setAutoResetCountdown(null);
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
    if (!scanResult?.data?.entryId) return;
    setIsLogging(true);
    try {
      await confirmExit.mutateAsync(scanResult.data.entryId);
      toast({ title: t('security.qrScanner.exitRecorded', 'Exit recorded') });
      queryClient.invalidateQueries({ queryKey: ['gate-entries'] });
    } catch (error) {
      toast({ title: t('common.error', 'Error'), variant: 'destructive' });
    } finally {
      setIsLogging(false);
    }
  }, [scanResult, confirmExit, toast, t, queryClient]);

  const handleConfirmedEntry = useCallback(async () => {
    if (!scanResult?.id) return;
    setIsLogging(true);
    try {
      await confirmEntry.mutateAsync(scanResult.id);
      toast({ title: t('security.qrScanner.entryRecorded', 'Entry recorded') });
      queryClient.invalidateQueries({ queryKey: ['gate-entries'] });
      setConfirmDialogOpen(false);
    } catch (error) {
      toast({ title: t('common.error', 'Error'), variant: 'destructive' });
    } finally {
      setIsLogging(false);
    }
  }, [scanResult, confirmEntry, toast, t, queryClient]);

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
