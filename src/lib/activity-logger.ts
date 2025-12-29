import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Base activity event types (authentication/user management)
type BaseActivityEventType = 
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

// Cross-module activity event types (PTW/Contractor/Induction integration)
type CrossModuleEventType =
  | 'ptw_permit_created'
  | 'ptw_permit_status_changed'
  | 'ptw_permit_validation_failed'
  | 'ptw_permit_validation_passed'
  | 'ptw_project_mobilized'
  | 'ptw_project_clearance_updated'
  | 'contractor_worker_assigned'
  | 'contractor_status_changed'
  | 'contractor_blacklisted'
  | 'induction_sent'
  | 'induction_completed'
  | 'induction_expired'
  | 'induction_expiry_check'
  | 'worker_access_revoked'
  | 'gate_pass_approved'
  | 'gate_pass_rejected';

export type ActivityEventType = BaseActivityEventType | CrossModuleEventType;

// Cross-module activity source/target modules
export type ActivityModule = 'ptw' | 'contractor' | 'induction' | 'gate' | 'auth' | 'system';

interface LogActivityParams {
  eventType: ActivityEventType;
  sessionDurationSeconds?: number;
  metadata?: Record<string, unknown>;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
}

interface LogCrossModuleActivityParams {
  eventType: CrossModuleEventType;
  sourceModule: ActivityModule;
  targetModule?: ActivityModule;
  entityType: 'permit' | 'project' | 'worker' | 'contractor' | 'induction' | 'gate_pass';
  entityId: string;
  entityReference?: string;
  status?: 'success' | 'failed' | 'warning';
  metadata?: Record<string, unknown>;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
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
        event_type: eventType as unknown as 'login',
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

/**
 * Log cross-module activity for integration audit tracking.
 * Use this for actions that span multiple modules (PTW, Contractor, Induction).
 */
export async function logCrossModuleActivity({
  eventType,
  sourceModule,
  targetModule,
  entityType,
  entityId,
  entityReference,
  status = 'success',
  metadata = {},
  oldValue,
  newValue,
}: LogCrossModuleActivityParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get tenant_id from user's profile (or from metadata for system events)
    let tenantId = metadata.tenant_id as string | undefined;
    let userId = user?.id;

    if (user && !tenantId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      tenantId = profile?.tenant_id;
    }

    const { error } = await supabase
      .from('user_activity_logs')
      .insert([{
        user_id: userId || null,
        tenant_id: tenantId,
        event_type: eventType as unknown as 'login',
        old_value: (oldValue as Json) || null,
        new_value: (newValue as Json) || null,
        metadata: {
          ...metadata,
          source_module: sourceModule,
          target_module: targetModule,
          entity_type: entityType,
          entity_id: entityId,
          entity_reference: entityReference,
          integration_status: status,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'system',
          timestamp: new Date().toISOString(),
        } as Json,
      }]);

    if (error) {
      console.error('Failed to log cross-module activity:', error);
    }
  } catch (err) {
    console.error('Error logging cross-module activity:', err);
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
