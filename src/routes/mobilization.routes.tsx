/**
 * Mobilization (Site Clearance) routes
 */
import type { RouteObject } from "react-router-dom";
import { HSSERoute } from "@/components";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

const MobilizationDashboard = lazyWithRetry(() => import("@/pages/mobilization/MobilizationDashboard"));
const MobilizationDetail = lazyWithRetry(() => import("@/pages/mobilization/MobilizationDetail"));

export const mobilizationRoutes: RouteObject[] = [
  { path: "mobilization", element: <HSSERoute><MobilizationDashboard /></HSSERoute> },
  { path: "mobilization/:projectId", element: <HSSERoute><MobilizationDetail /></HSSERoute> },
];
