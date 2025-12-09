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
    console.log('[TrustedDevice] Checking trust status, token exists:', !!storedToken);
    
    if (!storedToken) return false;

    try {
      const { data, error } = await supabase
        .from('trusted_devices')
        .select('id, trusted_until')
        .eq('user_id', userId)
        .eq('device_token', storedToken)
        .single();

      if (error) {
        console.error('[TrustedDevice] Failed to check trusted device:', error);
        localStorage.removeItem(TRUST_STORAGE_KEY);
        return false;
      }

      if (!data) {
        console.log('[TrustedDevice] No matching device found in database');
        localStorage.removeItem(TRUST_STORAGE_KEY);
        return false;
      }

      // Check if trust has expired
      if (new Date(data.trusted_until) < new Date()) {
        console.log('[TrustedDevice] Trust has expired, cleaning up');
        localStorage.removeItem(TRUST_STORAGE_KEY);
        // Clean up expired record
        await supabase.from('trusted_devices').delete().eq('id', data.id);
        return false;
      }

      // Update last_used_at with error handling
      const { error: updateError } = await supabase
        .from('trusted_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

      if (updateError) {
        console.error('[TrustedDevice] Failed to update last_used_at:', updateError);
      }

      console.log('[TrustedDevice] Device is trusted, valid until:', data.trusted_until);
      return true;
    } catch (err) {
      console.error('[TrustedDevice] Unexpected error checking trust:', err);
      return false;
    }
  };

  const trustDevice = async (userId: string): Promise<boolean> => {
    const existingToken = localStorage.getItem(TRUST_STORAGE_KEY);
    const trustDays = await getTenantTrustDuration(userId);
    const trustedUntil = new Date();
    trustedUntil.setDate(trustedUntil.getDate() + trustDays);

    console.log('[TrustedDevice] Trusting device for', trustDays, 'days');

    try {
      // If there's an existing token in localStorage, try to update it first
      if (existingToken) {
        console.log('[TrustedDevice] Found existing token, attempting to update');
        
        const { data: existingDevice, error: lookupError } = await supabase
          .from('trusted_devices')
          .select('id')
          .eq('user_id', userId)
          .eq('device_token', existingToken)
          .single();
        
        if (lookupError) {
          console.log('[TrustedDevice] No existing device found for token:', lookupError.message);
        }
        
        if (existingDevice) {
          // Update existing trust period
          const { error } = await supabase
            .from('trusted_devices')
            .update({ 
              trusted_until: trustedUntil.toISOString(),
              last_used_at: new Date().toISOString()
            })
            .eq('id', existingDevice.id);
          
          if (!error) {
            console.log('[TrustedDevice] Updated existing device trust period');
            return true;
          }
          console.error('[TrustedDevice] Failed to update existing device:', error);
        }
      }

      // No existing device found or update failed, create new
      const token = generateToken();
      console.log('[TrustedDevice] Creating new trusted device record');
      
      const { error } = await supabase.from('trusted_devices').insert({
        user_id: userId,
        device_token: token,
        device_name: getDeviceName(),
        trusted_until: trustedUntil.toISOString(),
        user_agent: navigator.userAgent,
      });

      if (error) {
        console.error('[TrustedDevice] Failed to trust device:', error);
        return false;
      }

      localStorage.setItem(TRUST_STORAGE_KEY, token);
      console.log('[TrustedDevice] New device trusted successfully');
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
