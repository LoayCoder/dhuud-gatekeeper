import { useTranslation } from 'react-i18next';
import { SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Shield } from "lucide-react";
import { NotificationPopover } from "@/components/notifications";
import { useTheme } from "@/contexts/ThemeContext";
import { Skeleton } from "@/components/ui/skeleton";

export function AppSidebarHeader() {
  const { t } = useTranslation();
  const { tenantName, activeSidebarIconUrl, isLoading: themeLoading } = useTheme();

  return (
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
  );
}
