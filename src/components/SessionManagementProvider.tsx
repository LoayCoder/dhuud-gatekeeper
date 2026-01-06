import { useSessionManagement } from '@/hooks/use-session-management';
import { SessionErrorBoundary } from './SessionErrorBoundary';

/**
 * Internal component that uses the session management hook.
 * Separated to allow error boundary to catch hook errors.
 * Renders nothing - only runs the hook logic.
 */
function SessionManagementCore() {
  // Initialize session management - the hook handles all logic internally
  useSessionManagement();
  return null;
}

/**
 * Self-contained component that initializes session management for authenticated users.
 * Wrapped with error boundary to prevent hook errors from crashing the app.
 * Does NOT wrap children - it's a standalone component.
 * 
 * Handles:
 * - Session registration on login
 * - Concurrent session enforcement (single session limit)
 * - IP country change detection and session invalidation
 * - Periodic heartbeats to keep sessions alive
 */
export function SessionManagementProvider() {
  return (
    <SessionErrorBoundary>
      <SessionManagementCore />
    </SessionErrorBoundary>
  );
}
