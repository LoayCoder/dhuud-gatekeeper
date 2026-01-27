/**
 * Department Gate Pass Routes
 * Routes for department representatives to manage gate passes
 */
import { RouteObject } from "react-router-dom";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Lazy-loaded pages
const DeptGatePassDashboard = lazyWithRetry(
  () => import("@/pages/dept-gate-passes/Dashboard")
);
const DeptGatePassList = lazyWithRetry(
  () => import("@/pages/dept-gate-passes/GatePassList")
);
const DeptGatePassApprovals = lazyWithRetry(
  () => import("@/pages/dept-gate-passes/PendingApprovals")
);
const DeptGatePassToday = lazyWithRetry(
  () => import("@/pages/dept-gate-passes/TodayPasses")
);

export const deptGatePassRoutes: RouteObject[] = [
  {
    path: "dept-gate-passes",
    element: <DeptGatePassDashboard />,
  },
  {
    path: "dept-gate-passes/list",
    element: <DeptGatePassList />,
  },
  {
    path: "dept-gate-passes/approvals",
    element: <DeptGatePassApprovals />,
  },
  {
    path: "dept-gate-passes/today",
    element: <DeptGatePassToday />,
  },
];
