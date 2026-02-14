/**
 * Incident management routes
 * HSSE event tracking, investigations, and corrective actions
 */
import type { RouteObject } from "react-router-dom";
import { HSSERoute, ProtectedRoute } from "@/components";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Incident pages - lazy loaded
const IncidentList = lazyWithRetry(() => import("@/pages/incidents/IncidentList"));
const IncidentReport = lazyWithRetry(() => import("@/pages/incidents/IncidentReport"));
const IncidentDetail = lazyWithRetry(() => import("@/pages/incidents/IncidentDetail"));
// const InvestigationWorkspace = lazyWithRetry(() => import("@/pages/incidents/InvestigationWorkspace"));
const InvestigationWorkspace = lazyWithRetry(() => import("@/pages/incidents/InvestigationWorkspaceDebug"));
const MyActions = lazyWithRetry(() => import("@/pages/incidents/MyActions"));
const HSSEEventDashboard = lazyWithRetry(() => import("@/pages/incidents/HSSEEventDashboard"));

// Risk Assessment pages
const RiskAssessments = lazyWithRetry(() => import("@/pages/RiskAssessments"));
const RiskAssessmentCreate = lazyWithRetry(() => import("@/pages/RiskAssessmentCreate"));

// Dashboard pages
const Leaderboard = lazyWithRetry(() => import("@/pages/Leaderboard"));

// Profile pages
const ProfileBadges = lazyWithRetry(() => import("@/pages/ProfileBadges"));

export const incidentRoutes: RouteObject[] = [
  { path: "leaderboard", element: <ProtectedRoute><Leaderboard /></ProtectedRoute> },
  { path: "profile/badges", element: <ProtectedRoute><ProfileBadges /></ProtectedRoute> },
  { path: "incidents", element: <IncidentList /> },
  { path: "incidents/report", element: <IncidentReport /> },
  { path: "incidents/:id", element: <IncidentDetail /> },
  {
    path: "incidents/investigate",
    element: <HSSERoute><InvestigationWorkspace /></HSSERoute>
  },
  { path: "incidents/my-actions", element: <MyActions /> },
  {
    path: "incidents/dashboard",
    element: <HSSERoute><HSSEEventDashboard /></HSSERoute>
  },
];

export const riskRoutes: RouteObject[] = [
  {
    path: "risk-assessments",
    element: <HSSERoute><RiskAssessments /></HSSERoute>
  },
  {
    path: "risk-assessments/create",
    element: <HSSERoute><RiskAssessmentCreate /></HSSERoute>
  },
];
