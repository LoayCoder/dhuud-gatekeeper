import { supabase } from '@/integrations/supabase/client';

const TRUST_STORAGE_KEY = 'mfa_trusted_device_token';
const TRUST_DAYS = 15;

interface TrustedDevice {
  id: string;
  device_name: string | null;
  trusted_until: string;
  created_at: string;
  last_used_at: string;
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
    if (!storedToken) return false;

    try {
      const { data, error } = await supabase
        .from('trusted_devices')
        .select('id, trusted_until')
        .eq('user_id', userId)
        .eq('device_token', storedToken)
        .single();

      if (error || !data) {
        localStorage.removeItem(TRUST_STORAGE_KEY);
        return false;
      }

      // Check if trust has expired
      if (new Date(data.trusted_until) < new Date()) {
        localStorage.removeItem(TRUST_STORAGE_KEY);
        // Clean up expired record
        await supabase.from('trusted_devices').delete().eq('id', data.id);
        return false;
      }

      // Update last_used_at
      await supabase
        .from('trusted_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

      return true;
    } catch {
      return false;
    }
  };

  const trustDevice = async (userId: string): Promise<boolean> => {
    const token = generateToken();
    const trustedUntil = new Date();
    trustedUntil.setDate(trustedUntil.getDate() + TRUST_DAYS);

    try {
      const { error } = await supabase.from('trusted_devices').insert({
        user_id: userId,
        device_token: token,
        device_name: getDeviceName(),
        trusted_until: trustedUntil.toISOString(),
        user_agent: navigator.userAgent,
      });

      if (error) {
        console.error('Failed to trust device:', error);
        return false;
      }

      localStorage.setItem(TRUST_STORAGE_KEY, token);
      return true;
    } catch {
      return false;
    }
  };

  const getTrustedDevices = async (): Promise<TrustedDevice[]> => {
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('id, device_name, trusted_until, created_at, last_used_at')
      .order('last_used_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch trusted devices:', error);
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
