import { supabase } from '@/integrations/supabase/client';

const TRUST_STORAGE_KEY = 'mfa_trusted_device_token';
const DEFAULT_TRUST_DAYS = 15;

interface TrustedDevice {
  id: string;
  device_name: string | null;
  trusted_until: string;
  created_at: string;
  last_used_at: string;
}

// Fetch tenant's configured trust duration
async function getTenantTrustDuration(userId: string): Promise<number> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (!profile?.tenant_id) return DEFAULT_TRUST_DAYS;

    const { data: tenant } = await supabase
      .from('tenants')
      .select('mfa_trust_duration_days')
      .eq('id', profile.tenant_id)
      .single();

    return tenant?.mfa_trust_duration_days ?? DEFAULT_TRUST_DAYS;
  } catch {
    return DEFAULT_TRUST_DAYS;
  }
}

export function useTrustedDevice() {
  const getDeviceName = (): string => {
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
  };

  const generateToken = (): string => {
    return crypto.randomUUID();
  };

  const checkTrustedDevice = async (userId: string): Promise<boolean> => {
    const storedToken = localStorage.getItem(TRUST_STORAGE_KEY);
    const deviceName = getDeviceName();
    console.log('[TrustedDevice] Checking trust status, token exists:', !!storedToken, 'device:', deviceName);

    try {
      // First: Try exact token match from localStorage
      if (storedToken) {
        const { data, error } = await supabase
          .from('trusted_devices')
          .select('id, trusted_until')
          .eq('user_id', userId)
          .eq('device_token', storedToken)
          .single();

        if (!error && data) {
          // Check if trust has expired
          if (new Date(data.trusted_until) < new Date()) {
            console.log('[TrustedDevice] Trust has expired, cleaning up');
            localStorage.removeItem(TRUST_STORAGE_KEY);
            await supabase.from('trusted_devices').delete().eq('id', data.id);
          } else {
            // Valid token match - update last_used_at
            await supabase
              .from('trusted_devices')
              .update({ last_used_at: new Date().toISOString() })
              .eq('id', data.id);
            console.log('[TrustedDevice] Device is trusted via token match, valid until:', data.trusted_until);
            return true;
          }
        }
      }

      // Fallback: Check by device name (same browser/OS combo) - handles domain switches
      console.log('[TrustedDevice] Token match failed, trying device name fallback');
      const { data: deviceMatch } = await supabase
        .from('trusted_devices')
        .select('id, device_token, trusted_until')
        .eq('user_id', userId)
        .eq('device_name', deviceName)
        .gt('trusted_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (deviceMatch) {
        // Resync localStorage with the valid token from database
        localStorage.setItem(TRUST_STORAGE_KEY, deviceMatch.device_token);
        console.log('[TrustedDevice] Resynced token from device name match, valid until:', deviceMatch.trusted_until);
        
        // Update last_used_at
        await supabase
          .from('trusted_devices')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', deviceMatch.id);
        
        return true;
      }

      console.log('[TrustedDevice] No valid trusted device found');
      localStorage.removeItem(TRUST_STORAGE_KEY);
      return false;
    } catch (err) {
      console.error('[TrustedDevice] Unexpected error checking trust:', err);
      return false;
    }
  };

  const trustDevice = async (userId: string): Promise<boolean> => {
    const trustDays = await getTenantTrustDuration(userId);
    const trustedUntil = new Date();
    trustedUntil.setDate(trustedUntil.getDate() + trustDays);
    const deviceName = getDeviceName();

    console.log('[TrustedDevice] Trusting device for', trustDays, 'days, device:', deviceName);

    try {
      // Step 1: Clean up ALL existing tokens for same user + device name
      // This prevents token accumulation and ensures single active token per device
      const { error: deleteError } = await supabase
        .from('trusted_devices')
        .delete()
        .eq('user_id', userId)
        .eq('device_name', deviceName);
      
      if (deleteError) {
        console.log('[TrustedDevice] Cleanup of old tokens failed (may be none):', deleteError.message);
      } else {
        console.log('[TrustedDevice] Cleaned up existing tokens for this device');
      }

      // Step 2: Create fresh trusted device record
      const token = generateToken();
      console.log('[TrustedDevice] Creating new trusted device record');
      
      const { error } = await supabase.from('trusted_devices').insert({
        user_id: userId,
        device_token: token,
        device_name: deviceName,
        trusted_until: trustedUntil.toISOString(),
        user_agent: navigator.userAgent,
      });

      if (error) {
        console.error('[TrustedDevice] Failed to trust device:', error);
        return false;
      }

      // Step 3: Save token to localStorage and verify
      localStorage.setItem(TRUST_STORAGE_KEY, token);
      
      const savedToken = localStorage.getItem(TRUST_STORAGE_KEY);
      if (savedToken !== token) {
        console.error('[TrustedDevice] localStorage failed to persist token!');
        return false;
      }
      
      console.log('[TrustedDevice] New device trusted successfully, token saved');
      return true;
    } catch (err) {
      console.error('[TrustedDevice] Unexpected error trusting device:', err);
      return false;
    }
  };

  const getTrustedDevices = async (): Promise<TrustedDevice[]> => {
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('id, device_name, trusted_until, created_at, last_used_at')
      .order('last_used_at', { ascending: false });

    if (error) {
      console.error('[TrustedDevice] Failed to fetch trusted devices:', error);
      return [];
    }

    return data || [];
  };

  const revokeDevice = async (deviceId: string): Promise<boolean> => {
    try {
      // Check if this is the current device
      const storedToken = localStorage.getItem(TRUST_STORAGE_KEY);
      if (storedToken) {
        const { data } = await supabase
          .from('trusted_devices')
          .select('device_token')
          .eq('id', deviceId)
          .single();
        
        if (data?.device_token === storedToken) {
          localStorage.removeItem(TRUST_STORAGE_KEY);
        }
      }

      const { error } = await supabase
        .from('trusted_devices')
        .delete()
        .eq('id', deviceId);

      return !error;
    } catch {
      return false;
    }
  };

  const revokeAllDevices = async (): Promise<boolean> => {
    try {
      localStorage.removeItem(TRUST_STORAGE_KEY);
      
      const { error } = await supabase
        .from('trusted_devices')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all user's devices

      return !error;
    } catch {
      return false;
    }
  };

  return {
    checkTrustedDevice,
    trustDevice,
    getTrustedDevices,
    revokeDevice,
    revokeAllDevices,
    getDeviceName,
  };
}
