/**
 * Action Center routes
 * Unified operational hub for all modules
 */
import type { RouteObject } from "react-router-dom";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

const ActionCenter = lazyWithRetry(() => import("@/pages/ActionCenter"));

export const actionCenterRoutes: RouteObject[] = [
  { path: "action-center", element: <ActionCenter /> },
];
