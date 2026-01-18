/**
 * Visitor management routes
 * Pre-registration, checkpoint, and visitor tracking
 */
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { SecurityRoute } from "@/components";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Visitor pages
const VisitorDashboard = lazyWithRetry(() => import("@/pages/visitors/VisitorDashboard"));
const VisitorPreRegistration = lazyWithRetry(() => import("@/pages/visitors/VisitorPreRegistration"));
const VisitorList = lazyWithRetry(() => import("@/pages/visitors/VisitorList"));
const WalkInRegistration = lazyWithRetry(() => import("@/pages/reception/WalkInRegistration"));
const TodayVisitors = lazyWithRetry(() => import("@/pages/reception/TodayVisitors"));

export const visitorRoutes: RouteObject[] = [
  // Visitor Dashboard (main landing)
  { path: "visitors", element: <SecurityRoute><VisitorDashboard /></SecurityRoute> },
  { path: "visitors/dashboard", element: <SecurityRoute><VisitorDashboard /></SecurityRoute> },
  { path: "visitors/register", element: <SecurityRoute><VisitorPreRegistration /></SecurityRoute> },
  { path: "visitors/walk-in", element: <SecurityRoute><WalkInRegistration /></SecurityRoute> },
  { path: "visitors/today", element: <SecurityRoute><TodayVisitors /></SecurityRoute> },
  { path: "visitors/list", element: <SecurityRoute><VisitorList /></SecurityRoute> },
  { path: "visitors/checkpoint", element: <Navigate to="/security/gate-dashboard" replace /> },
  { path: "visitors/blacklist", element: <Navigate to="/security/blacklist" replace /> },
];
