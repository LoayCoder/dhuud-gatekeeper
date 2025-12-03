import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
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
} from "lucide-react";
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

export function AppSidebar() {
  const { t, i18n } = useTranslation();
  const { tenantName, activeSidebarIconUrl, isLoading: themeLoading } = useTheme();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRtl, setIsRtl] = useState(document.documentElement.dir === 'rtl');

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

  // Menu Configuration with translations
  const menuItems = [
    {
      title: t('navigation.dashboard'),
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: t('navigation.hsseManagement'),
      icon: Shield,
      isActive: location.pathname.startsWith("/incidents") || 
                location.pathname.startsWith("/audits") || 
                location.pathname.startsWith("/visitors"),
      items: [
        {
          title: t('navigation.incidents'),
          url: "/incidents",
          icon: FileWarning,
        },
        {
          title: t('navigation.auditsInspections'),
          url: "/audits",
          icon: ClipboardCheck,
        },
        {
          title: t('navigation.visitorGatekeeper'),
          url: "/visitors",
          icon: Users,
        },
      ],
    },
    {
      title: t('navigation.administration'),
      icon: Settings,
      isActive: location.pathname.startsWith("/admin"),
      items: [
        {
          title: t('navigation.brandManagement'),
          url: "/admin/branding",
          icon: Building2,
        },
        {
          title: t('navigation.userManagement'),
          url: "/admin/users",
          icon: Users,
        },
        {
          title: t('navigation.orgStructure'),
          url: "/admin/org-structure",
          icon: Network,
        },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" side={isRtl ? "right" : "left"}>
      {/* HEADER: Tenant Brand */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* CONTENT: Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('navigation.platform')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) =>
                item.items ? (
                  // Collapsible Section
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={item.isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={location.pathname === subItem.url}
                              >
                                <NavLink to={subItem.url}>
                                  {subItem.icon && (
                                    <subItem.icon className="me-2 h-4 w-4 opacity-70" />
                                  )}
                                  <span>{subItem.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  // Single Link
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <NavLink to={item.url}>
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
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
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
