const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/components/security/GateQRScanner.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/components/security/GateQRScanner');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const hooksDir = path.join(targetDir, 'hooks');
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

function extractBetween(str, startStr, endStr) {
    const startIdx = str.indexOf(startStr);
    if (startIdx === -1) return '';
    const restStr = str.substring(startIdx + startStr.length);
    const endIdx = restStr.indexOf(endStr);
    if (endIdx === -1) return '';
    return restStr.substring(0, endIdx);
}

// 1. Types
const typesStr = extractBetween(content, 'interface GateQRScannerProps {', '// Audio feedback utility');

const typesContent = `export interface GateQRScannerProps {${typesStr}`;
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesContent);

// 2. Helpers
const helpersStr = extractBetween(content, '// Audio feedback utility', 'export function GateQRScanner');

const helpersContent = `import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';\nimport { QRScanResult } from './types';\nimport { logger } from '@/lib/logger';\n\n${helpersStr}
export const getStatusConfig = (status: QRScanResult['status'], isOnSite?: boolean, t?: any) => {
  if (isOnSite) {
    return { 
      icon: AlertTriangle, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50 dark:bg-amber-950/30', 
      border: 'border-amber-500', 
      label: t ? t('security.qrScanner.alreadyOnSite', 'ALREADY ON SITE') : 'ALREADY ON SITE' 
    };
  }
  
  switch (status) {
    case 'valid':
      return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-600', label: t ? t('security.qrScanner.valid', 'VALID') : 'VALID' };
    case 'expired':
      return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-600', label: t ? t('security.qrScanner.expired', 'EXPIRED') : 'EXPIRED' };
    case 'revoked':
      return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive', label: t ? t('security.qrScanner.revoked', 'REVOKED') : 'REVOKED' };
    case 'used':
      return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-600', label: t ? t('security.qrScanner.used', 'USED') : 'USED' };
    default:
      return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive', label: t ? t('security.qrScanner.invalid', 'INVALID') : 'INVALID' };
  }
};
`;

fs.writeFileSync(path.join(hooksDir, 'helpers.ts'), helpersContent);

// 3. Main Hook (useGateQRScanner.ts)
const hookBodyStr = extractBetween(content, '  const { t } = useTranslation();', '  const getStatusConfig = (status: QRScanResult[\'status\'], isOnSite?: boolean) => {');

const hookTop = `import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { gateOfflineCache } from '@/lib/gate-offline-cache';
import { useHostArrivalNotification } from '@/hooks/use-host-arrival-notification';
import { useConfirmGatePassEntry, useConfirmGatePassExit } from '@/hooks/contractor-management/use-gate-pass-verification';
import { logger } from '@/lib/logger';
import { QRScanResult } from '../types';
import { playAudioFeedback, AUTO_RESET_DELAY_MS } from './helpers';
import { GateActionType } from '../GateActionConfirmDialog';

export function useGateQRScanner({ open, onOpenChange, onScanResult, expectedType }: any) {
  const { t } = useTranslation();
`;

// Remove handleRecordExit and confirmedEntry from the main body because they use the states, we can just return what we need. 
// Wait, hookBodyStr includes handleRecordExit which is below handleActionRequest if it's there? No, hookBodyStr ends at getStatusConfig.
// Let's check where getStatusConfig is in relation to handleActionRequest: getStatusConfig is before handleActionRequest in the original file.
// Let's extract everything from "const { t }" down to "return (" for the hook.

const fullHookStr = extractBetween(content, '  const { t } = useTranslation();', '  return (\n    <Dialog');

const fullHookTop = `import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { gateOfflineCache } from '@/lib/gate-offline-cache';
import { useHostArrivalNotification } from '@/hooks/use-host-arrival-notification';
import { useConfirmGatePassEntry, useConfirmGatePassExit } from '@/hooks/contractor-management/use-gate-pass-verification';
import { logger } from '@/lib/logger';
import { QRScanResult, GateQRScannerProps } from '../types';
import { playAudioFeedback, AUTO_RESET_DELAY_MS } from './helpers';
import { GateActionType } from '../GateActionConfirmDialog';

export function useGateQRScanner({ open, onOpenChange, onScanResult, expectedType }: GateQRScannerProps) {
  const { t } = useTranslation();
`;

// Remove getStatusConfig from the hook string since we moved it to helpers.ts
const cleanedHookStr = fullHookStr.replace(/const getStatusConfig = \([\s\S]*?};\n\n  \/\/ Handle confirmation dialog/m, '// Handle confirmation dialog');


const fullHookReturn = `  return {
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
`;

fs.writeFileSync(path.join(hooksDir, 'useGateQRScanner.ts'), fullHookTop + cleanedHookStr + fullHookReturn);

// 4. Shell Component
const jsxStr = extractBetween(content, '    <Dialog open={open} onOpenChange={handleClose}>', '  );\n}');

const shellContent = `import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, AlertTriangle, User, HardHat, Loader2, QrCode, ShieldCheck, Clock, WifiOff, LogIn, LogOut, RotateCcw, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CameraScanner } from '@/components/ui/camera-scanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkerPhotoGallery } from '../WorkerPhotoGallery';
import { GateActionConfirmDialog } from '../GateActionConfirmDialog';
import { format, differenceInMinutes } from 'date-fns';
import { useGateQRScanner } from './hooks/useGateQRScanner';
import { getStatusConfig } from './hooks/helpers';
import { GateQRScannerProps } from './types';

export default function GateQRScanner(props: GateQRScannerProps) {
  const { open } = props;
  const {
    t,
    profile,
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
    handleActionRequest,
    handleRecordExit,
    handleConfirmedEntry,
  } = useGateQRScanner(props);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
${jsxStr}  );
}
`;

// Need to fix getStatusConfig calls in jsxStr to pass t
const fixedJsxStr = shellContent.replace(/getStatusConfig\(scanResult\.status, scanResult\.data\?\.isOnSite\)/g, "getStatusConfig(scanResult.status, scanResult.data?.isOnSite, t)");

fs.writeFileSync(path.join(targetDir, 'GateQRScanner.tsx'), fixedJsxStr);
fs.writeFileSync(path.join(targetDir, 'index.tsx'), "export { default } from './GateQRScanner';\nexport * from './types';\n");

console.log('Extraction complete!');
