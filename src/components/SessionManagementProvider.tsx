import React from 'react';
import { useSessionManagement } from '@/hooks/use-session-management';
import { SessionErrorBoundary } from './SessionErrorBoundary';

/**
 * Internal component that uses the session management hook.
 * Separated to allow error boundary to catch hook errors.
 */
function SessionManagementCore({ children }: { children: React.ReactNode }) {
  // Initialize session management - the hook handles all logic internally
  useSessionManagement();
  return <>{children}</>;
}

/**
 * Provider component that initializes session management for authenticated users.
 * Wrapped with error boundary to prevent hook errors from crashing the app.
 * 
 * Handles:
 * - Session registration on login
 * - Concurrent session enforcement (single session limit)
 * - IP country change detection and session invalidation
 * - Periodic heartbeats to keep sessions alive
 */
export function SessionManagementProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionErrorBoundary>
      <SessionManagementCore>
        {children}
      </SessionManagementCore>
    </SessionErrorBoundary>
  );
}
