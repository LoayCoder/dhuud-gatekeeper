/**
 * Security Push Notifications Hook
 * 
 * Manages push notification subscription and real-time alerts for security personnel.
 * Ensures emergency alerts work even when the app is in the background.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePushSubscription, usePushNotificationStatus } from './use-push-subscription';
import { useToast } from '@/hooks/use-toast';

// Security roles that should receive emergency alerts
const SECURITY_ROLES = ['security_guard', 'supervisor', 'hsse_manager', 'admin'];

interface EmergencyAlertPayload {
  id: string;
  alert_type: string;
  priority: string;
  location: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  details: string | null;
  tenant_id: string;
  created_at: string;
}

// Alert type labels for i18n
const ALERT_TYPE_KEYS: Record<string, string> = {
  panic: 'PANIC ALERT',
  duress: 'DURESS ALARM',
  fire: 'FIRE EMERGENCY',
  medical: 'MEDICAL EMERGENCY',
  security_breach: 'SECURITY BREACH',
  assault: 'ASSAULT ALERT',
  evacuation: 'EVACUATION ORDER',
  intruder: 'INTRUDER ALERT',
};

const PRIORITY_EMOJI: Record<string, string> = {
  critical: '🚨',
  high: '🔴',
  medium: '🟠',
  low: '🟡',
};

// Play emergency alert sound
function playAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.6);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.6);
  } catch (e) {
    console.log('Could not play alert sound:', e);
  }
}

export function useSecurityPushNotifications() {
  const { t } = useTranslation();
  const { user, profile, userRole } = useAuth();
  const { toast } = useToast();
  const promptShownRef = useRef(false);
  
  const { isSubscribed, isSupported, subscribe } = usePushSubscription();
  const { permission } = usePushNotificationStatus();

  // Check if user is security personnel
  const isSecurityPersonnel = SECURITY_ROLES.includes(userRole || '');

  // Show emergency toast with actions
  const showEmergencyToast = useCallback((alert: EmergencyAlertPayload) => {
    const alertLabel = ALERT_TYPE_KEYS[alert.alert_type] || alert.alert_type;
    const emoji = PRIORITY_EMOJI[alert.priority] || '🚨';
    
    const title = `${emoji} ${alertLabel}`;
    const description = alert.location 
      ? `📍 ${alert.location}${alert.details ? ` - ${alert.details.substring(0, 50)}` : ''}`
      : alert.details?.substring(0, 80) || '';

    toast({
      title,
      description,
      variant: 'destructive',
      duration: 30000,
    });

    // Play alert sound
    playAlertSound();
  }, [toast]);

  // Auto-prompt security guards to enable push notifications
  const promptForNotifications = useCallback(async () => {
    if (!isSecurityPersonnel || !isSupported || isSubscribed || promptShownRef.current) return;
    
    // Check if we've already prompted recently (within 24 hours)
    const lastPrompt = localStorage.getItem('security_push_prompt_time');
    if (lastPrompt) {
      const hoursSincePrompt = (Date.now() - parseInt(lastPrompt)) / (1000 * 60 * 60);
      if (hoursSincePrompt < 24) return;
    }

    promptShownRef.current = true;

    // Show toast prompting to enable notifications
    toast({
      title: t('security.notifications.enablePush', 'Enable Emergency Alerts'),
      description: t('security.notifications.enableDescription', 'Receive instant alerts even when the app is closed'),
      duration: 10000,
    });

    localStorage.setItem('security_push_prompt_time', Date.now().toString());
  }, [isSecurityPersonnel, isSupported, isSubscribed, t, toast]);

  // Enable push notifications
  const enablePushNotifications = useCallback(async () => {
    if (permission !== 'granted' && 'Notification' in window) {
      const result = await Notification.requestPermission();
      if (result !== 'granted') return false;
    }
    const success = await subscribe();
    return success;
  }, [permission, subscribe]);

  // Listen for emergency alerts in real-time (for foreground notifications)
  useEffect(() => {
    if (!user?.id || !profile?.tenant_id || !isSecurityPersonnel) return;

    const channel = supabase
      .channel('security-emergency-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emergency_alerts',
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        (payload) => {
          const alert = payload.new as EmergencyAlertPayload;
          
          // Show in-app toast for foreground notifications
          showEmergencyToast(alert);
          
          // Trigger vibration if supported
          if ('vibrate' in navigator) {
            navigator.vibrate([500, 200, 500, 200, 500]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.tenant_id, isSecurityPersonnel, showEmergencyToast]);

  // Prompt for notifications after login
  useEffect(() => {
    if (isSecurityPersonnel && user?.id) {
      // Delay prompt to let page load
      const timer = setTimeout(promptForNotifications, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSecurityPersonnel, user?.id, promptForNotifications]);

  // Listen for service worker messages about emergency alerts
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'EMERGENCY_ALERT_RECEIVED') {
        // Alert was received by service worker while app was in background
        // Show in-app notification now that app is focused
        const alert = event.data.alert as EmergencyAlertPayload;
        if (alert) {
          showEmergencyToast(alert);
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [showEmergencyToast]);

  return {
    isSecurityPersonnel,
    isSubscribed,
    isSupported,
    permission,
    promptForNotifications,
    enablePushNotifications,
  };
}
