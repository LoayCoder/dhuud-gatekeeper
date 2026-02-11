/**
 * Visitor management routes
 * Pre-registration, checkpoint, and visitor tracking
 */
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { SecurityRoute } from "@/components";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Visitor pages
const VisitorPreRegistration = lazyWithRetry(() => import("@/pages/visitors/VisitorPreRegistration"));
const VisitorList = lazyWithRetry(() => import("@/pages/visitors/VisitorList"));

export const visitorRoutes: RouteObject[] = [
  // Redirect to unified access control
  { path: "visitors", element: <Navigate to="/security/access-control?tab=visitors" replace /> },
  { path: "visitors/register", element: <VisitorPreRegistration /> },
  { path: "visitors/checkpoint", element: <Navigate to="/security/gate-dashboard" replace /> },
  { path: "visitors/list", element: <SecurityRoute><VisitorList /></SecurityRoute> },
  { path: "visitors/blacklist", element: <Navigate to="/security/blacklist" replace /> },
];
