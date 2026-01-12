/**
 * Admin routes
 * System configuration, user management, SLA, notifications, and settings
 */
import type { RouteObject } from "react-router-dom";
import { AdminRoute } from "@/components/AdminRoute";
import { MenuBasedAdminRoute } from "@/components/MenuBasedAdminRoute";
import { HSSERoute } from "@/components/HSSERoute";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Admin pages
const InspectionTemplates = lazyWithRetry(() => import("@/pages/admin/InspectionTemplates"));
const AdminBranding = lazyWithRetry(() => import("@/pages/AdminBranding"));
const OrgStructure = lazyWithRetry(() => import("@/pages/admin/OrgStructure"));
const UserManagement = lazyWithRetry(() => import("@/pages/admin/UserManagement"));
const TenantManagement = lazyWithRetry(() => import("@/pages/admin/TenantManagement"));
const SupportDashboard = lazyWithRetry(() => import("@/pages/admin/SupportDashboard"));
const SubscriptionOverview = lazyWithRetry(() => import("@/pages/admin/SubscriptionOverview"));
const ModuleManagement = lazyWithRetry(() => import("@/pages/admin/ModuleManagement"));
const PlanManagement = lazyWithRetry(() => import("@/pages/admin/PlanManagement"));
const UsageAnalytics = lazyWithRetry(() => import("@/pages/admin/UsageAnalytics"));
const SecurityAuditLog = lazyWithRetry(() => import("@/pages/admin/SecurityAuditLog"));
const AdminSecurityDashboard = lazyWithRetry(() => import("@/pages/admin/SecurityDashboard"));
const BillingOverview = lazyWithRetry(() => import("@/pages/admin/BillingOverview"));
const ActionSLASettings = lazyWithRetry(() => import("@/pages/admin/ActionSLASettings"));
const FindingSLASettings = lazyWithRetry(() => import("@/pages/admin/FindingSLASettings"));
const SLADashboard = lazyWithRetry(() => import("@/pages/admin/SLADashboard"));
const SLAAnalytics = lazyWithRetry(() => import("@/pages/admin/SLAAnalytics"));
const InvestigationSLASettings = lazyWithRetry(() => import("@/pages/admin/InvestigationSLASettings"));
const ViolationSettings = lazyWithRetry(() => import("@/pages/admin/ViolationSettings"));
const DocumentSettings = lazyWithRetry(() => import("@/pages/admin/DocumentSettings"));
const TeamPerformance = lazyWithRetry(() => import("@/pages/admin/TeamPerformance"));
const ExecutiveReport = lazyWithRetry(() => import("@/pages/admin/ExecutiveReport"));
const MenuAccessConfig = lazyWithRetry(() => import("@/pages/admin/MenuAccessConfig"));
const UserMenuAccessConfig = lazyWithRetry(() => import("@/pages/admin/UserMenuAccessConfig"));
const WorkflowDiagrams = lazyWithRetry(() => import("@/pages/admin/WorkflowDiagrams"));
const ManhoursManagement = lazyWithRetry(() => import("@/pages/admin/ManhoursManagement"));
const KPITargetsManagement = lazyWithRetry(() => import("@/pages/admin/KPITargetsManagement"));
const KPIAuditLogPage = lazyWithRetry(() => import("@/pages/admin/KPIAuditLogPage"));
const PlatformSettings = lazyWithRetry(() => import("@/pages/admin/PlatformSettings"));
const HSSENotificationAnalytics = lazyWithRetry(() => import("@/pages/admin/HSSENotificationAnalytics"));
const HSSENotifications = lazyWithRetry(() => import("@/pages/admin/HSSENotifications"));
const NotificationDeliveryLog = lazyWithRetry(() => import("@/pages/admin/NotificationDeliveryLog"));
const NotificationTemplates = lazyWithRetry(() => import("@/pages/admin/NotificationTemplates"));
const WhatsAppSettingsPage = lazyWithRetry(() => import("@/pages/admin/WhatsAppSettingsPage"));
const WebpageNotificationSettings = lazyWithRetry(() => import("@/pages/admin/WebpageNotificationSettings"));
const PageContentEditor = lazyWithRetry(() => import("@/pages/admin/PageContentEditor"));
const EmergencyInstructionsSettings = lazyWithRetry(() => import("@/pages/admin/EmergencyInstructionsSettings"));
const VisitorSettings = lazyWithRetry(() => import("@/pages/admin/VisitorSettings"));
const TrainingCenter = lazyWithRetry(() => import("@/pages/admin/TrainingCenter"));
const AppUpdates = lazyWithRetry(() => import("@/pages/admin/AppUpdates"));
const TestPushNotifications = lazyWithRetry(() => import("@/pages/admin/TestPushNotifications"));
const PendingApprovalsOverride = lazyWithRetry(() => import("@/pages/admin/PendingApprovalsOverride"));
const AISettings = lazyWithRetry(() => import("@/pages/admin/AISettings"));
const DatabaseHealthDashboard = lazyWithRetry(() => import("@/pages/admin/DatabaseHealthDashboard"));
const EventCategorySettings = lazyWithRetry(() => import("@/pages/admin/EventCategorySettings"));
const InspectionCategorySettings = lazyWithRetry(() => import("@/pages/admin/InspectionCategorySettings"));
const HSSEValidationDashboard = lazyWithRetry(() => import("@/pages/admin/HSSEValidationDashboard"));
const AssetCategorySettings = lazyWithRetry(() => import("@/pages/admin/AssetCategorySettings"));

export const adminRoutes: RouteObject[] = [
  { path: "admin/branding", element: <AdminRoute><AdminBranding /></AdminRoute> },
  { path: "admin/users", element: <AdminRoute><UserManagement /></AdminRoute> },
  { path: "admin/org-structure", element: <MenuBasedAdminRoute menuCode="admin_org"><OrgStructure /></MenuBasedAdminRoute> },
  { path: "admin/tenants", element: <AdminRoute><TenantManagement /></AdminRoute> },
  { path: "admin/support", element: <AdminRoute><SupportDashboard /></AdminRoute> },
  { path: "admin/subscriptions", element: <AdminRoute><SubscriptionOverview /></AdminRoute> },
  { path: "admin/modules", element: <AdminRoute><ModuleManagement /></AdminRoute> },
  { path: "admin/plans", element: <AdminRoute><PlanManagement /></AdminRoute> },
  { path: "admin/analytics", element: <AdminRoute><UsageAnalytics /></AdminRoute> },
  { path: "admin/security-audit", element: <AdminRoute><SecurityAuditLog /></AdminRoute> },
  { path: "admin/billing", element: <AdminRoute><BillingOverview /></AdminRoute> },
  { path: "admin/action-sla", element: <AdminRoute><ActionSLASettings /></AdminRoute> },
  { path: "admin/finding-sla", element: <AdminRoute><FindingSLASettings /></AdminRoute> },
  { path: "admin/sla-dashboard", element: <HSSERoute><SLADashboard /></HSSERoute> },
  { path: "admin/violation-sla", element: <AdminRoute><ViolationSettings /></AdminRoute> },
  { path: "admin/document-settings", element: <AdminRoute><DocumentSettings /></AdminRoute> },
  { path: "admin/team-performance", element: <HSSERoute><TeamPerformance /></HSSERoute> },
  { path: "admin/executive-report", element: <HSSERoute><ExecutiveReport /></HSSERoute> },
  { path: "admin/inspection-templates", element: <AdminRoute><InspectionTemplates /></AdminRoute> },
  { path: "admin/inspection-category-settings", element: <AdminRoute><InspectionCategorySettings /></AdminRoute> },
  { path: "admin/menu-access", element: <AdminRoute><MenuAccessConfig /></AdminRoute> },
  { path: "admin/user-menu-access", element: <AdminRoute><UserMenuAccessConfig /></AdminRoute> },
  { path: "admin/workflow-diagrams", element: <AdminRoute><WorkflowDiagrams /></AdminRoute> },
  { path: "admin/manhours", element: <AdminRoute><ManhoursManagement /></AdminRoute> },
  { path: "admin/kpi-targets", element: <AdminRoute><KPITargetsManagement /></AdminRoute> },
  { path: "admin/kpi-targets/audit", element: <AdminRoute><KPIAuditLogPage /></AdminRoute> },
  { path: "admin/sla-analytics", element: <AdminRoute><SLAAnalytics /></AdminRoute> },
  { path: "admin/investigation-sla", element: <AdminRoute><InvestigationSLASettings /></AdminRoute> },
  { path: "admin/hsse-notifications", element: <AdminRoute><HSSENotifications /></AdminRoute> },
  { path: "admin/hsse-notification-analytics", element: <AdminRoute><HSSENotificationAnalytics /></AdminRoute> },
  { path: "admin/notification-logs", element: <AdminRoute><NotificationDeliveryLog /></AdminRoute> },
  { path: "admin/whatsapp-templates", element: <AdminRoute><NotificationTemplates /></AdminRoute> },
  { path: "admin/whatsapp-settings", element: <AdminRoute><WhatsAppSettingsPage /></AdminRoute> },
  { path: "admin/webpage-notifications", element: <AdminRoute><WebpageNotificationSettings /></AdminRoute> },
  { path: "admin/page-content-editor", element: <AdminRoute><PageContentEditor /></AdminRoute> },
  { path: "admin/platform-settings", element: <AdminRoute><PlatformSettings /></AdminRoute> },
  { path: "admin/emergency-instructions", element: <AdminRoute><EmergencyInstructionsSettings /></AdminRoute> },
  { path: "admin/visitor-settings", element: <AdminRoute><VisitorSettings /></AdminRoute> },
  { path: "admin/security-dashboard", element: <AdminRoute><AdminSecurityDashboard /></AdminRoute> },
  { path: "admin/pending-approvals-override", element: <AdminRoute><PendingApprovalsOverride /></AdminRoute> },
  { path: "admin/ai-settings", element: <AdminRoute><AISettings /></AdminRoute> },
  { path: "admin/training-center", element: <ProtectedRoute><TrainingCenter /></ProtectedRoute> },
  { path: "admin/event-categories", element: <AdminRoute><EventCategorySettings /></AdminRoute> },
  { path: "admin/asset-categories", element: <AdminRoute><AssetCategorySettings /></AdminRoute> },
  { path: "admin/hsse-validation", element: <HSSERoute><HSSEValidationDashboard /></HSSERoute> },
  { path: "admin/app-updates", element: <AdminRoute><AppUpdates /></AdminRoute> },
  { path: "admin/test-push", element: <AdminRoute><TestPushNotifications /></AdminRoute> },
  { path: "admin/database-health", element: <AdminRoute><DatabaseHealthDashboard /></AdminRoute> },
];
