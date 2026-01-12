/**
 * Contractor management routes
 * Companies, projects, workers, gate passes, and portal access
 */
import type { RouteObject } from "react-router-dom";
import { MenuBasedAdminRoute } from "@/components/MenuBasedAdminRoute";
import { ContractorPortalRoute, ClientSiteRepRoute } from "@/components/access-control";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Contractor Management pages
const ContractorCompanies = lazyWithRetry(() => import("@/pages/contractors/Companies"));
const ContractorProjects = lazyWithRetry(() => import("@/pages/contractors/Projects"));
const ContractorWorkers = lazyWithRetry(() => import("@/pages/contractors/Workers"));
const ContractorGatePasses = lazyWithRetry(() => import("@/pages/contractors/GatePasses"));
const ContractorDashboard = lazyWithRetry(() => import("@/pages/contractors/Dashboard"));
const InductionVideos = lazyWithRetry(() => import("@/pages/contractors/InductionVideos"));
const GatePassSettings = lazyWithRetry(() => import("@/pages/contractors/GatePassSettings"));
const ContractorAnalytics = lazyWithRetry(() => import("@/pages/contractors/Analytics"));

// Contractor Portal pages - external contractor representatives
const ContractorPortalDashboard = lazyWithRetry(() => import("@/pages/contractor-portal/Dashboard"));
const ContractorPortalWorkers = lazyWithRetry(() => import("@/pages/contractor-portal/Workers"));
const ContractorPortalProjects = lazyWithRetry(() => import("@/pages/contractor-portal/Projects"));
const ContractorPortalGatePasses = lazyWithRetry(() => import("@/pages/contractor-portal/GatePasses"));
const ContractorPortalActivityLog = lazyWithRetry(() => import("@/pages/contractor-portal/ActivityLog"));

// Client Site Representative pages
const ClientSiteRepDashboard = lazyWithRetry(() => import("@/pages/client-site-rep/Dashboard"));

export const contractorManagementRoutes: RouteObject[] = [
  { 
    path: "contractors", 
    element: <MenuBasedAdminRoute menuCode="contractor_dashboard"><ContractorDashboard /></MenuBasedAdminRoute> 
  },
  { 
    path: "contractors/companies", 
    element: <MenuBasedAdminRoute menuCode="contractor_companies"><ContractorCompanies /></MenuBasedAdminRoute> 
  },
  { 
    path: "contractors/projects", 
    element: <MenuBasedAdminRoute menuCode="contractor_projects"><ContractorProjects /></MenuBasedAdminRoute> 
  },
  { 
    path: "contractors/workers", 
    element: <MenuBasedAdminRoute menuCode="contractor_workers"><ContractorWorkers /></MenuBasedAdminRoute> 
  },
  { 
    path: "contractors/gate-passes", 
    element: <MenuBasedAdminRoute menuCode="contractor_gate_passes"><ContractorGatePasses /></MenuBasedAdminRoute> 
  },
  { 
    path: "contractors/induction-videos", 
    element: <MenuBasedAdminRoute menuCode="contractor_induction_videos"><InductionVideos /></MenuBasedAdminRoute> 
  },
  { 
    path: "contractors/analytics", 
    element: <MenuBasedAdminRoute menuCode="contractor_analytics"><ContractorAnalytics /></MenuBasedAdminRoute> 
  },
  { 
    path: "contractors/settings", 
    element: <MenuBasedAdminRoute menuCode="contractor_settings"><GatePassSettings /></MenuBasedAdminRoute> 
  },
];

export const contractorPortalRoutes: RouteObject[] = [
  { path: "contractor-portal", element: <ContractorPortalRoute><ContractorPortalDashboard /></ContractorPortalRoute> },
  { path: "contractor-portal/workers", element: <ContractorPortalRoute><ContractorPortalWorkers /></ContractorPortalRoute> },
  { path: "contractor-portal/projects", element: <ContractorPortalRoute><ContractorPortalProjects /></ContractorPortalRoute> },
  { path: "contractor-portal/gate-passes", element: <ContractorPortalRoute><ContractorPortalGatePasses /></ContractorPortalRoute> },
  { path: "contractor-portal/activity-log", element: <ContractorPortalRoute><ContractorPortalActivityLog /></ContractorPortalRoute> },
];

export const clientSiteRepRoutes: RouteObject[] = [
  { path: "client-site-rep", element: <ClientSiteRepRoute><ClientSiteRepDashboard /></ClientSiteRepRoute> },
];

export const contractorRoutes: RouteObject[] = [
  ...contractorManagementRoutes,
  ...contractorPortalRoutes,
  ...clientSiteRepRoutes,
];
