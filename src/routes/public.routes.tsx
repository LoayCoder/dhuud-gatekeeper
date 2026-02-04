/**
 * Public routes - accessible without authentication
 * Includes login, signup, legal pages, and public tokens
 */
import { Suspense } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { PageLoader } from "@/components/ui/page-loader";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Critical path pages - loaded immediately
import Login from "@/pages/Login";
import InviteGatekeeper from "@/pages/InviteGatekeeper";
import Install from "@/pages/Install";

// Legal pages - lazy loaded
const TermsOfService = lazyWithRetry(() => import("@/pages/legal/TermsOfService"));
const PrivacyPolicy = lazyWithRetry(() => import("@/pages/legal/PrivacyPolicy"));
const CookiePolicy = lazyWithRetry(() => import("@/pages/legal/CookiePolicy"));
const AcceptableUsePolicy = lazyWithRetry(() => import("@/pages/legal/AcceptableUsePolicy"));
const RefundPolicy = lazyWithRetry(() => import("@/pages/legal/RefundPolicy"));
const DataProcessingAgreement = lazyWithRetry(() => import("@/pages/legal/DataProcessingAgreement"));
const ServiceLevelAgreement = lazyWithRetry(() => import("@/pages/legal/ServiceLevelAgreement"));

// Auth pages - lazy loaded
const Signup = lazyWithRetry(() => import("@/pages/Signup"));
const ForgotPassword = lazyWithRetry(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("@/pages/ResetPassword"));
const AuthCallback = lazyWithRetry(() => import("@/pages/AuthCallback"));
const MFASetup = lazyWithRetry(() => import("@/pages/MFASetup"));

// Public token pages - lazy loaded
const VisitorPass = lazyWithRetry(() => import("@/pages/VisitorPass"));
const VisitorBadgePage = lazyWithRetry(() => import("@/pages/VisitorBadgePage"));
const WorkerAccessPass = lazyWithRetry(() => import("@/pages/WorkerAccessPass"));
const WorkerInduction = lazyWithRetry(() => import("@/pages/WorkerInduction"));

// Public gate pass pages - lazy loaded
const PublicGatePassRequest = lazyWithRetry(() => import("@/pages/public/PublicGatePassRequest"));
const PublicGatePassStatus = lazyWithRetry(() => import("@/pages/public/PublicGatePassStatus"));

export const legalRoutes: RouteObject[] = [
  { path: "/terms", element: <TermsOfService /> },
  { path: "/privacy", element: <PrivacyPolicy /> },
  { path: "/cookies", element: <CookiePolicy /> },
  { path: "/acceptable-use", element: <AcceptableUsePolicy /> },
  { path: "/refund-policy", element: <RefundPolicy /> },
  { path: "/dpa", element: <DataProcessingAgreement /> },
  { path: "/sla", element: <ServiceLevelAgreement /> },
];

export const authRoutes: RouteObject[] = [
  { path: "/invite", element: <InviteGatekeeper /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/register", element: <Navigate to="/login" replace /> },
  { path: "/auth/callback", element: <AuthCallback /> },
  { path: "/install", element: <Install /> },
  { 
    path: "/mfa-setup", 
    element: <Suspense fallback={<PageLoader />}><MFASetup /></Suspense> 
  },
];

export const publicTokenRoutes: RouteObject[] = [
  {
    path: "/visitor-pass/:token",
    element: <Suspense fallback={<PageLoader />}><VisitorPass /></Suspense>
  },
  {
    path: "/visitor-badge/:token",
    element: <Suspense fallback={<PageLoader />}><VisitorBadgePage /></Suspense>
  },
  {
    path: "/worker-access/:token",
    element: <Suspense fallback={<PageLoader />}><WorkerAccessPass /></Suspense>
  },
  {
    path: "/worker-induction/:inductionId",
    element: <Suspense fallback={<PageLoader />}><WorkerInduction /></Suspense>
  },
  // Public gate pass routes (multi-tenant)
  {
    path: "/p/:tenantSlug/gate-pass",
    element: <Suspense fallback={<PageLoader />}><PublicGatePassRequest /></Suspense>
  },
  {
    path: "/p/:tenantSlug/gate-pass/status/:token",
    element: <Suspense fallback={<PageLoader />}><PublicGatePassStatus /></Suspense>
  },
];

export const publicRoutes: RouteObject[] = [
  ...legalRoutes,
  ...authRoutes,
  ...publicTokenRoutes,
];
