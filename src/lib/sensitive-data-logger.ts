import { supabase } from '@/integrations/supabase/client';

export type SensitiveDataAccessType = 
  | 'profile_phone_viewed'
  | 'profile_emergency_contact_viewed'
  | 'visitor_national_id_viewed'
  | 'blacklist_entry_viewed'
  | 'tenant_billing_viewed'
  | 'invitation_code_viewed';

interface AccessLogMetadata {
  target_user_id?: string;
  target_visitor_id?: string;
  target_tenant_id?: string;
  access_granted: boolean;
  reason?: string;
}

/**
 * Log sensitive data access attempts for security audit trail
 * This helps track who accessed what sensitive information and when
 */
export async function logSensitiveDataAccess(
  accessType: SensitiveDataAccessType,
  metadata: AccessLogMetadata
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Attempted to log sensitive data access without authenticated user');
      return;
    }

    // Log to user_activity_logs with a custom event type
    // We'll use 'login' as the event_type since it's in the enum, 
    // but store the actual access type in metadata
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: user.id,
        event_type: 'login', // Using existing enum value
        metadata: {
          sensitive_data_access: true,
          access_type: accessType,
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      });
  } catch (error) {
    // Silently fail - we don't want audit logging to break the app
    console.error('Failed to log sensitive data access:', error);
  }
}

/**
 * Wrapper to log and conditionally expose sensitive data
 */
export function maskSensitiveField(
  value: string | null | undefined,
  canAccess: boolean,
  maskPattern: string = '••••••••'
): string {
  if (!value) return '';
  if (canAccess) return value;
  return maskPattern;
}

/**
 * Partial mask - shows first/last few characters
 */
export function partialMaskField(
  value: string | null | undefined,
  canAccess: boolean,
  showFirst: number = 2,
  showLast: number = 2
): string {
  if (!value) return '';
  if (canAccess) return value;
  
  if (value.length <= showFirst + showLast + 2) {
    return '••••••••';
  }
  
  const first = value.substring(0, showFirst);
  const last = value.substring(value.length - showLast);
  const masked = '•'.repeat(Math.min(value.length - showFirst - showLast, 6));
  
  return `${first}${masked}${last}`;
}
