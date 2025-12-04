import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

type ActivityEventType = 
  | 'login' 
  | 'logout' 
  | 'session_timeout' 
  | 'session_extended' 
  | 'mfa_enabled' 
  | 'mfa_disabled' 
  | 'mfa_verification_failed'
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'user_activated'
  | 'user_deleted'
  | 'backup_code_used';

interface LogActivityParams {
  eventType: ActivityEventType;
  sessionDurationSeconds?: number;
  metadata?: Record<string, unknown>;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logUserActivity({ 
  eventType, 
  sessionDurationSeconds, 
  metadata = {},
  oldValue,
  newValue,
  ipAddress,
}: LogActivityParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot log activity: No authenticated user');
      return;
    }

    // Get tenant_id from user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    const { error } = await supabase
      .from('user_activity_logs')
      .insert([{
        user_id: user.id,
        tenant_id: profile?.tenant_id,
        event_type: eventType,
        session_duration_seconds: sessionDurationSeconds,
        old_value: (oldValue as Json) || null,
        new_value: (newValue as Json) || null,
        ip_address: ipAddress || null,
        metadata: {
          ...metadata,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        } as Json,
      }]);

    if (error) {
      console.error('Failed to log user activity:', error);
    }
  } catch (err) {
    console.error('Error logging user activity:', err);
  }
}

// Track session start time for duration calculation
let sessionStartTime: number | null = null;

export function startSessionTracking(): void {
  sessionStartTime = Date.now();
}

export function getSessionDurationSeconds(): number | null {
  if (!sessionStartTime) return null;
  return Math.floor((Date.now() - sessionStartTime) / 1000);
}

export function clearSessionTracking(): void {
  sessionStartTime = null;
}
