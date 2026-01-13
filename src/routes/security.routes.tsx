/**
 * Security management routes
 * Patrols, access control, guards, CCTV, and emergency management
 */
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { SecurityRoute } from "@/components/auth";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Security patrol pages
const PatrolDashboard = lazyWithRetry(() => import("@/pages/security/PatrolDashboard"));
const PatrolRoutes = lazyWithRetry(() => import("@/pages/security/PatrolRoutes"));
const ExecutePatrol = lazyWithRetry(() => import("@/pages/security/ExecutePatrol"));
const PatrolHistory = lazyWithRetry(() => import("@/pages/security/PatrolHistory"));
const GateControl = lazyWithRetry(() => import("@/pages/security/GateControl"));
const Contractors = lazyWithRetry(() => import("@/pages/security/Contractors"));
const SecurityZones = lazyWithRetry(() => import("@/pages/security/SecurityZones"));
const SecurityShifts = lazyWithRetry(() => import("@/pages/security/SecurityShifts"));
const ShiftRoster = lazyWithRetry(() => import("@/pages/security/ShiftRoster"));
const CommandCenter = lazyWithRetry(() => import("@/pages/security/CommandCenter"));
const GuardLocation = lazyWithRetry(() => import("@/pages/security/GuardLocation"));
const SecurityDashboard = lazyWithRetry(() => import("@/pages/security/SecurityDashboard"));
const AccessControlDashboard = lazyWithRetry(() => import("@/pages/security/AccessControlDashboard"));
const GateGuardDashboard = lazyWithRetry(() => import("@/pages/security/GateGuardDashboard"));
const ShiftHandover = lazyWithRetry(() => import("@/pages/security/ShiftHandover"));
const GuardPerformance = lazyWithRetry(() => import("@/pages/security/GuardPerformance"));
const GuardMobileDashboard = lazyWithRetry(() => import("@/pages/security/GuardMobileDashboard"));
const EmergencyAlerts = lazyWithRetry(() => import("@/pages/security/EmergencyAlerts"));
const GuardAttendance = lazyWithRetry(() => import("@/pages/security/GuardAttendance"));
const CCTVManagement = lazyWithRetry(() => import("@/pages/security/CCTVManagement"));
const SecurityTeam = lazyWithRetry(() => import("@/pages/security/SecurityTeam"));
const BlacklistManagement = lazyWithRetry(() => import("@/pages/security/BlacklistManagement"));
const ReportSchedules = lazyWithRetry(() => import("@/pages/security/ReportSchedules"));

export const securityRoutes: RouteObject[] = [
  { path: "security", element: <SecurityRoute><SecurityDashboard /></SecurityRoute> },
  { path: "security/patrols", element: <SecurityRoute><PatrolDashboard /></SecurityRoute> },
  { path: "security/patrols/routes", element: <SecurityRoute><PatrolRoutes /></SecurityRoute> },
  { path: "security/patrols/execute", element: <SecurityRoute><ExecutePatrol /></SecurityRoute> },
  { path: "security/patrols/history", element: <SecurityRoute><PatrolHistory /></SecurityRoute> },
  { path: "security/gate", element: <SecurityRoute><GateControl /></SecurityRoute> },
  { path: "security/contractors", element: <SecurityRoute><Contractors /></SecurityRoute> },
  { path: "security/contractor-check", element: <Navigate to="/security/contractor-access" replace /> },
  { path: "security/zones", element: <SecurityRoute><SecurityZones /></SecurityRoute> },
  { path: "security/shifts", element: <SecurityRoute><SecurityShifts /></SecurityRoute> },
  { path: "security/roster", element: <SecurityRoute><ShiftRoster /></SecurityRoute> },
  { path: "security/command-center", element: <SecurityRoute><CommandCenter /></SecurityRoute> },
  { path: "security/my-location", element: <SecurityRoute><GuardLocation /></SecurityRoute> },
  { path: "security/contractor-access", element: <Navigate to="/security/access-control?tab=workers" replace /> },
  { path: "security/access-control", element: <SecurityRoute><AccessControlDashboard /></SecurityRoute> },
  { path: "security/gate-dashboard", element: <SecurityRoute><GateGuardDashboard /></SecurityRoute> },
  { path: "security/handover", element: <SecurityRoute><ShiftHandover /></SecurityRoute> },
  { path: "security/performance", element: <SecurityRoute><GuardPerformance /></SecurityRoute> },
  { path: "security/guard-app", element: <SecurityRoute><GuardMobileDashboard /></SecurityRoute> },
  { path: "security/emergency-alerts", element: <SecurityRoute><EmergencyAlerts /></SecurityRoute> },
  { path: "security/attendance", element: <SecurityRoute><GuardAttendance /></SecurityRoute> },
  { path: "security/cctv", element: <SecurityRoute><CCTVManagement /></SecurityRoute> },
  { path: "security/blacklist", element: <SecurityRoute><BlacklistManagement /></SecurityRoute> },
  { path: "security/team", element: <SecurityRoute><SecurityTeam /></SecurityRoute> },
  { path: "security/report-schedules", element: <SecurityRoute><ReportSchedules /></SecurityRoute> },
];
