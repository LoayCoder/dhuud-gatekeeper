/**
 * Permit to Work (PTW) routes
 * Permits, projects, clearances, and field inspections
 */
import type { RouteObject } from "react-router-dom";
import { HSSERoute } from "@/components";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// PTW pages
const PTWDashboard = lazyWithRetry(() => import("@/pages/ptw/PTWDashboard"));
const PermitConsole = lazyWithRetry(() => import("@/pages/ptw/PermitConsole"));
const CreatePermit = lazyWithRetry(() => import("@/pages/ptw/CreatePermit"));
const PermitView = lazyWithRetry(() => import("@/pages/ptw/PermitView"));
const PTWFieldInspection = lazyWithRetry(() => import("@/pages/ptw/PTWFieldInspection"));

export const ptwRoutes: RouteObject[] = [
  { path: "ptw", element: <HSSERoute><PTWDashboard /></HSSERoute> },
  { path: "ptw/console", element: <HSSERoute><PermitConsole /></HSSERoute> },
  { path: "ptw/create", element: <HSSERoute><CreatePermit /></HSSERoute> },
  { path: "ptw/permits/:id", element: <HSSERoute><PermitView /></HSSERoute> },
  { path: "ptw/inspection/:id", element: <HSSERoute><PTWFieldInspection /></HSSERoute> },
];
