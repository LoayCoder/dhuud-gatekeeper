import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { QRScanResult } from './types';
import { logger } from '@/lib/logger';

// Audio feedback utility for scan results
const playAudioFeedback = (type: 'success' | 'warning' | 'error') => {
  try {
    const AudioContext = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Configure frequency based on type
    oscillator.frequency.value = type === 'success' ? 880 : type === 'warning' ? 440 : 220;
    oscillator.type = type === 'success' ? 'sine' : 'square';
    
    // Short beep with fade out
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    // Audio not supported, fail silently
    logger.debug('[GateQR] Audio feedback not available');
  }
};

const AUTO_RESET_DELAY_MS = 8000; // 8 seconds auto-reset


export const getStatusConfig = (status: QRScanResult['status'], isOnSite?: boolean, t?: (key: string, defaultText: string) => string) => {
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
