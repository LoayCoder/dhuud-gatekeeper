import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOneSignal } from '@/contexts/OneSignalContext';
import { logger } from '@/lib/logger';

interface UserTags {
  role: 'requester' | 'approver';
  tenant_id: string;
  department?: string;
}

/**
 * Hook that binds the authenticated Supabase user to OneSignal
 * and sets user tags for targeted push notifications.
 *
 * Should be used once in the app tree, after both AuthProvider and
 * OneSignalProvider are available.
 */
export function useOneSignalNotificationSetup() {
  const { user, profile, userRole, isAuthenticated } = useAuth();
  const { isInitialized, loginUser, logoutUser, addTags } = useOneSignal();
  const previousUserId = useRef<string | null>(null);

  // Login / logout when auth state changes
  useEffect(() => {
    if (!isInitialized) return;

    if (isAuthenticated && user?.id) {
      // Only login if user changed
      if (previousUserId.current !== user.id) {
        previousUserId.current = user.id;
        loginUser(user.id);
      }
    } else if (previousUserId.current) {
      // User logged out
      previousUserId.current = null;
      logoutUser();
    }
  }, [isInitialized, isAuthenticated, user?.id, loginUser, logoutUser]);

  // Update tags when profile is loaded
  useEffect(() => {
    if (!isInitialized || !profile || !user?.id) return;

    const tags: Record<string, string> = {};

    // Map admin role to 'approver', user role to 'requester'
    if (userRole) {
      tags.role = userRole === 'admin' ? 'approver' : 'requester';
    }

    if (profile.tenant_id) {
      tags.tenant_id = profile.tenant_id;
    }

    if (profile.assigned_department_id) {
      tags.department = profile.assigned_department_id;
    }

    if (Object.keys(tags).length > 0) {
      addTags(tags);
    }
  }, [isInitialized, profile, userRole, user?.id, addTags]);

  /**
   * Manually update user tags (for example, after a role change).
   */
  const updateUserTags = useCallback(
    async (tagData: UserTags) => {
      if (!isInitialized) {
        logger.warn('OneSignal: Cannot update tags - not initialized.');
        return;
      }

      const tags: Record<string, string> = {
        role: tagData.role,
        tenant_id: tagData.tenant_id,
      };

      if (tagData.department) {
        tags.department = tagData.department;
      }

      await addTags(tags);
    },
    [isInitialized, addTags]
  );

  return { updateUserTags };
}
