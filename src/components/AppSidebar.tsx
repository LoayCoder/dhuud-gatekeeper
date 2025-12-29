import { useTranslation } from 'react-i18next';
import { useEffect, useState, useMemo } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Shield,
  LayoutDashboard,
  FileWarning,
  ClipboardCheck,
  Users,
  Settings,
  Settings2,
  Building2,
  LogOut,
  ChevronRight,
  UserCircle,
  User,
  Network,
  Layers,
  FolderTree,
  HelpCircle,
  LifeBuoy,
  CreditCard,
  Receipt,
  Puzzle,
  FileStack,
  BarChart3,
  ShieldAlert,
  FileCog,
  Package,
  List,
  Plus,
  QrCode,
  ClipboardList,
  Menu,
  Workflow,
  Clock,
  Radio,
  Calendar,
  MapPin,
  Briefcase,
  UserCheck,
  Route,
  Video,
  FileKey,
  HardHat,
  Map,
  Download,
  Share,
  CheckCircle2,
  MessageSquare,
  FileText,
  Bell,
} from "lucide-react";
import { NotificationPopover } from "@/components/NotificationPopover";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logUserActivity, getSessionDurationSeconds, clearSessionTracking } from "@/lib/activity-logger";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { prefetchRoute, prefetchRoutes } from "@/hooks/use-prefetch";
import { useMenuAccess } from "@/hooks/use-menu-access";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { DHUUD_APP_ICON } from "@/constants/branding";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AppSidebar() {
  const { t, i18n } = useTranslation();
  const { tenantName, activeSidebarIconUrl, isLoading: themeLoading } = useTheme();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRtl, setIsRtl] = useState(document.documentElement.dir === 'rtl');
  const { canAccess, hasAccessibleChildren, isLoading: menuLoading } = useMenuAccess();
  const { canInstall, canPromptNatively, isIOS, isInstalled, promptInstall } = usePWAInstall();
  const { setOpenMobile, isMobile } = useSidebar();
  
  // Get app icon for PWA install button
  const appIcon = activeSidebarIconUrl || DHUUD_APP_ICON;

  // Close mobile sidebar when a navigation link is clicked
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Watch for direction changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsRtl(document.documentElement.dir === 'rtl');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
    return () => observer.disconnect();
  }, []);

  // Also update when language changes
  useEffect(() => {
    setIsRtl(document.documentElement.dir === 'rtl');
  }, [i18n.language]);

  const userEmail = user?.email || "";
  const userName = profile?.full_name || "";
  const userAvatar = profile?.avatar_url || "";

  const handleLogout = async () => {
    const duration = getSessionDurationSeconds();
    await logUserActivity({
      eventType: "logout",
      sessionDurationSeconds: duration ?? undefined,
    });
    clearSessionTracking();
    await supabase.auth.signOut();
    navigate("/login");
  };

  // Menu Configuration with translations and menu codes for access control
  const menuItems = [
    {
      title: t('navigation.dashboard'),
      url: "/",
      icon: LayoutDashboard,
      menuCode: 'dashboard',
    },
    {
      title: t('navigation.hsseManagement'),
      icon: Shield,
      menuCode: 'hsse_management',
      isActive: location.pathname.startsWith("/incidents") || 
                location.pathname.startsWith("/audits") || 
                location.pathname.startsWith("/visitors") ||
                location.pathname.startsWith("/security"),
      items: [
        {
          title: t('navigation.hsseEvents'),
          icon: FileWarning,
          menuCode: 'hsse_events',
          isActive: location.pathname.startsWith("/incidents"),
          subItems: [
            {
              title: t('navigation.eventDashboard'),
              url: "/incidents/dashboard",
              icon: BarChart3,
              menuCode: 'event_dashboard',
            },
            {
              title: t('navigation.eventList'),
              url: "/incidents",
              icon: FileWarning,
              menuCode: 'event_list',
            },
            {
              title: t('navigation.reportEvent'),
              url: "/incidents/report",
              icon: FileWarning,
              menuCode: 'report_event',
            },
            {
              title: t('navigation.investigationWorkspace'),
              url: "/incidents/investigate",
              icon: ClipboardCheck,
              menuCode: 'investigation_workspace',
            },
            {
              title: t('navigation.myActions'),
              url: "/incidents/my-actions",
              icon: ClipboardCheck,
              menuCode: 'my_actions',
            },
          ],
        },
        {
          title: t('navigation.auditsInspections'),
          icon: ClipboardCheck,
          menuCode: 'audits_inspections',
          isActive: location.pathname.startsWith("/inspections") || location.pathname.startsWith("/audits"),
          subItems: [
            {
              title: t('navigation.inspectionDashboard'),
              url: "/inspections/dashboard",
              icon: BarChart3,
              menuCode: 'inspection_dashboard',
            },
            {
              title: t('navigation.inspectionSessions'),
              url: "/inspections/sessions",
              icon: ClipboardList,
              menuCode: 'inspection_sessions',
            },
            {
              title: t('navigation.inspectionSchedules'),
              url: "/inspections/schedules",
              icon: ClipboardList,
              menuCode: 'inspection_schedules',
            },
            {
              title: t('navigation.myInspectionActions'),
              url: "/inspections/my-actions",
              icon: ClipboardCheck,
              menuCode: 'my_inspection_actions',
            },
            {
              title: t('navigation.inspectionTemplates', 'Inspection Templates'),
              url: "/admin/inspection-templates",
              icon: ClipboardList,
              menuCode: 'admin_templates',
            },
            {
              title: t('navigation.inspectionCategories', 'Inspection Categories'),
              url: "/admin/inspection-category-settings",
              icon: FolderTree,
              menuCode: 'admin_inspection_categories',
            },
          ],
        },
        {
          title: t('navigation.security'),
          icon: Shield,
          menuCode: 'security',
          isActive: location.pathname.startsWith("/visitors") || location.pathname.startsWith("/security"),
          subItems: [
            {
              title: t('security.menu.securityDashboard', 'Security Dashboard'),
              url: "/security",
              icon: LayoutDashboard,
              menuCode: 'security_dashboard',
            },
            {
              title: t('navigation.visitorGatekeeper'),
              icon: UserCheck,
              menuCode: 'visitor_gatekeeper',
              isActive: location.pathname.startsWith("/visitors"),
              subItems: [
                {
                  title: t('security.visitors.dashboard', 'Visitor Dashboard'),
                  url: "/visitors",
                  icon: LayoutDashboard,
                  menuCode: 'visitor_dashboard',
                },
                {
                  title: t('security.visitors.preRegister', 'Pre-Register'),
                  url: "/visitors/register",
                  icon: Plus,
                  menuCode: 'visitor_register',
                },
                {
                  title: t('security.visitors.list', 'Visitor List'),
                  url: "/visitors/list",
                  icon: List,
                  menuCode: 'visitor_list',
                },
                {
                  title: t('security.visitors.blacklist', 'Blacklist'),
                  url: "/visitors/blacklist",
                  icon: ShieldAlert,
                  menuCode: 'visitor_blacklist',
                },
              ],
            },
            {
              title: t('navigation.securityPatrols'),
              icon: Route,
              menuCode: 'security_patrols',
              isActive: location.pathname.startsWith("/security/patrols"),
              subItems: [
              {
                  title: t('security.patrols.dashboard.title', 'Patrol Dashboard'),
                  url: "/security/patrols",
                  icon: Network,
                  menuCode: 'patrol_dashboard',
                },
                {
                  title: t('security.patrols.routes.title', 'Patrol Routes'),
                  url: "/security/patrols/routes",
                  icon: Route,
                  menuCode: 'patrol_routes',
                },
                {
                  title: t('security.patrols.history.title', 'Patrol History'),
                  url: "/security/patrols/history",
                  icon: Clock,
                  menuCode: 'patrol_history',
                },
              ],
            },
            {
              title: t('security.menu.workforceCommand', 'Workforce Command'),
              icon: Radio,
              menuCode: 'workforce_command',
              isActive: location.pathname.startsWith("/security/command") || 
                        location.pathname.startsWith("/security/zones") ||
                        location.pathname.startsWith("/security/shifts") ||
                        location.pathname.startsWith("/security/roster") ||
                        location.pathname.startsWith("/security/my-location"),
              subItems: [
                {
                  title: t('security.menu.commandCenter', 'Command Center'),
                  url: "/security/command-center",
                  icon: Radio,
                  menuCode: 'command_center',
                },
                {
                  title: t('security.menu.securityZones', 'Security Zones'),
                  url: "/security/zones",
                  icon: MapPin,
                  menuCode: 'security_zones',
                },
                {
                  title: t('security.menu.shifts', 'Shifts'),
                  url: "/security/shifts",
                  icon: Clock,
                  menuCode: 'security_shifts',
                },
                {
                  title: t('security.menu.roster', 'Shift Roster'),
                  url: "/security/roster",
                  icon: Calendar,
                  menuCode: 'shift_roster',
                },
                {
                  title: t('security.menu.myLocation', 'My Location'),
                  url: "/security/my-location",
                  icon: MapPin,
                  menuCode: 'my_location',
                },
              ],
            },
            {
              title: t('security.menu.operations', 'Operations'),
              icon: Radio,
              menuCode: 'security_operations',
              isActive: location.pathname.startsWith("/security/attendance") || 
                        location.pathname.startsWith("/security/cctv") ||
                        location.pathname.startsWith("/security/emergency-alerts") ||
                        location.pathname.startsWith("/security/handover") ||
                        location.pathname.startsWith("/security/performance") ||
                        location.pathname.startsWith("/security/guard-app"),
              subItems: [
                {
                  title: t('security.menu.guardAttendance', 'Guard Attendance'),
                  url: "/security/attendance",
                  icon: Clock,
                  menuCode: 'guard_attendance',
                },
                {
                  title: t('security.menu.cctvManagement', 'CCTV Management'),
                  url: "/security/cctv",
                  icon: Video,
                  menuCode: 'cctv_management',
                },
                {
                  title: t('security.menu.emergencyAlerts', 'Emergency Alerts'),
                  url: "/security/emergency-alerts",
                  icon: Bell,
                  menuCode: 'emergency_alerts',
                },
                {
                  title: t('security.menu.shiftHandover', 'Shift Handover'),
                  url: "/security/handover",
                  icon: FileText,
                  menuCode: 'shift_handover',
                },
                {
                  title: t('security.menu.guardPerformance', 'Guard Performance'),
                  url: "/security/performance",
                  icon: BarChart3,
                  menuCode: 'guard_performance',
                },
                {
                  title: t('security.menu.guardMobileApp', 'Guard Mobile'),
                  url: "/security/guard-app",
                  icon: MapPin,
                  menuCode: 'guard_mobile_app',
                },
              ],
            },
            {
              title: t('security.menu.gateDashboard', 'Gate Dashboard'),
              url: "/security/gate-dashboard",
              icon: Shield,
              menuCode: 'gate_dashboard',
            },
            {
              title: t('security.menu.contractorAccess', 'Contractor Access'),
              url: "/security/contractor-access",
              icon: UserCheck,
              menuCode: 'contractor_access',
            },
            {
              title: t('security.menu.contractorList', 'Legacy Contractors'),
              url: "/security/contractors",
              icon: List,
              menuCode: 'contractor_list',
            },
            {
              title: t('security.menu.contractorCheck', 'Contractor Check'),
              url: "/security/contractor-check",
              icon: Shield,
              menuCode: 'contractor_check',
            },
          ],
        },
      ],
    },
    {
      title: t('navigation.assetManagement'),
      icon: Package,
      menuCode: 'asset_management',
      isActive: location.pathname.startsWith("/assets"),
      items: [
        {
          title: t('navigation.assetDashboard'),
          url: "/assets/dashboard",
          icon: BarChart3,
          menuCode: 'asset_dashboard',
        },
        {
          title: t('navigation.assetList'),
          url: "/assets",
          icon: List,
          menuCode: 'asset_list',
        },
        {
          title: t('navigation.registerAsset'),
          url: "/assets/register",
          icon: Plus,
          menuCode: 'register_asset',
        },
        {
          title: t('navigation.scanAsset'),
          url: "/assets/scan",
          icon: QrCode,
          menuCode: 'scan_asset',
        },
        {
          title: t('navigation.purchaseRequests', 'Purchase Requests'),
          url: "/assets/purchase-requests",
          icon: CreditCard,
          menuCode: 'purchase_requests',
        },
        {
          title: t('navigation.approvalConfig', 'Approval Workflows'),
          url: "/assets/approval-workflows",
          icon: Workflow,
          menuCode: 'approval_workflows',
        },
      ],
    },
    {
      title: t('navigation.contractors', 'Contractors'),
      icon: Briefcase,
      menuCode: 'contractors_module',
      isActive: location.pathname.startsWith("/contractors"),
      items: [
        {
          title: t('contractors.nav.dashboard', 'Dashboard'),
          url: "/contractors",
          icon: LayoutDashboard,
          menuCode: 'contractor_dashboard',
        },
        {
          title: t('contractors.nav.companies', 'Companies'),
          url: "/contractors/companies",
          icon: Building2,
          menuCode: 'contractor_companies',
        },
        {
          title: t('contractors.nav.projects', 'Projects'),
          url: "/contractors/projects",
          icon: Briefcase,
          menuCode: 'contractor_projects',
        },
        {
          title: t('contractors.nav.workers', 'Workers'),
          url: "/contractors/workers",
          icon: Users,
          menuCode: 'contractor_workers',
        },
        {
          title: t('contractors.nav.gatePasses', 'Gate Passes'),
          url: "/contractors/gate-passes",
          icon: FileWarning,
          menuCode: 'contractor_gate_passes',
        },
        {
          title: t('contractors.nav.inductionVideos', 'Induction Videos'),
          url: "/contractors/induction-videos",
          icon: Video,
          menuCode: 'contractor_induction_videos',
        },
        {
          title: t('contractors.nav.analytics', 'Analytics'),
          url: "/contractors/analytics",
          icon: BarChart3,
          menuCode: 'contractor_analytics',
        },
      ],
    },
    {
      title: t('ptw.nav.title', 'Permit to Work'),
      icon: FileKey,
      menuCode: 'ptw_module',
      isActive: location.pathname.startsWith("/ptw"),
      items: [
        {
          title: t('ptw.nav.dashboard', 'PTW Dashboard'),
          url: "/ptw",
          icon: LayoutDashboard,
          menuCode: 'ptw_dashboard',
        },
        {
          title: t('ptw.nav.projects', 'Project Mobilization'),
          url: "/ptw/projects",
          icon: HardHat,
          menuCode: 'ptw_projects',
        },
        {
          title: t('ptw.nav.console', 'Permit Console'),
          url: "/ptw/console",
          icon: Map,
          menuCode: 'ptw_console',
        },
        {
          title: t('ptw.nav.createPermit', 'Create Permit'),
          url: "/ptw/create",
          icon: Plus,
          menuCode: 'ptw_create',
        },
      ],
    },
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
                    location.pathname === '/admin/investigation-sla',
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
                    location.pathname === "/admin/notification-logs" ||
                    location.pathname === "/admin/notification-rules",
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
              title: t('navigation.notificationRules', 'Notification Rules'),
              url: "/admin/notification-rules",
              icon: Bell,
              menuCode: 'admin_notification_rules',
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
                    location.pathname === '/admin/manhours',
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
                    location.pathname === '/admin/support',
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
          ],
        },
      ],
    },
    {
      title: t('navigation.support'),
      url: "/support",
      icon: LifeBuoy,
      menuCode: 'support',
    },
    {
      title: t('navigation.settings'),
      icon: Settings,
      menuCode: 'settings',
      isActive: location.pathname.startsWith("/settings"),
      items: [
        {
          title: t('navigation.subscription'),
          url: "/settings/subscription",
          icon: CreditCard,
          menuCode: 'settings_subscription',
        },
        {
          title: t('navigation.usageBilling'),
          url: "/settings/usage-billing",
          icon: Receipt,
          menuCode: 'settings_billing',
        },
      ],
    },
  ];

  // Filter menu items based on database-driven access control
  const filteredMenuItems = useMemo(() => {
    if (menuLoading) return menuItems;
    
    return menuItems
      .filter(item => {
        // Check if user can access this menu item
        if (item.menuCode && !canAccess(item.menuCode)) {
          // Check if there are accessible children
          if (item.items && hasAccessibleChildren(item.menuCode)) {
            return true;
          }
          return false;
        }
        return true;
      })
      .map(item => {
        if (!item.items) return item;
        
        // Filter sub-items
        const filteredSubItems = item.items
          .filter(subItem => {
            if (subItem.menuCode && !canAccess(subItem.menuCode)) {
              // Check for accessible nested items
              if ('subItems' in subItem && subItem.subItems && hasAccessibleChildren(subItem.menuCode)) {
                return true;
              }
              return false;
            }
            return true;
          })
          .map(subItem => {
            if (!('subItems' in subItem) || !subItem.subItems) return subItem;
            
            // Filter nested sub-items
            const filteredNestedItems = subItem.subItems.filter(nested => 
              !nested.menuCode || canAccess(nested.menuCode)
            );
            
            return { ...subItem, subItems: filteredNestedItems };
          })
          .filter(subItem => {
            // Remove empty groups
            if ('subItems' in subItem && subItem.subItems) return subItem.subItems.length > 0;
            return true;
          });
        
        return { ...item, items: filteredSubItems };
      })
      .filter(item => {
        // Remove empty groups
        if (item.items) return item.items.length > 0;
        return true;
      });
  }, [menuItems, canAccess, hasAccessibleChildren, menuLoading]);

  return (
    <Sidebar collapsible="icon" side={isRtl ? "right" : "left"}>
      {/* HEADER: Tenant Brand */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 w-full">
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex-1"
              >
                {themeLoading ? (
                  <div className="flex items-center gap-2 w-full">
                    <Skeleton className="size-8 rounded-lg shrink-0" />
                    <div className="space-y-1 flex-1 overflow-hidden">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex aspect-square size-8 items-center justify-center">
                      {activeSidebarIconUrl ? (
                        <img src={activeSidebarIconUrl} alt="Icon" className="size-8 object-contain" />
                      ) : (
                        <Shield className="size-6 text-primary" />
                      )}
                    </div>
                    <div className="grid flex-1 text-start text-sm leading-tight">
                      <span className="truncate font-semibold">{tenantName}</span>
                      <span className="truncate text-xs text-muted-foreground">{t('navigation.enterpriseHsse')}</span>
                    </div>
                  </>
                )}
              </SidebarMenuButton>
              
              {/* Notification Popover */}
              <NotificationPopover />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* CONTENT: Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('navigation.platform')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) =>
                item.items ? (
                  // Collapsible Section - prefetch all children on hover
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={item.isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger 
                        asChild
                        onMouseEnter={() => {
                          // Prefetch all child routes when hovering the section
                          const collectUrls = (items: typeof item.items): string[] => {
                            return items.flatMap(sub => {
                              if ('url' in sub) return [sub.url];
                              if ('subItems' in sub && sub.subItems) {
                                return collectUrls(sub.subItems as typeof item.items);
                              }
                              return [];
                            });
                          };
                          prefetchRoutes(collectUrls(item.items));
                        }}
                      >
                        <SidebarMenuButton tooltip={item.title}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) =>
                            'subItems' in subItem && subItem.subItems ? (
                              // Nested collapsible for sub-items (e.g., Incidents, Security)
                              <Collapsible
                                key={subItem.title}
                                asChild
                                defaultOpen={'isActive' in subItem ? subItem.isActive : false}
                                className="group/nested"
                              >
                                <SidebarMenuSubItem>
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuSubButton className="cursor-pointer">
                                      {subItem.icon && (
                                        <subItem.icon className="me-2 h-4 w-4 opacity-70" />
                                      )}
                                      <span>{subItem.title}</span>
                                      <ChevronRight className="ms-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/nested:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/nested:rotate-90" />
                                    </SidebarMenuSubButton>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <SidebarMenuSub className="ms-2 border-s ps-1">
                                      {subItem.subItems.map((nestedItem) =>
                                        'subItems' in nestedItem && nestedItem.subItems ? (
                                          // Level 4: Nested collapsible (e.g., Visitor Gatekeeper, Security Patrols)
                                          <Collapsible
                                            key={nestedItem.title}
                                            asChild
                                            defaultOpen={'isActive' in nestedItem ? nestedItem.isActive : false}
                                            className="group/deep"
                                          >
                                            <SidebarMenuSubItem>
                                              <CollapsibleTrigger asChild>
                                                <SidebarMenuSubButton className="cursor-pointer">
                                                  {nestedItem.icon && (
                                                    <nestedItem.icon className="me-2 h-4 w-4 opacity-70" />
                                                  )}
                                                  <span>{nestedItem.title}</span>
                                                  <ChevronRight className="ms-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/deep:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/deep:rotate-90" />
                                                </SidebarMenuSubButton>
                                              </CollapsibleTrigger>
                                              <CollapsibleContent>
                                                <SidebarMenuSub className="ms-1 border-s ps-1">
                                                  {nestedItem.subItems.map((deepItem: { title: string; url: string; icon?: React.ComponentType<{ className?: string }> }) => (
                                                    <SidebarMenuSubItem key={deepItem.title}>
                                                      <SidebarMenuSubButton
                                                        asChild
                                                        isActive={location.pathname === deepItem.url}
                                                      >
                                                        <NavLink
                                                          to={deepItem.url}
                                                          onClick={handleNavClick}
                                                          onMouseEnter={() => prefetchRoute(deepItem.url)}
                                                        >
                                                          {deepItem.icon && (
                                                            <deepItem.icon className="me-1 h-3 w-3 opacity-70" />
                                                          )}
                                                          <span>{deepItem.title}</span>
                                                        </NavLink>
                                                      </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                  ))}
                                                </SidebarMenuSub>
                                              </CollapsibleContent>
                                            </SidebarMenuSubItem>
                                          </Collapsible>
                                        ) : 'url' in nestedItem ? (
                                          // Level 3: Regular link item
                                          <SidebarMenuSubItem key={nestedItem.title}>
                                            <SidebarMenuSubButton
                                              asChild
                                              isActive={location.pathname === nestedItem.url}
                                            >
                                              <NavLink
                                                to={nestedItem.url}
                                                onClick={handleNavClick}
                                                onMouseEnter={() => prefetchRoute(nestedItem.url)}
                                              >
                                                {nestedItem.icon && (
                                                  <nestedItem.icon className="me-2 h-4 w-4 opacity-70" />
                                                )}
                                                <span>{nestedItem.title}</span>
                                              </NavLink>
                                            </SidebarMenuSubButton>
                                          </SidebarMenuSubItem>
                                        ) : null
                                      )}
                                    </SidebarMenuSub>
                                  </CollapsibleContent>
                                </SidebarMenuSubItem>
                              </Collapsible>
                            ) : 'url' in subItem ? (
                              // Regular sub-item with URL
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={location.pathname === subItem.url}
                                >
                                  <NavLink 
                                    to={subItem.url}
                                    onClick={handleNavClick}
                                    onMouseEnter={() => prefetchRoute(subItem.url)}
                                  >
                                    {subItem.icon && (
                                      <subItem.icon className="me-2 h-4 w-4 opacity-70" />
                                    )}
                                    <span>{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ) : null
                          )}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  // Single Link - prefetch on hover
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <NavLink 
                        to={item.url}
                        onClick={handleNavClick}
                        onMouseEnter={() => item.url && prefetchRoute(item.url)}
                      >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER: PWA Install & User Profile */}
      <SidebarFooter>
        <SidebarMenu>
          {/* PWA Install Button - Always visible */}
          <SidebarMenuItem>
            {isInstalled ? (
              // Already installed - show confirmation dialog
              <Dialog>
                <DialogTrigger asChild>
                  <SidebarMenuButton
                    tooltip={t('pwa.installed')}
                    className="bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400"
                  >
                    <img 
                      src={appIcon} 
                      alt={tenantName || 'DHUUD'} 
                      className="h-5 w-5 rounded object-cover flex-shrink-0"
                      onError={(e) => { e.currentTarget.src = DHUUD_APP_ICON }}
                    />
                    <span>{t('pwa.installApp')}</span>
                    <CheckCircle2 className="ms-auto h-4 w-4 flex-shrink-0" />
                  </SidebarMenuButton>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      {t('pwa.alreadyInstalled')}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      {t('pwa.alreadyInstalledMessage')}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            ) : canPromptNatively ? (
              // Native install prompt available (Chrome on Android)
              <SidebarMenuButton
                onClick={promptInstall}
                tooltip={t('pwa.installApp')}
                className="bg-primary/10 hover:bg-primary/20 text-primary"
              >
                <img 
                  src={appIcon} 
                  alt={tenantName || 'DHUUD'} 
                  className="h-5 w-5 rounded object-cover flex-shrink-0"
                  onError={(e) => { e.currentTarget.src = DHUUD_APP_ICON }}
                />
                <span>{t('pwa.installApp')}</span>
                <Download className="ms-auto h-4 w-4 flex-shrink-0" />
              </SidebarMenuButton>
            ) : (
              // Show instructions dialog (iOS or Android without native prompt)
              <Dialog>
                <DialogTrigger asChild>
                  <SidebarMenuButton
                    tooltip={t('pwa.installApp')}
                    className="bg-primary/10 hover:bg-primary/20 text-primary"
                  >
                    <img 
                      src={appIcon} 
                      alt={tenantName || 'DHUUD'} 
                      className="h-5 w-5 rounded object-cover flex-shrink-0"
                      onError={(e) => { e.currentTarget.src = DHUUD_APP_ICON }}
                    />
                    <span>{t('pwa.installApp')}</span>
                    {isIOS ? (
                      <Share className="ms-auto h-4 w-4 flex-shrink-0" />
                    ) : (
                      <Download className="ms-auto h-4 w-4 flex-shrink-0" />
                    )}
                  </SidebarMenuButton>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <img 
                        src={appIcon} 
                        alt={tenantName || 'DHUUD'} 
                        className="h-8 w-8 rounded object-cover"
                        onError={(e) => { e.currentTarget.src = DHUUD_APP_ICON }}
                      />
                      {t('pwa.installApp')}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      {isIOS ? t('pwa.iosInstructions') : t('pwa.androidInstructions')}
                    </p>
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
                        <span>{isIOS ? t('pwa.iosStep1') : t('pwa.androidStep1')}</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
                        <span>{isIOS ? t('pwa.iosStep2') : t('pwa.androidStep2')}</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">3</span>
                        <span>{isIOS ? t('pwa.iosStep3') : t('pwa.androidStep3')}</span>
                      </li>
                    </ol>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </SidebarMenuItem>
          
          {/* User Profile Section */}
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex-1"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={userAvatar} alt={userName || userEmail} />
                      <AvatarFallback className="rounded-lg">
                        <UserCircle className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-start text-sm leading-tight">
                      <span className="truncate font-semibold">{t('sidebar.myAccount')}</span>
                      <span className="truncate text-xs text-muted-foreground">{userName || userEmail}</span>
                    </div>
                    <ChevronRight className="ms-auto size-4 rtl:rotate-180" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg bg-popover"
                  side="bottom"
                  align={isRtl ? "start" : "end"}
                  sideOffset={4}
                >
                  <DropdownMenuItem 
                    onClick={() => navigate("/profile")}
                    onMouseEnter={() => prefetchRoute('/profile')}
                  >
                    <User className="me-2 h-4 w-4" />
                    {t('sidebar.profileSettings')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="me-2 h-4 w-4" />
                    {t('auth.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ThemeToggle />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
