/**
 * My Gate Passes Routes
 * Routes for all internal employees to manage their own gate passes
 */
import { RouteObject } from "react-router-dom";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Lazy-loaded pages
const MyGatePassList = lazyWithRetry(
  () => import("@/pages/my-gate-passes/List")
);
const MyGatePassCreate = lazyWithRetry(
  () => import("@/pages/my-gate-passes/Create")
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
    path: "my-gate-passes/create",
    element: <MyGatePassCreate />,
  },
  {
    path: "my-gate-passes/history",
    element: <MyGatePassHistory />,
  },
];
