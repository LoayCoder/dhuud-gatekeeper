/**
 * Inspection management routes
 * Sessions, templates, schedules, and findings
 */
import type { RouteObject } from "react-router-dom";
import { HSSERoute } from "@/components/HSSERoute";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Inspection pages
const InspectionSessionsDashboard = lazyWithRetry(() => import("@/pages/inspections/InspectionSessionsDashboard"));
const SessionWorkspace = lazyWithRetry(() => import("@/pages/inspections/SessionWorkspace"));
const AreaSessionWorkspace = lazyWithRetry(() => import("@/pages/inspections/AreaSessionWorkspace"));
const InspectionDashboard = lazyWithRetry(() => import("@/pages/inspections/InspectionDashboard"));
const InspectionSchedules = lazyWithRetry(() => import("@/pages/inspections/InspectionSchedules"));
const MyInspectionActions = lazyWithRetry(() => import("@/pages/inspections/MyInspectionActions"));
const AuditSessionWorkspace = lazyWithRetry(() => import("@/pages/inspections/AuditSessionWorkspace"));

export const inspectionRoutes: RouteObject[] = [
  { path: "inspections/dashboard", element: <HSSERoute><InspectionDashboard /></HSSERoute> },
  { path: "inspections/sessions", element: <HSSERoute><InspectionSessionsDashboard /></HSSERoute> },
  { path: "inspections/sessions/:sessionId", element: <HSSERoute><SessionWorkspace /></HSSERoute> },
  { path: "inspections/sessions/:sessionId/area", element: <HSSERoute><AreaSessionWorkspace /></HSSERoute> },
  { path: "inspections/sessions/:sessionId/audit", element: <HSSERoute><AuditSessionWorkspace /></HSSERoute> },
  { path: "inspections/schedules", element: <HSSERoute><InspectionSchedules /></HSSERoute> },
  { path: "inspections/my-actions", element: <MyInspectionActions /> },
];
