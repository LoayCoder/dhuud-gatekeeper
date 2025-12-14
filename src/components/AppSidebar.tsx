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
} from "@/components/ui/sidebar";
import {
  Shield,
  LayoutDashboard,
  FileWarning,
  ClipboardCheck,
  Users,
  Settings,
  Building2,
  LogOut,
  ChevronRight,
  UserCircle,
  User,
  Network,
  Layers,
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

export function AppSidebar() {
  const { t, i18n } = useTranslation();
  const { tenantName, activeSidebarIconUrl, isLoading: themeLoading } = useTheme();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRtl, setIsRtl] = useState(document.documentElement.dir === 'rtl');
  const { canAccess, hasAccessibleChildren, isLoading: menuLoading } = useMenuAccess();

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
                  title: t('security.visitors.checkpoint', 'Checkpoint'),
                  url: "/visitors/checkpoint",
                  icon: Shield,
                  menuCode: 'visitor_checkpoint',
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
              title: t('security.menu.contractors', 'Contractors'),
              icon: Briefcase,
              menuCode: 'contractors',
              isActive: location.pathname.startsWith("/security/contractors") || location.pathname.startsWith("/security/contractor-check") || location.pathname.startsWith("/contractors"),
              subItems: [
                {
                  title: t('contractors.dashboard', 'Dashboard'),
                  url: "/contractors",
                  icon: LayoutDashboard,
                  menuCode: 'contractor_dashboard',
                },
                {
                  title: t('contractors.companies', 'Companies'),
                  url: "/contractors/companies",
                  icon: Building2,
                  menuCode: 'contractor_companies',
                },
                {
                  title: t('contractors.projects', 'Projects'),
                  url: "/contractors/projects",
                  icon: Briefcase,
                  menuCode: 'contractor_projects',
                },
                {
                  title: t('contractors.workers', 'Workers'),
                  url: "/contractors/workers",
                  icon: Users,
                  menuCode: 'contractor_workers',
                },
                {
                  title: t('contractors.gatePasses', 'Gate Passes'),
                  url: "/contractors/gate-passes",
                  icon: FileWarning,
                  menuCode: 'contractor_gate_passes',
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
          subItems: [
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
          ],
        },
      ],
    },
    {
      title: t('navigation.administration'),
      icon: Settings,
      menuCode: 'administration',
      isActive: location.pathname.startsWith("/admin"),
      items: [
        {
          title: t('navigation.brandManagement'),
          url: "/admin/branding",
          icon: Building2,
          menuCode: 'admin_branding',
        },
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
          title: t('navigation.tenantManagement'),
          url: "/admin/tenants",
          icon: Layers,
          menuCode: 'admin_tenants',
        },
        {
          title: t('navigation.supportDashboard'),
          url: "/admin/support",
          icon: HelpCircle,
          menuCode: 'admin_support',
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
          title: t('analytics.title', 'Usage Analytics'),
          url: "/admin/analytics",
          icon: BarChart3,
          menuCode: 'admin_analytics',
        },
        {
          title: t('navigation.securityAudit', 'Security Audit'),
          url: "/admin/security-audit",
          icon: ShieldAlert,
          menuCode: 'admin_security_audit',
        },
        {
          title: t('navigation.documentSettings', 'Document Settings'),
          url: "/admin/document-settings",
          icon: FileCog,
          menuCode: 'admin_document_settings',
        },
        {
          title: t('navigation.inspectionTemplates', 'Inspection Templates'),
          url: "/admin/inspection-templates",
          icon: ClipboardList,
          menuCode: 'admin_templates',
        },
        {
          title: t('navigation.billingOverview'),
          url: "/admin/billing",
          icon: Receipt,
          menuCode: 'admin_billing',
        },
        {
          title: t('navigation.slaDashboard', 'SLA Dashboard'),
          url: "/admin/sla-dashboard",
          icon: BarChart3,
          menuCode: 'admin_sla_dashboard',
        },
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
          title: t('navigation.actionSlaSettings', 'Action SLA Settings'),
          url: "/admin/action-sla",
          icon: ClipboardList,
          menuCode: 'admin_action_sla',
        },
        {
          title: t('admin.menuAccess.title', 'Menu Access'),
          url: "/admin/menu-access",
          icon: Menu,
          menuCode: 'admin_menu_access',
        },
        {
          title: t('workflowDiagrams.title', 'Workflow Diagrams'),
          url: "/admin/workflow-diagrams",
          icon: Workflow,
          menuCode: 'admin_workflow_diagrams',
        },
        {
          title: t('navigation.kpiTargets', 'KPI Targets'),
          url: "/admin/kpi-targets",
          icon: BarChart3,
          menuCode: 'admin_kpi_targets',
        },
        {
          title: t('navigation.manhoursManagement', 'Manhours Management'),
          url: "/admin/manhours",
          icon: Clock,
          menuCode: 'admin_manhours',
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

      {/* FOOTER: User Profile & Logout */}
      <SidebarFooter>
        <SidebarMenu>
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
