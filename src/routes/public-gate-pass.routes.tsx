/**
 * Public Gate Pass routes - accessible without authentication
 * These routes allow external users (drivers, contractors) to request and track gate passes
 */
import { Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import { PageLoader } from "@/components/ui/page-loader";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Lazy loaded public gate pass pages
const PublicRequestPage = lazyWithRetry(() => import("@/pages/public-gate-pass/PublicRequestPage"));
const PublicStatusPage = lazyWithRetry(() => import("@/pages/public-gate-pass/PublicStatusPage"));

export const publicGatePassRoutes: RouteObject[] = [
  {
    path: "/:tenantSlug/request",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PublicRequestPage />
      </Suspense>
    ),
  },
  {
    path: "/:tenantSlug/track/:token",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PublicStatusPage />
      </Suspense>
    ),
  },
];
