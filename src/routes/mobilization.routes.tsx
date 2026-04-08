/**
 * Site Clearance routes
 */
import type { RouteObject } from "react-router-dom";
import { HSSERoute } from "@/components";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

const SiteClearanceDashboard = lazyWithRetry(() => import("@/pages/mobilization/SiteClearanceDashboard"));
const SiteClearanceDetail = lazyWithRetry(() => import("@/pages/mobilization/SiteClearanceDetail"));

export const mobilizationRoutes: RouteObject[] = [
  { path: "site-clearance", element: <HSSERoute><SiteClearanceDashboard /></HSSERoute> },
  { path: "site-clearance/:projectId", element: <HSSERoute><SiteClearanceDetail /></HSSERoute> },
];
