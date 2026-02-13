
import { RouteObject } from "react-router-dom";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

const Achievements = lazyWithRetry(() => import("@/pages/Achievements"));

export const achievementsRoutes: RouteObject[] = [
    {
        path: "/achievements",
        element: <Achievements />,
    },
];
