import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SensitiveDataAccess {
  canViewProfileSensitiveData: (profileUserId: string) => boolean;
  canViewVisitorPII: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

/**
 * Hook for checking sensitive data access permissions
 * Uses the centralized AuthContext for role information
 */
export function useSensitiveDataAccess(): SensitiveDataAccess {
  const { user, isAdmin, isLoading } = useAuth();

  // Check if current user can view sensitive profile data for a specific user
  const canViewProfileSensitiveData = useCallback((profileUserId: string): boolean => {
    if (!user) return false;
    // User can see their own data or admin can see all
    return user.id === profileUserId || isAdmin;
  }, [user, isAdmin]);

  // Only admins can view visitor PII (national IDs, etc.)
  const canViewVisitorPII = isAdmin;

  return {
    canViewProfileSensitiveData,
    canViewVisitorPII,
    isAdmin,
    isLoading,
  };
}
