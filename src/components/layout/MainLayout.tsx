import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { Outlet } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TrialBanner } from "@/components/TrialBanner";
import { OfflineStatusBanner } from "@/components/offline/OfflineStatusBanner";
import { OfflineStatusBadge } from "@/components/layout/OfflineStatusBadge";
import { HSSENotificationCenter } from "@/components/notifications/HSSENotificationCenter";
import { MandatoryNotificationDialog } from "@/components/notifications/MandatoryNotificationDialog";
import { HSSEAlertBanner } from "@/components/dashboard/HSSEAlertBanner";
import { useDynamicManifest } from "@/hooks/use-dynamic-manifest";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

export default function MainLayout() {
  const {
    tenantName
  } = useTheme();
  
  // Generate tenant-specific PWA manifest with name "HSSE – [Tenant Name]" and tenant icon
  useDynamicManifest();
  
  // Subscribe to realtime notifications for instant in-app updates
  useRealtimeNotifications();
  
  return <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="min-w-0 flex flex-col w-full">
          {/* Header with Trigger - Fully responsive fixed header with safe-area support for PWA */}
          <header 
            className="fixed top-0 start-0 md:start-[var(--sidebar-width,0px)] end-0 z-50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 min-h-12 sm:min-h-14 md:min-h-16 h-auto shrink-0 items-center justify-between gap-1.5 sm:gap-2 border-b px-2 sm:px-3 md:px-4 transition-[left,right] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:md:start-[var(--sidebar-width-icon,3rem)] flex flex-row flex-wrap"
            style={{ 
              paddingTop: 'env(safe-area-inset-top, 0px)',
            }}
          >
            {/* Left side - Trigger and tenant name with flexible truncation */}
            <div className="items-center gap-1.5 sm:gap-2 flex flex-row min-w-0 flex-1 py-2 sm:py-2.5 md:py-3">
              <SidebarTrigger className="-ms-1 shrink-0" />
              <Separator orientation="vertical" className="me-1.5 sm:me-2 h-4 hidden sm:block" />
              <span className="text-xs sm:text-sm font-medium truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[200px] md:max-w-none">
                {tenantName}
              </span>
            </div>
            
            {/* Right side - Critical controls that MUST always be visible */}
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0 py-2 sm:py-2.5 md:py-3">
              <OfflineStatusBadge />
              <HSSENotificationCenter />
              <LanguageSelector />
            </div>
          </header>

          {/* Main Page Content with responsive top padding to account for flexible header */}
          <main 
            className="flex flex-1 flex-col gap-4 p-3 sm:p-4 min-w-0 overflow-auto"
            style={{
              paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))',
            }}
          >
            <TrialBanner />
            <HSSEAlertBanner />
            <Outlet />
          </main>
        </SidebarInset>
      </div>
      
      {/* Offline Status Banner - Fixed position */}
      <OfflineStatusBanner />
      
      {/* Mandatory HSSE Notifications - Blocks UI until acknowledged */}
      <MandatoryNotificationDialog />
    </SidebarProvider>;
}