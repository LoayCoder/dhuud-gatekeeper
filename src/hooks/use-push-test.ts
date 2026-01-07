import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushSubscription, usePushNotificationStatus } from './use-push-subscription';

export interface PushTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Hook for testing push notifications
 */
export function usePushTest() {
  const { user, profile, userRole } = useAuth();
  const { isSubscribed, subscription, subscribe, refresh } = usePushSubscription();
  const { permission, isSupported, hasServiceWorker } = usePushNotificationStatus();
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<PushTestResult | null>(null);

  /**
   * Get complete status of push notification system
   */
  const getSystemStatus = useCallback(() => {
    return {
      browserSupport: isSupported,
      serviceWorkerActive: hasServiceWorker,
      permissionStatus: permission,
      isSubscribed,
      hasEndpoint: !!subscription?.endpoint,
      userId: user?.id,
      tenantId: profile?.tenant_id,
      userRole: userRole,
    };
  }, [isSupported, hasServiceWorker, permission, isSubscribed, subscription, user, profile, userRole]);

  /**
   * Send a simple test push notification to current device
   */
  const sendTestPush = useCallback(async (): Promise<PushTestResult> => {
    if (!user?.id || !profile?.tenant_id) {
      return { success: false, message: 'User not authenticated' };
    }

    if (!isSubscribed) {
      return { success: false, message: 'Device not subscribed to push notifications' };
    }

    setIsTestingPush(true);
    setLastTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: '🔔 Test Notification',
          body: `Push notification test at ${new Date().toLocaleTimeString()}`,
          data: {
            type: 'test',
            timestamp: Date.now(),
          },
        },
      });

      if (error) {
        const result: PushTestResult = {
          success: false,
          message: `Failed to send: ${error.message}`,
          details: { error },
        };
        setLastTestResult(result);
        return result;
      }

      const result: PushTestResult = {
        success: true,
        message: 'Test push sent successfully! Check your notifications.',
        details: data,
      };
      setLastTestResult(result);
      return result;
    } catch (err) {
      const result: PushTestResult = {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
      setLastTestResult(result);
      return result;
    } finally {
      setIsTestingPush(false);
    }
  }, [user?.id, profile?.tenant_id, isSubscribed]);

  /**
   * Create a test emergency alert to trigger full notification flow
   */
  const createTestEmergencyAlert = useCallback(async (
    alertType: 'panic' | 'fire' | 'medical' | 'security_breach' | 'evacuation' = 'panic'
  ): Promise<PushTestResult> => {
    if (!user?.id || !profile?.tenant_id) {
      return { success: false, message: 'User not authenticated' };
    }

    setIsCreatingAlert(true);
    setLastTestResult(null);

    try {
      // Create a test emergency alert - use guard_id instead of triggered_by
      const { data: alert, error } = await supabase
        .from('emergency_alerts')
        .insert({
          tenant_id: profile.tenant_id,
          guard_id: user.id,
          alert_type: alertType,
          priority: alertType === 'panic' || alertType === 'fire' ? 'critical' : 'high',
          status: 'active',
          notes: `[TEST] This is a test emergency alert created at ${new Date().toISOString()}`,
          latitude: null,
          longitude: null,
        })
        .select('id')
        .single();

      if (error) {
        const result: PushTestResult = {
          success: false,
          message: `Failed to create alert: ${error.message}`,
          details: { error },
        };
        setLastTestResult(result);
        return result;
      }

      // Manually trigger the dispatch function since we may not have the DB trigger yet
      const { error: dispatchError } = await supabase.functions.invoke('dispatch-emergency-alert', {
        body: { alert_id: alert.id },
      });

      if (dispatchError) {
        console.warn('Dispatch function error (alert still created):', dispatchError);
      }

      const result: PushTestResult = {
        success: true,
        message: `Test alert created: ${alert.id.substring(0, 8)}... Push notifications should arrive shortly.`,
        details: { alertId: alert.id },
      };
      setLastTestResult(result);
      return result;
    } catch (err) {
      const result: PushTestResult = {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
      setLastTestResult(result);
      return result;
    } finally {
      setIsCreatingAlert(false);
    }
  }, [user?.id, profile?.tenant_id]);

  /**
   * Check if current device has a valid subscription in database
   */
  const verifyDatabaseSubscription = useCallback(async (): Promise<PushTestResult> => {
    if (!user?.id || !subscription?.endpoint) {
      return { success: false, message: 'No subscription to verify' };
    }

    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id, is_active, created_at, updated_at, device_type, browser_name')
        .eq('user_id', user.id)
        .eq('endpoint', subscription.endpoint)
        .maybeSingle();

      if (error) {
        return {
          success: false,
          message: `Database query failed: ${error.message}`,
        };
      }

      if (!data) {
        return {
          success: false,
          message: 'Subscription not found in database. Try re-subscribing.',
        };
      }

      if (!data.is_active) {
        return {
          success: false,
          message: 'Subscription is marked inactive in database.',
          details: data,
        };
      }

      return {
        success: true,
        message: 'Subscription verified in database.',
        details: data,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }, [user?.id, subscription?.endpoint]);

  return {
    // Status
    getSystemStatus,
    isTestingPush,
    isCreatingAlert,
    lastTestResult,
    
    // Actions
    sendTestPush,
    createTestEmergencyAlert,
    verifyDatabaseSubscription,
    subscribeDevice: subscribe,
    refreshSubscription: refresh,
  };
}
