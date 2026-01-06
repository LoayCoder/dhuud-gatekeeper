import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'invitation_verified_device_token';

interface VerifiedDevice {
  id: string;
  device_name: string | null;
  verified_at: string;
  last_used_at: string;
  tenant_id: string | null;
}

/**
 * Hook for managing verified devices for invitation verification.
 * Devices that have been verified through the invitation process
 * don't need to re-enter the invitation code.
 */
export function useVerifiedDevice() {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Generates a device name based on browser and OS
   */
  const getDeviceName = useCallback((): string => {
    const ua = navigator.userAgent;
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    // Detect browser
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';

    // Detect OS
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return `${browser} on ${os}`;
  }, []);

  /**
   * Generates a unique token for the device
   */
  const generateToken = useCallback((): string => {
    return crypto.randomUUID();
  }, []);

  /**
   * Gets the stored device token from localStorage
   */
  const getStoredToken = useCallback((): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }, []);

  /**
   * Stores a device token in localStorage
   */
  const storeToken = useCallback((token: string): void => {
    try {
      localStorage.setItem(STORAGE_KEY, token);
    } catch (error) {
      console.error('Failed to store verified device token:', error);
    }
  }, []);

  /**
   * Removes the device token from localStorage
   */
  const clearToken = useCallback((): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear verified device token:', error);
    }
  }, []);

  /**
   * Checks if the current device has a stored verification token
   * This is used before authentication to determine redirect flow
   */
  const hasStoredVerification = useCallback((): boolean => {
    return !!getStoredToken();
  }, [getStoredToken]);

  /**
   * Checks if the current device is verified for a specific user
   * Call this after login to validate the stored token
   */
  const checkVerifiedDevice = useCallback(async (userId: string): Promise<boolean> => {
    const token = getStoredToken();
    if (!token) return false;

    try {
      const { data, error } = await supabase
        .from('verified_devices')
        .select('id, last_used_at, expires_at')
        .eq('user_id', userId)
        .eq('device_token', token)
        .is('deleted_at', null)
        .maybeSingle();

      if (error || !data) {
        // Token not found in database, clear local storage
        clearToken();
        return false;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        clearToken();
        return false;
      }

      // Update last_used_at
      await supabase
        .from('verified_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

      return true;
    } catch (error) {
      console.error('Error checking verified device:', error);
      return false;
    }
  }, [getStoredToken, clearToken]);

  /**
   * Marks the current device as verified after successful login
   */
  const verifyDevice = useCallback(async (userId: string, tenantId: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Check if there's an existing token
      let token = getStoredToken();
      const deviceName = getDeviceName();

      // If token exists, check if it's already in the database for this user
      if (token) {
        const { data: existing } = await supabase
          .from('verified_devices')
          .select('id')
          .eq('user_id', userId)
          .eq('device_token', token)
          .is('deleted_at', null)
          .maybeSingle();

        if (existing) {
          // Update existing record
          await supabase
            .from('verified_devices')
            .update({
              last_used_at: new Date().toISOString(),
              device_name: deviceName,
              user_agent: navigator.userAgent
            })
            .eq('id', existing.id);
          
          return true;
        }
      }

      // Generate new token if none exists
      if (!token) {
        token = generateToken();
      }

      // Clean up old entries for this device name and user
      await supabase
        .from('verified_devices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('device_name', deviceName)
        .is('deleted_at', null);

      // Insert new verified device
      const { error } = await supabase
        .from('verified_devices')
        .insert({
          user_id: userId,
          device_token: token,
          device_name: deviceName,
          tenant_id: tenantId,
          user_agent: navigator.userAgent,
          verified_at: new Date().toISOString(),
          last_used_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error verifying device:', error);
        return false;
      }

      // Store token in localStorage
      storeToken(token);
      return true;
    } catch (error) {
      console.error('Error verifying device:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getStoredToken, generateToken, getDeviceName, storeToken]);

  /**
   * Gets all verified devices for the current user
   */
  const getVerifiedDevices = useCallback(async (): Promise<VerifiedDevice[]> => {
    try {
      const { data, error } = await supabase
        .from('verified_devices')
        .select('id, device_name, verified_at, last_used_at, tenant_id')
        .is('deleted_at', null)
        .order('last_used_at', { ascending: false });

      if (error) {
        console.error('Error fetching verified devices:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching verified devices:', error);
      return [];
    }
  }, []);

  /**
   * Revokes a specific verified device
   */
  const revokeDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('verified_devices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deviceId);

      if (error) {
        console.error('Error revoking device:', error);
        return false;
      }

      // If this is the current device, clear the local token
      const token = getStoredToken();
      if (token) {
        const { data } = await supabase
          .from('verified_devices')
          .select('device_token')
          .eq('id', deviceId)
          .single();
        
        if (data?.device_token === token) {
          clearToken();
        }
      }

      return true;
    } catch (error) {
      console.error('Error revoking device:', error);
      return false;
    }
  }, [getStoredToken, clearToken]);

  /**
   * Revokes all verified devices for the current user
   */
  const revokeAllDevices = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('verified_devices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (error) {
        console.error('Error revoking all devices:', error);
        return false;
      }

      clearToken();
      return true;
    } catch (error) {
      console.error('Error revoking all devices:', error);
      return false;
    }
  }, [clearToken]);

  return {
    isLoading,
    hasStoredVerification,
    checkVerifiedDevice,
    verifyDevice,
    getVerifiedDevices,
    revokeDevice,
    revokeAllDevices,
    clearToken
  };
}
