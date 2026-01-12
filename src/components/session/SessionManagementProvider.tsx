import { useSessionManagement } from '@/hooks/use-session-management';
import { useTokenRefresh } from '@/hooks/use-token-refresh';
import { SessionErrorBoundary } from './SessionErrorBoundary';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Public routes where session management should not run
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/auth/callback',
  '/forgot-password',
  '/reset-password',
  '/invite',
  '/register',
  '/install',
  '/terms',
  '/privacy',
  '/cookies',
  '/acceptable-use',
  '/refund-policy',
  '/dpa',
  '/sla',
];

/**
 * Internal component that uses the session management hooks.
 * Separated to allow error boundary to catch hook errors.
 * Renders nothing - only runs the hook logic.
 */
function SessionManagementCore() {
  // Initialize session management - handles registration, validation, heartbeat
  useSessionManagement();
  
  // Initialize proactive token refresh - refreshes tokens before expiry
  useTokenRefresh();
  
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
 * 
 * Note: Skips session management on public routes and when not authenticated
 * to prevent stale token errors after logout.
 */
export function SessionManagementProvider() {
  const location = useLocation();
  const { isAuthenticated, session } = useAuth();
  
  // Skip session management on public routes
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(route + '/')
  );
  
  // CRITICAL: Don't render session management at all when not authenticated
  // This prevents any hook operations from running with stale tokens after logout
  if (isPublicRoute || !isAuthenticated || !session?.access_token) {
    return null;
  }
  
  return (
    <SessionErrorBoundary>
      <SessionManagementCore />
    </SessionErrorBoundary>
  );
}
