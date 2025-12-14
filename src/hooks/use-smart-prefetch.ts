import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from './use-network-status';

interface PrefetchRule {
  fromRoute: string | RegExp;
  queries: {
    queryKey: string[];
    queryFn: () => Promise<unknown>;
    staleTime?: number;
  }[];
}

/**
 * Prefetch rules based on navigation patterns
 */
const PREFETCH_RULES: PrefetchRule[] = [
  {
    fromRoute: /^\/dashboard/,
    queries: [
      {
        queryKey: ['incidents-list', 'active'],
        queryFn: async () => {
          const { data } = await supabase
            .from('incidents')
            .select('id, reference_id, title, status, severity, created_at')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(20);
          return data;
        },
        staleTime: 5 * 60 * 1000,
      },
    ],
  },
  {
    fromRoute: /^\/incidents$/,
    queries: [
      {
        queryKey: ['incident-count'],
        queryFn: async () => {
          const { count } = await supabase
            .from('incidents')
            .select('id', { count: 'exact', head: true })
            .is('deleted_at', null);
          return count;
        },
        staleTime: 10 * 60 * 1000,
      },
    ],
  },
  {
    fromRoute: /^\/security/,
    queries: [
      {
        queryKey: ['security-zones-list'],
        queryFn: async () => {
          const { data } = await supabase
            .from('security_zones')
            .select('id, name, zone_type, is_active')
            .is('deleted_at', null)
            .eq('is_active', true);
          return data;
        },
        staleTime: 10 * 60 * 1000,
      },
    ],
  },
  {
    fromRoute: /^\/inspections/,
    queries: [
      {
        queryKey: ['inspection-templates-list'],
        queryFn: async () => {
          const { data } = await supabase
            .from('inspection_templates')
            .select('id, name, template_type, is_active')
            .is('deleted_at', null)
            .eq('is_active', true);
          return data;
        },
        staleTime: 30 * 60 * 1000,
      },
    ],
  },
];

/**
 * Hook that provides smart data prefetching based on navigation patterns
 */
export function useSmartPrefetch() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { isOnline } = useNetworkStatus();
  const prefetchedRef = useRef<Set<string>>(new Set());

  const prefetchForRoute = useCallback(
    async (route: string) => {
      if (!isOnline || !profile?.tenant_id) return;

      for (const rule of PREFETCH_RULES) {
        const matches =
          typeof rule.fromRoute === 'string' ? route === rule.fromRoute : rule.fromRoute.test(route);

        if (matches) {
          for (const query of rule.queries) {
            const key = JSON.stringify(query.queryKey);

            // Skip if already prefetched recently
            if (prefetchedRef.current.has(key)) continue;

            try {
              await queryClient.prefetchQuery({
                queryKey: query.queryKey,
                queryFn: query.queryFn,
                staleTime: query.staleTime ?? 5 * 60 * 1000,
              });

              prefetchedRef.current.add(key);

              // Clear prefetch tracking after stale time
              setTimeout(() => {
                prefetchedRef.current.delete(key);
              }, query.staleTime ?? 5 * 60 * 1000);
            } catch (error) {
              console.error('Prefetch failed for:', query.queryKey, error);
            }
          }
        }
      }
    },
    [isOnline, profile?.tenant_id, queryClient]
  );

  // Prefetch on route change
  useEffect(() => {
    // Use requestIdleCallback for non-blocking prefetch
    if ('requestIdleCallback' in window) {
      const idleCallback = window.requestIdleCallback(
        () => prefetchForRoute(location.pathname),
        { timeout: 2000 }
      );
      return () => window.cancelIdleCallback(idleCallback);
    } else {
      const timeout = setTimeout(() => prefetchForRoute(location.pathname), 100);
      return () => clearTimeout(timeout);
    }
  }, [location.pathname, prefetchForRoute]);

  return { prefetchForRoute };
}

/**
 * Hook to prefetch data when element is visible
 */
export function useVisibilityPrefetch<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: { staleTime?: number; rootMargin?: string } = {}
) {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prefetchedRef = useRef(false);

  const registerElement = useCallback(
    (element: HTMLElement | null) => {
      if (!element || !isOnline || prefetchedRef.current) return;

      // Cleanup previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const isVisible = entries.some((entry) => entry.isIntersecting);

          if (isVisible && !prefetchedRef.current) {
            prefetchedRef.current = true;

            queryClient.prefetchQuery({
              queryKey,
              queryFn,
              staleTime: options.staleTime ?? 5 * 60 * 1000,
            });

            // Cleanup after prefetch
            observerRef.current?.disconnect();
          }
        },
        { rootMargin: options.rootMargin ?? '100px' }
      );

      observerRef.current.observe(element);
    },
    [isOnline, queryKey, queryFn, queryClient, options.staleTime, options.rootMargin]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { registerElement };
}

/**
 * Hook for bandwidth-aware prefetching
 */
export function useBandwidthAwarePrefetch() {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();

  const prefetch = useCallback(
    async <T>(
      queryKey: string[],
      queryFn: () => Promise<T>,
      options: { priority?: 'high' | 'low'; staleTime?: number } = {}
    ) => {
      if (!isOnline) return;

      // Check connection type if available
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;

      // Skip low priority prefetches on slow connections or save-data mode
      if (options.priority === 'low') {
        if (connection?.saveData) return;
        if (connection?.effectiveType && ['slow-2g', '2g'].includes(connection.effectiveType)) return;
      }

      try {
        await queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime: options.staleTime ?? 5 * 60 * 1000,
        });
      } catch (error) {
        console.error('Bandwidth-aware prefetch failed:', error);
      }
    },
    [isOnline, queryClient]
  );

  return { prefetch };
}
