import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LogOut,
  ChevronRight,
  UserCircle,
  User,
  Download,
  Share,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { prefetchRoute } from "@/hooks/use-prefetch";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { DHUUD_APP_ICON } from "@/constants/branding";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logUserActivity, getSessionDurationSeconds, clearSessionTracking } from "@/lib/activity-logger";
import { ThemeToggle } from "@/components/settings";

export function AppSidebarFooter() {
  const { t, i18n } = useTranslation();
  const { tenantName, activeSidebarIconUrl } = useTheme();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isRtl, setIsRtl] = useState(document.documentElement.dir === 'rtl');
  const { canPromptNatively, isIOS, isInstalled, promptInstall } = usePWAInstall();

  const appIcon = activeSidebarIconUrl || DHUUD_APP_ICON;
  const userEmail = user?.email || "";
  const userName = profile?.full_name || "";
  const userAvatar = profile?.avatar_url || "";

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsRtl(document.documentElement.dir === 'rtl');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIsRtl(document.documentElement.dir === 'rtl');
  }, [i18n.language]);

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

  return (
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
  );
}
