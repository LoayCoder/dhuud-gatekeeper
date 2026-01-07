import { useSessionManagement } from '@/hooks/use-session-management';
import { SessionErrorBoundary } from './SessionErrorBoundary';
import { useLocation } from 'react-router-dom';

// Public routes where session management should not run
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
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
 * 
 * Note: Skips session management on public routes to prevent stale token errors.
 */
export function SessionManagementProvider() {
  const location = useLocation();
  
  // Skip session management on public routes
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(route + '/')
  );
  
  if (isPublicRoute) {
    return null;
  }
  
  return (
    <SessionErrorBoundary>
      <SessionManagementCore />
    </SessionErrorBoundary>
  );
}
