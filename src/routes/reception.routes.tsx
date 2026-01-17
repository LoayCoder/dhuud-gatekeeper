/**
 * Reception management routes
 * Walk-in registration, today's visitors, and reception dashboard
 */
import type { RouteObject } from "react-router-dom";
import { SecurityRoute } from "@/components";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Reception pages
const ReceptionDashboard = lazyWithRetry(() => import("@/pages/reception/ReceptionDashboard"));
const WalkInRegistration = lazyWithRetry(() => import("@/pages/reception/WalkInRegistration"));
const TodayVisitors = lazyWithRetry(() => import("@/pages/reception/TodayVisitors"));

export const receptionRoutes: RouteObject[] = [
  { 
    path: "reception", 
    element: <SecurityRoute><ReceptionDashboard /></SecurityRoute> 
  },
  { 
    path: "reception/walk-in", 
    element: <SecurityRoute><WalkInRegistration /></SecurityRoute> 
  },
  { 
    path: "reception/today", 
    element: <SecurityRoute><TodayVisitors /></SecurityRoute> 
  },
];
