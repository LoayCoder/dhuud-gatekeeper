import { useSessionManagement } from '@/hooks/use-session-management';

/**
 * Provider component that initializes session management for authenticated users.
 * Handles:
 * - Session registration on login
 * - Concurrent session enforcement (single session limit)
 * - IP country change detection and session invalidation
 * - Periodic heartbeats to keep sessions alive
 */
export function SessionManagementProvider({ children }: { children: React.ReactNode }) {
  // Initialize session management - the hook handles all logic internally
  useSessionManagement();
  
  return <>{children}</>;
}
