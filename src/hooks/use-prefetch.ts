import { useCallback, useRef } from 'react';

// Map of routes to their lazy component imports
const routeModules: Record<string, () => Promise<unknown>> = {
  // Admin routes
  '/admin/branding': () => import('@/pages/AdminBranding'),
  '/admin/users': () => import('@/pages/admin/UserManagement'),
  '/admin/org-structure': () => import('@/pages/admin/OrgStructure'),
  '/admin/tenants': () => import('@/pages/admin/TenantManagement'),
  '/admin/support': () => import('@/pages/admin/SupportDashboard'),
  '/admin/subscriptions': () => import('@/pages/admin/SubscriptionOverview'),
  '/admin/modules': () => import('@/pages/admin/ModuleManagement'),
  '/admin/plans': () => import('@/pages/admin/PlanManagement'),
  '/admin/analytics': () => import('@/pages/admin/UsageAnalytics'),
  '/admin/security-audit': () => import('@/pages/admin/SecurityAuditLog'),
  '/admin/billing': () => import('@/pages/admin/BillingOverview'),
  // User routes
  '/profile': () => import('@/pages/Profile'),
  '/support': () => import('@/pages/Support'),
  '/settings/subscription': () => import('@/pages/admin/SubscriptionManagement'),
  '/settings/usage-billing': () => import('@/pages/settings/UsageBilling'),
};

// Track which routes have been prefetched to avoid duplicate requests
const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a route's JavaScript bundle
 * This loads the module in the background so it's cached when user navigates
 */
export function prefetchRoute(path: string): void {
  // Normalize path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Skip if already prefetched or no module defined
  if (prefetchedRoutes.has(normalizedPath)) return;
  
  const moduleLoader = routeModules[normalizedPath];
  if (!moduleLoader) return;
  
  // Mark as prefetched immediately to prevent duplicate calls
  prefetchedRoutes.add(normalizedPath);
  
  // Use requestIdleCallback for non-blocking prefetch, fallback to setTimeout
  const schedulePreload = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
  
  schedulePreload(() => {
    moduleLoader().catch(() => {
      // Remove from set if prefetch fails so it can be retried
      prefetchedRoutes.delete(normalizedPath);
    });
  });
}

/**
 * Hook that returns handlers for prefetching on hover/focus
 */
export function usePrefetch(path: string) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleMouseEnter = useCallback(() => {
    // Delay prefetch slightly to avoid prefetching on quick mouse movements
    timeoutRef.current = setTimeout(() => {
      prefetchRoute(path);
    }, 100);
  }, [path]);
  
  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
  const handleFocus = useCallback(() => {
    prefetchRoute(path);
  }, [path]);
  
  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
  };
}

/**
 * Prefetch multiple routes at once (e.g., on idle)
 */
export function prefetchRoutes(paths: string[]): void {
  paths.forEach(prefetchRoute);
}
