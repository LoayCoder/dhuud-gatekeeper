import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  Shield, LayoutDashboard, FileWarning, ClipboardCheck, Users, Settings, Settings2, Building2,
  Trophy, Network, Layers, FolderTree, HelpCircle, LifeBuoy, CreditCard, Receipt, Puzzle, FileStack,
  BarChart3, ShieldAlert, ShieldCheck, FileCog, Package, List, Plus, QrCode, ClipboardList, Menu,
  Workflow, Clock, Radio, Calendar, MapPin, Briefcase, UserCheck, Route, Video, FileKey, HardHat,
  Map, Download, Share, CheckCircle2, MessageSquare, FileText, Bell, AlertTriangle, Globe, Languages,
  GraduationCap, BookOpen, History, Sparkles, Award
} from "lucide-react";

export function useAdminMenu() {
  const { t } = useTranslation();
  const location = useLocation();
  
  return [

    {
      title: t('navigation.administration'),
      icon: Settings,
      menuCode: 'administration',
      isActive: location.pathname.startsWith("/admin"),
      items: [
        // SLA Management Sub-Group
        {
          title: t('navigation.slaManagement', 'SLA Management'),
          icon: Clock,
          menuCode: 'admin_sla_management',
          isActive: location.pathname.includes('/sla') || 
                    location.pathname === '/admin/action-sla' ||
                    location.pathname === '/admin/finding-sla' ||
                    location.pathname === '/admin/investigation-sla' ||
                    location.pathname === '/admin/violation-sla',
          subItems: [
            {
              title: t('navigation.slaDashboard', 'SLA Dashboard'),
              url: "/admin/sla-dashboard",
              icon: BarChart3,
              menuCode: 'admin_sla_dashboard',
            },
            {
              title: t('navigation.actionSlaSettings', 'Action SLA Settings'),
              url: "/admin/action-sla",
              icon: ClipboardList,
              menuCode: 'admin_action_sla',
            },
            {
              title: t('navigation.findingSlaSettings', 'Finding SLA Settings'),
              url: "/admin/finding-sla",
              icon: ClipboardCheck,
              menuCode: 'admin_finding_sla',
            },
            {
              title: t('navigation.investigationSlaSettings', 'Investigation SLA'),
              url: "/admin/investigation-sla",
              icon: FileWarning,
              menuCode: 'admin_investigation_sla',
            },
            {
              title: t('navigation.violationSettings', 'Violation Settings'),
              url: "/admin/violation-sla",
              icon: AlertTriangle,
              menuCode: 'admin_violation_sla',
            },
            {
              title: t('navigation.slaAnalytics', 'SLA Analytics'),
              url: "/admin/sla-analytics",
              icon: BarChart3,
              menuCode: 'admin_sla_analytics',
            },
          ],
        },
        // User & Access Sub-Group
        {
          title: t('navigation.userAccess', 'User & Access'),
          icon: Users,
          menuCode: 'admin_user_access',
          isActive: location.pathname === '/admin/users' || 
                    location.pathname === '/admin/org-structure' ||
                    location.pathname === '/admin/menu-access' ||
                    location.pathname === '/admin/user-menu-access' ||
                    location.pathname === '/admin/security-audit',
          subItems: [
            {
              title: t('navigation.userManagement'),
              url: "/admin/users",
              icon: Users,
              menuCode: 'admin_users',
            },
            {
              title: t('navigation.orgStructure'),
              url: "/admin/org-structure",
              icon: Network,
              menuCode: 'admin_org',
            },
            {
              title: t('admin.menuAccess.title', 'Menu Access'),
              url: "/admin/menu-access",
              icon: Menu,
              menuCode: 'admin_menu_access',
            },
            {
              title: t('admin.userMenuAccess.title', 'User Menu Access'),
              url: "/admin/user-menu-access",
              icon: UserCheck,
              menuCode: 'admin_user_menu_access',
            },
            {
              title: t('navigation.securityAudit', 'Security Audit'),
              url: "/admin/security-audit",
              icon: ShieldAlert,
              menuCode: 'admin_security_audit',
            },
          ],
        },
        // Notifications Sub-Group
        {
          title: t('navigation.notificationsGroup', 'Notifications'),
          icon: Bell,
          menuCode: 'admin_notifications_group',
          isActive: location.pathname.startsWith("/admin/whatsapp") || 
                    location.pathname.startsWith("/admin/hsse-notification") ||
                    location.pathname === "/admin/notification-logs",
          subItems: [
            {
              title: t('navigation.hsseNotifications', 'HSSE Notifications'),
              url: "/admin/hsse-notifications",
              icon: ShieldAlert,
              menuCode: 'admin_hsse_notifications',
            },
            {
              title: t('navigation.notificationAnalytics', 'Notification Analytics'),
              url: "/admin/hsse-notification-analytics",
              icon: BarChart3,
              menuCode: 'admin_hsse_notification_analytics',
            },
            {
              title: t('navigation.whatsapp', 'WhatsApp'),
              icon: MessageSquare,
              menuCode: 'admin_whatsapp',
              isActive: location.pathname.startsWith("/admin/whatsapp") || 
                        location.pathname === "/admin/notification-logs",
              subItems: [
                {
                  title: t('navigation.whatsappProviders', 'Provider Settings'),
                  url: "/admin/whatsapp-settings",
                  icon: Settings2,
                  menuCode: 'admin_whatsapp_settings',
                },
                {
                  title: t('navigation.whatsappTemplates', 'Message Templates'),
                  url: "/admin/whatsapp-templates",
                  icon: FileText,
                  menuCode: 'admin_whatsapp_templates',
                },
                {
                  title: t('navigation.deliveryLog', 'Delivery Log'),
                  url: "/admin/notification-logs",
                  icon: Radio,
                  menuCode: 'admin_notification_logs',
              },
            ],
          },
          {
            title: t('navigation.webpageNotifications', 'Webpage Notifications'),
            url: "/admin/webpage-notifications",
            icon: Globe,
            menuCode: 'admin_webpage_notifications',
          },
          {
            title: t('navigation.pageContentEditor', 'Page Content Editor'),
            url: "/admin/page-content-editor",
            icon: Languages,
            menuCode: 'admin_page_content_editor',
          },
          {
            title: t('navigation.testPushNotifications', 'Test Push Notifications'),
            url: "/admin/test-push",
            icon: Bell,
            menuCode: 'admin_test_push',
          },
        ],
        },
        // Reporting & KPIs Sub-Group
        {
          title: t('navigation.reportingKpis', 'Reporting & KPIs'),
          icon: BarChart3,
          menuCode: 'admin_reporting_kpis',
          isActive: location.pathname === '/admin/team-performance' || 
                    location.pathname === '/admin/executive-report' ||
                    location.pathname === '/admin/kpi-targets' ||
                    location.pathname === '/admin/analytics',
          subItems: [
            {
              title: t('navigation.teamPerformance', 'Team Performance'),
              url: "/admin/team-performance",
              icon: Users,
              menuCode: 'admin_team_performance',
            },
            {
              title: t('navigation.executiveReport', 'Executive Report'),
              url: "/admin/executive-report",
              icon: FileStack,
              menuCode: 'admin_executive_report',
            },
            {
              title: t('navigation.kpiTargets', 'KPI Targets'),
              url: "/admin/kpi-targets",
              icon: BarChart3,
              menuCode: 'admin_kpi_targets',
            },
            {
              title: t('analytics.title', 'Usage Analytics'),
              url: "/admin/analytics",
              icon: BarChart3,
              menuCode: 'admin_analytics',
            },
          ],
        },
        // System Config Sub-Group
        {
          title: t('navigation.systemConfig', 'System Configuration'),
          icon: Settings2,
          menuCode: 'admin_system_config',
          isActive: location.pathname === '/admin/branding' || 
                    location.pathname === '/admin/document-settings' ||
                    location.pathname === '/admin/event-categories' ||
                    location.pathname === '/admin/workflow-diagrams' ||
                    location.pathname === '/admin/manhours' ||
                    location.pathname === '/admin/emergency-instructions' ||
                    location.pathname === '/admin/badges',
          subItems: [
            {
              title: t('navigation.brandManagement'),
              url: "/admin/branding",
              icon: Building2,
              menuCode: 'admin_branding',
            },
            {
              title: t('navigation.documentSettings', 'Document Settings'),
              url: "/admin/document-settings",
              icon: FileCog,
              menuCode: 'admin_document_settings',
            },
            {
              title: t('navigation.eventCategories'),
              url: "/admin/event-categories",
              icon: List,
              menuCode: 'settings_event_categories',
            },
            {
              title: t('workflowDiagrams.title', 'Workflow Diagrams'),
              url: "/admin/workflow-diagrams",
              icon: Workflow,
              menuCode: 'admin_workflow_diagrams',
            },
            {
              title: t('navigation.manhoursManagement', 'Manhours Management'),
              url: "/admin/manhours",
              icon: Clock,
              menuCode: 'admin_manhours',
            },
            {
              title: t('navigation.platformSettings', 'Platform Settings'),
              url: "/admin/platform-settings",
              icon: Settings2,
              menuCode: 'admin_platform_settings',
            },
            {
              title: t('navigation.emergencyInstructions', 'Emergency Instructions'),
              url: "/admin/emergency-instructions",
              icon: AlertTriangle,
              menuCode: 'admin_emergency_instructions',
            },
            {
              title: t('navigation.visitorSettings', 'Visitor Settings'),
              url: "/admin/visitor-settings",
              icon: Users,
              menuCode: 'admin_visitor_settings',
            },
            {
              title: t('navigation.pendingApprovalsOverride', 'Pending Approvals Override'),
              url: "/admin/pending-approvals-override",
              icon: ShieldCheck,
              menuCode: 'admin_pending_approvals_override',
            },
            {
              title: t('navigation.aiSettings', 'AI Settings'),
              url: "/admin/ai-settings",
              icon: Sparkles,
              menuCode: 'admin_ai_settings',
            },
            {
              title: t('admin.badges.title', 'Badge Management'),
              url: "/admin/badges",
              icon: Award,
              menuCode: 'admin_badges',
            },
          ],
        },
        // Platform Management Sub-Group (Super Admin)
        {
          title: t('navigation.platformManagement', 'Platform Management'),
          icon: Layers,
          menuCode: 'admin_platform_management',
          isActive: location.pathname === '/admin/tenants' || 
                    location.pathname === '/admin/subscriptions' ||
                    location.pathname === '/admin/modules' ||
                    location.pathname === '/admin/plans' ||
                    location.pathname === '/admin/billing' ||
                    location.pathname === '/admin/support' ||
                    location.pathname === '/admin/app-updates',
          subItems: [
            {
              title: t('navigation.tenantManagement'),
              url: "/admin/tenants",
              icon: Layers,
              menuCode: 'admin_tenants',
            },
            {
              title: t('navigation.subscriptionsOverview'),
              url: "/admin/subscriptions",
              icon: Receipt,
              menuCode: 'admin_subscriptions',
            },
            {
              title: t('navigation.moduleManagement'),
              url: "/admin/modules",
              icon: Puzzle,
              menuCode: 'admin_modules',
            },
            {
              title: t('navigation.planManagement'),
              url: "/admin/plans",
              icon: FileStack,
              menuCode: 'admin_plans',
            },
            {
              title: t('navigation.billingOverview'),
              url: "/admin/billing",
              icon: Receipt,
              menuCode: 'admin_billing',
            },
            {
              title: t('navigation.supportDashboard'),
              url: "/admin/support",
              icon: HelpCircle,
              menuCode: 'admin_support',
            },
            {
              title: t('navigation.appUpdates', 'App Updates'),
              url: "/admin/app-updates",
              icon: Bell,
              menuCode: 'admin_app_updates',
            },
          ],
        },
      ],
    },
  ];
}
