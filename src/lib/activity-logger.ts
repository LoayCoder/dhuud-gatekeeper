import { supabase } from '@/integrations/supabase/client';

type ActivityEventType = 'login' | 'logout' | 'session_timeout' | 'session_extended' | 'mfa_enabled' | 'mfa_disabled' | 'mfa_verification_failed';

interface LogActivityParams {
  eventType: ActivityEventType;
  sessionDurationSeconds?: number;
  metadata?: Record<string, unknown>;
}

export async function logUserActivity({ 
  eventType, 
  sessionDurationSeconds, 
  metadata = {} 
}: LogActivityParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot log activity: No authenticated user');
      return;
    }

    const { error } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: user.id,
        event_type: eventType,
        session_duration_seconds: sessionDurationSeconds,
        metadata: {
          ...metadata,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      });

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
