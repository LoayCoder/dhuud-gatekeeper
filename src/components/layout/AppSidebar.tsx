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
  ShieldCheck,
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
  AlertTriangle,
  Globe,
  Languages,
  GraduationCap,
  BookOpen,
  History,
  Sparkles,
  Trophy,
  Award,
} from "lucide-react";
import { NotificationPopover } from "@/components/notifications";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/layout/NavLink";
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
import { ThemeToggle } from "@/components/settings";
import { prefetchRoute, prefetchRoutes } from "@/hooks/use-prefetch";
import { useMenuAccess } from "@/hooks/use-menu-access";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useRegistryMenu, type RegistryMenuItem } from "@/hooks/use-registry-menu";
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
  
  // Route registry menu items are now used to build the sidebar
  const { menuItems: registryMenuItems } = useRegistryMenu();
  
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

  // Recursive function to filter menu items at any depth
  const filterItemsRecursively = (items: RegistryMenuItem[]): RegistryMenuItem[] => {
    return items
      .map(item => {
        // Handle items with 'items' array (top-level groups)
        if (item.items) {
          const filteredChildren = filterItemsRecursively(item.items);
          // Keep the group if it has accessible children
          if (filteredChildren.length > 0) {
            return { ...item, items: filteredChildren };
          }
          // Also keep if user has direct access to this menu code
          if (!item.menuCode || canAccess(item.menuCode)) {
            return { ...item, items: filteredChildren };
          }
          return null;
        }
        
        // Handle items with 'subItems' array (nested sub-groups)
        if ('subItems' in item && item.subItems) {
          const filteredSubItems = filterItemsRecursively(item.subItems as RegistryMenuItem[]);
          // Keep the sub-group if it has accessible children
          if (filteredSubItems.length > 0) {
            return { ...item, subItems: filteredSubItems };
          }
          // Also keep if user has direct access to this menu code
          if (!item.menuCode || canAccess(item.menuCode)) {
            return { ...item, subItems: filteredSubItems };
          }
          return null;
        }
        
        // Leaf item - check direct access
        if (!item.menuCode || canAccess(item.menuCode)) {
          return item;
        }
        return null;
      })
      .filter((item): item is RegistryMenuItem => item !== null);
  };

  // Filter menu items based on database-driven access control
  const filteredMenuItems = useMemo(() => {
    if (menuLoading) return registryMenuItems;
    return filterItemsRecursively(registryMenuItems);
  }, [registryMenuItems, canAccess, menuLoading]);

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
