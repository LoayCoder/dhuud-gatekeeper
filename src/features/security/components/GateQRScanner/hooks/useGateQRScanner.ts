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
import { GateActionType } from '../GateActionConfirmDialog';

export function useGateQRScanner({ open, onOpenChange, onScanResult, expectedType }: GateQRScannerProps) {
  const { t } = useTranslation();
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
