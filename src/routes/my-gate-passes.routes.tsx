/**
 * My Gate Passes Routes
 * Routes for all users (employees and contractors) to manage their own gate passes
 * The create functionality is now integrated as a dialog in the List page
 */
import { RouteObject, Navigate } from "react-router-dom";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Lazy-loaded pages
const MyGatePassList = lazyWithRetry(
  () => import("@/pages/my-gate-passes/List")
);
const MyGatePassHistory = lazyWithRetry(
  () => import("@/pages/my-gate-passes/History")
);

export const myGatePassRoutes: RouteObject[] = [
  {
    path: "my-gate-passes",
    element: <MyGatePassList />,
  },
  {
    // Redirect legacy /create route to the list page (form is now a dialog)
    path: "my-gate-passes/create",
    element: <Navigate to="/my-gate-passes" replace />,
  },
  {
    path: "my-gate-passes/history",
    element: <MyGatePassHistory />,
  },
];
