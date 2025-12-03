import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export type AdminEventType = 
  | 'user_created'
  | 'user_updated' 
  | 'user_deactivated'
  | 'user_activated'
  | 'user_deleted';

interface AuditLogMetadata {
  target_user_id?: string;
  target_user_name?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  reason?: string;
  [key: string]: unknown;
}

/**
 * Hook for logging admin actions to the audit trail
 * Used for user management operations
 */
export function useAdminAuditLog() {
  const { user } = useAuth();

  const logEvent = useCallback(async (
    eventType: AdminEventType,
    metadata: AuditLogMetadata
  ) => {
    if (!user?.id) {
      console.warn('Cannot log audit event: No authenticated user');
      return;
    }

    try {
      // Use type assertion to allow new event types not yet in generated types
      const { error } = await supabase.from('user_activity_logs').insert({
        user_id: user.id,
        event_type: eventType as any,
        metadata: metadata as any,
      });

      if (error) {
        console.error('Failed to log audit event:', error);
      }
    } catch (err) {
      console.error('Audit logging error:', err);
    }
  }, [user?.id]);

  const logUserCreated = useCallback((targetUserId: string, targetUserName: string, userType: string) => {
    return logEvent('user_created', {
      target_user_id: targetUserId,
      target_user_name: targetUserName,
      user_type: userType,
    });
  }, [logEvent]);

  const logUserUpdated = useCallback((
    targetUserId: string, 
    targetUserName: string, 
    changes: Record<string, { old: unknown; new: unknown }>
  ) => {
    return logEvent('user_updated', {
      target_user_id: targetUserId,
      target_user_name: targetUserName,
      changes,
    });
  }, [logEvent]);

  const logUserDeactivated = useCallback((targetUserId: string, targetUserName: string, reason?: string) => {
    return logEvent('user_deactivated', {
      target_user_id: targetUserId,
      target_user_name: targetUserName,
      reason,
    });
  }, [logEvent]);

  const logUserActivated = useCallback((targetUserId: string, targetUserName: string) => {
    return logEvent('user_activated', {
      target_user_id: targetUserId,
      target_user_name: targetUserName,
    });
  }, [logEvent]);

  return {
    logEvent,
    logUserCreated,
    logUserUpdated,
    logUserDeactivated,
    logUserActivated,
  };
}

/**
 * Utility to detect changes between old and new user data
 */
export function detectUserChanges(
  oldUser: Record<string, unknown>,
  newData: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  
  const fieldsToTrack = [
    'full_name', 'user_type', 'has_login', 'is_active', 
    'assigned_branch_id', 'assigned_division_id', 
    'assigned_department_id', 'assigned_section_id',
    'job_title', 'employee_id'
  ];

  for (const field of fieldsToTrack) {
    const oldValue = oldUser[field];
    const newValue = newData[field];
    
    // Normalize null/undefined/"" comparisons
    const normalizedOld = oldValue ?? null;
    const normalizedNew = newValue ?? null;
    
    if (normalizedOld !== normalizedNew) {
      changes[field] = { old: normalizedOld, new: normalizedNew };
    }
  }

  return changes;
}
