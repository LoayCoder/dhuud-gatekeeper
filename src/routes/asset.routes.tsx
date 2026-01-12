/**
 * Asset management routes
 * Asset tracking, maintenance, inspections, and financials
 */
import type { RouteObject } from "react-router-dom";
import { HSSERoute } from "@/components/HSSERoute";
import { AdminRoute } from "@/components/AdminRoute";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Asset pages - lazy loaded
const AssetDashboard = lazyWithRetry(() => import("@/pages/assets/AssetDashboard"));
const AssetList = lazyWithRetry(() => import("@/pages/assets/AssetList"));
const AssetDetail = lazyWithRetry(() => import("@/pages/assets/AssetDetail"));
const AssetRegister = lazyWithRetry(() => import("@/pages/assets/AssetRegister"));
const AssetScanner = lazyWithRetry(() => import("@/pages/assets/AssetScanner"));
const BulkPrintLabels = lazyWithRetry(() => import("@/pages/assets/BulkPrintLabels"));
const InspectionWorkspaceAsset = lazyWithRetry(() => import("@/pages/assets/InspectionWorkspace"));
const MobileAssetScanner = lazyWithRetry(() => import("@/pages/assets/MobileAssetScanner"));
const AssetFinancials = lazyWithRetry(() => import("@/pages/assets/AssetFinancials"));
const AssetHealth = lazyWithRetry(() => import("@/pages/assets/AssetHealth"));
const AssetWarranties = lazyWithRetry(() => import("@/pages/assets/AssetWarranties"));
const AssetDepreciation = lazyWithRetry(() => import("@/pages/assets/AssetDepreciation"));
const AssetReports = lazyWithRetry(() => import("@/pages/assets/AssetReports"));
const AssetMap = lazyWithRetry(() => import("@/pages/assets/AssetMap"));
const AssetReportBuilder = lazyWithRetry(() => import("@/pages/assets/AssetReportBuilder"));
const ApprovalWorkflowConfigPage = lazyWithRetry(() => import("@/pages/assets/ApprovalWorkflowConfigPage"));
const PurchaseRequestsPage = lazyWithRetry(() => import("@/pages/assets/PurchaseRequestsPage"));
const AssetAuditLog = lazyWithRetry(() => import("@/pages/assets/AssetAuditLog"));
const PartsInventoryPage = lazyWithRetry(() => import("@/pages/parts/PartsInventoryPage"));

export const assetRoutes: RouteObject[] = [
  { path: "assets", element: <AssetList /> },
  { path: "assets/dashboard", element: <AssetDashboard /> },
  { path: "assets/register", element: <HSSERoute><AssetRegister /></HSSERoute> },
  { path: "assets/scan", element: <AssetScanner /> },
  { path: "assets/mobile-scan", element: <MobileAssetScanner /> },
  { path: "assets/bulk-print", element: <HSSERoute><BulkPrintLabels /></HSSERoute> },
  { path: "assets/:id", element: <AssetDetail /> },
  { path: "assets/:id/edit", element: <HSSERoute><AssetRegister /></HSSERoute> },
  { path: "assets/:id/financials", element: <AssetFinancials /> },
  { path: "assets/:id/health", element: <AssetHealth /> },
  { path: "assets/:id/depreciation", element: <AssetDepreciation /> },
  { 
    path: "assets/:id/inspections/:inspectionId", 
    element: <HSSERoute><InspectionWorkspaceAsset /></HSSERoute> 
  },
  { path: "assets/warranties", element: <AssetWarranties /> },
  { path: "assets/reports", element: <HSSERoute><AssetReports /></HSSERoute> },
  { path: "assets/reports/builder", element: <HSSERoute><AssetReportBuilder /></HSSERoute> },
  { path: "assets/map", element: <AssetMap /> },
  { 
    path: "assets/approval-workflows", 
    element: <AdminRoute><ApprovalWorkflowConfigPage /></AdminRoute> 
  },
  { path: "assets/purchase-requests", element: <HSSERoute><PurchaseRequestsPage /></HSSERoute> },
  { path: "assets/audit-log", element: <HSSERoute><AssetAuditLog /></HSSERoute> },
];

export const partsRoutes: RouteObject[] = [
  { path: "parts/inventory", element: <HSSERoute><PartsInventoryPage /></HSSERoute> },
];
