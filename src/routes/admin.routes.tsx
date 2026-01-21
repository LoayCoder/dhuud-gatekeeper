/**
 * Admin routes
 * System configuration, user management, SLA, notifications, and settings
 */
import type { RouteObject } from "react-router-dom";
import { MenuBasedAdminRoute, ProtectedRoute } from "@/components/auth";
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
const BadgeManagement = lazyWithRetry(() => import("@/pages/admin/BadgeManagement"));
const IDCardSettings = lazyWithRetry(() => import("@/pages/admin/IDCardSettings"));

export const adminRoutes: RouteObject[] = [
  { path: "admin/branding", element: <MenuBasedAdminRoute menuCode="admin_branding"><AdminBranding /></MenuBasedAdminRoute> },
  { path: "admin/users", element: <MenuBasedAdminRoute menuCode="admin_users"><UserManagement /></MenuBasedAdminRoute> },
  { path: "admin/org-structure", element: <MenuBasedAdminRoute menuCode="admin_org"><OrgStructure /></MenuBasedAdminRoute> },
  { path: "admin/tenants", element: <MenuBasedAdminRoute menuCode="admin_tenants"><TenantManagement /></MenuBasedAdminRoute> },
  { path: "admin/support", element: <MenuBasedAdminRoute menuCode="admin_support"><SupportDashboard /></MenuBasedAdminRoute> },
  { path: "admin/subscriptions", element: <MenuBasedAdminRoute menuCode="admin_subscriptions"><SubscriptionOverview /></MenuBasedAdminRoute> },
  { path: "admin/modules", element: <MenuBasedAdminRoute menuCode="admin_modules"><ModuleManagement /></MenuBasedAdminRoute> },
  { path: "admin/plans", element: <MenuBasedAdminRoute menuCode="admin_plans"><PlanManagement /></MenuBasedAdminRoute> },
  { path: "admin/analytics", element: <MenuBasedAdminRoute menuCode="admin_analytics"><UsageAnalytics /></MenuBasedAdminRoute> },
  { path: "admin/security-audit", element: <MenuBasedAdminRoute menuCode="admin_security_audit"><SecurityAuditLog /></MenuBasedAdminRoute> },
  { path: "admin/billing", element: <MenuBasedAdminRoute menuCode="admin_billing"><BillingOverview /></MenuBasedAdminRoute> },
  { path: "admin/action-sla", element: <MenuBasedAdminRoute menuCode="admin_action_sla"><ActionSLASettings /></MenuBasedAdminRoute> },
  { path: "admin/finding-sla", element: <MenuBasedAdminRoute menuCode="admin_finding_sla"><FindingSLASettings /></MenuBasedAdminRoute> },
  { path: "admin/sla-dashboard", element: <MenuBasedAdminRoute menuCode="admin_sla_dashboard"><SLADashboard /></MenuBasedAdminRoute> },
  { path: "admin/violation-sla", element: <MenuBasedAdminRoute menuCode="admin_violation_sla"><ViolationSettings /></MenuBasedAdminRoute> },
  { path: "admin/document-settings", element: <MenuBasedAdminRoute menuCode="admin_document_settings"><DocumentSettings /></MenuBasedAdminRoute> },
  { path: "admin/team-performance", element: <MenuBasedAdminRoute menuCode="admin_team_performance"><TeamPerformance /></MenuBasedAdminRoute> },
  { path: "admin/executive-report", element: <MenuBasedAdminRoute menuCode="admin_executive_report"><ExecutiveReport /></MenuBasedAdminRoute> },
  { path: "admin/inspection-templates", element: <MenuBasedAdminRoute menuCode="admin_templates"><InspectionTemplates /></MenuBasedAdminRoute> },
  { path: "admin/inspection-category-settings", element: <MenuBasedAdminRoute menuCode="admin_inspection_categories"><InspectionCategorySettings /></MenuBasedAdminRoute> },
  { path: "admin/menu-access", element: <MenuBasedAdminRoute menuCode="admin_menu_access"><MenuAccessConfig /></MenuBasedAdminRoute> },
  { path: "admin/user-menu-access", element: <MenuBasedAdminRoute menuCode="admin_user_menu_access"><UserMenuAccessConfig /></MenuBasedAdminRoute> },
  { path: "admin/workflow-diagrams", element: <MenuBasedAdminRoute menuCode="admin_workflow_diagrams"><WorkflowDiagrams /></MenuBasedAdminRoute> },
  { path: "admin/manhours", element: <MenuBasedAdminRoute menuCode="admin_manhours"><ManhoursManagement /></MenuBasedAdminRoute> },
  { path: "admin/kpi-targets", element: <MenuBasedAdminRoute menuCode="admin_kpi_targets"><KPITargetsManagement /></MenuBasedAdminRoute> },
  { path: "admin/kpi-targets/audit", element: <MenuBasedAdminRoute menuCode="admin_kpi_targets"><KPIAuditLogPage /></MenuBasedAdminRoute> },
  { path: "admin/sla-analytics", element: <MenuBasedAdminRoute menuCode="admin_sla_analytics"><SLAAnalytics /></MenuBasedAdminRoute> },
  { path: "admin/investigation-sla", element: <MenuBasedAdminRoute menuCode="admin_investigation_sla"><InvestigationSLASettings /></MenuBasedAdminRoute> },
  { path: "admin/hsse-notifications", element: <MenuBasedAdminRoute menuCode="admin_hsse_notifications"><HSSENotifications /></MenuBasedAdminRoute> },
  { path: "admin/hsse-notification-analytics", element: <MenuBasedAdminRoute menuCode="admin_hsse_notification_analytics"><HSSENotificationAnalytics /></MenuBasedAdminRoute> },
  { path: "admin/notification-logs", element: <MenuBasedAdminRoute menuCode="admin_notification_logs"><NotificationDeliveryLog /></MenuBasedAdminRoute> },
  { path: "admin/whatsapp-templates", element: <MenuBasedAdminRoute menuCode="admin_whatsapp_templates"><NotificationTemplates /></MenuBasedAdminRoute> },
  { path: "admin/whatsapp-settings", element: <MenuBasedAdminRoute menuCode="admin_whatsapp_settings"><WhatsAppSettingsPage /></MenuBasedAdminRoute> },
  { path: "admin/webpage-notifications", element: <MenuBasedAdminRoute menuCode="admin_webpage_notifications"><WebpageNotificationSettings /></MenuBasedAdminRoute> },
  { path: "admin/page-content-editor", element: <MenuBasedAdminRoute menuCode="admin_platform_settings"><PageContentEditor /></MenuBasedAdminRoute> },
  { path: "admin/platform-settings", element: <MenuBasedAdminRoute menuCode="admin_platform_settings"><PlatformSettings /></MenuBasedAdminRoute> },
  { path: "admin/emergency-instructions", element: <MenuBasedAdminRoute menuCode="admin_emergency_instructions"><EmergencyInstructionsSettings /></MenuBasedAdminRoute> },
  { path: "admin/visitor-settings", element: <MenuBasedAdminRoute menuCode="admin_visitor_settings"><VisitorSettings /></MenuBasedAdminRoute> },
  { path: "admin/security-dashboard", element: <MenuBasedAdminRoute menuCode="admin_security_audit"><AdminSecurityDashboard /></MenuBasedAdminRoute> },
  { path: "admin/pending-approvals-override", element: <MenuBasedAdminRoute menuCode="admin_pending_approvals_override"><PendingApprovalsOverride /></MenuBasedAdminRoute> },
  { path: "admin/ai-settings", element: <MenuBasedAdminRoute menuCode="admin_platform_settings"><AISettings /></MenuBasedAdminRoute> },
  { path: "admin/training-center", element: <ProtectedRoute><TrainingCenter /></ProtectedRoute> },
  { path: "admin/event-categories", element: <MenuBasedAdminRoute menuCode="admin_platform_settings"><EventCategorySettings /></MenuBasedAdminRoute> },
  { path: "admin/asset-categories", element: <MenuBasedAdminRoute menuCode="admin_asset_categories"><AssetCategorySettings /></MenuBasedAdminRoute> },
  { path: "admin/hsse-validation", element: <MenuBasedAdminRoute menuCode="admin_platform_settings"><HSSEValidationDashboard /></MenuBasedAdminRoute> },
  { path: "admin/app-updates", element: <MenuBasedAdminRoute menuCode="admin_app_updates"><AppUpdates /></MenuBasedAdminRoute> },
  { path: "admin/test-push", element: <MenuBasedAdminRoute menuCode="admin_test_push"><TestPushNotifications /></MenuBasedAdminRoute> },
  { path: "admin/database-health", element: <MenuBasedAdminRoute menuCode="admin_platform_settings"><DatabaseHealthDashboard /></MenuBasedAdminRoute> },
  { path: "admin/badges", element: <MenuBasedAdminRoute menuCode="admin_platform_settings"><BadgeManagement /></MenuBasedAdminRoute> },
  { path: "admin/id-card-settings", element: <MenuBasedAdminRoute menuCode="admin_platform_settings"><IDCardSettings /></MenuBasedAdminRoute> },
];
