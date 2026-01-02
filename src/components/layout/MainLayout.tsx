import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { Outlet } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TrialBanner } from "@/components/TrialBanner";
import { OfflineStatusBanner } from "@/components/offline/OfflineStatusBanner";
import { OfflineStatusBadge } from "@/components/layout/OfflineStatusBadge";
import { InstallPromptDialog } from "@/components/pwa/InstallPromptDialog";
import { HSSENotificationCenter } from "@/components/notifications/HSSENotificationCenter";
import { MandatoryNotificationDialog } from "@/components/notifications/MandatoryNotificationDialog";
import { HSSEAlertBanner } from "@/components/dashboard/HSSEAlertBanner";

export default function MainLayout() {
  const {
    tenantName
  } = useTheme();
  return <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="min-w-0 flex flex-col">
          {/* Header with Trigger - Fixed header with safe-area support for PWA */}
          <header 
            className="fixed top-0 end-0 z-50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height,left,right] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 flex flex-row"
            style={{ 
              paddingTop: 'env(safe-area-inset-top, 0px)',
              minHeight: 'calc(4rem + env(safe-area-inset-top, 0px))',
              // Position header to the right of the sidebar
              insetInlineStart: 'var(--sidebar-width, 16rem)',
            }}
          >
            <div className="items-center gap-2 flex flex-row min-w-0">
              <SidebarTrigger className="-ms-1 shrink-0" />
              <Separator orientation="vertical" className="me-2 h-4" />
              <span className="text-sm font-medium truncate">{tenantName}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <OfflineStatusBadge />
              <HSSENotificationCenter />
              <LanguageSelector />
            </div>
          </header>

          {/* Spacer to account for fixed header */}
          <div 
            className="shrink-0 h-16 group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
            style={{ minHeight: 'calc(4rem + env(safe-area-inset-top, 0px))' }}
          />

          {/* Main Page Content */}
          <main className="flex flex-1 flex-col gap-4 p-4 min-w-0 overflow-auto">
            <TrialBanner />
            <HSSEAlertBanner />
            <Outlet />
          </main>
        </SidebarInset>
      </div>
      
      {/* Offline Status Banner - Fixed position */}
      <OfflineStatusBanner />
      
      {/* PWA Install Prompt - Auto-shows after login */}
      <InstallPromptDialog triggerOnLogin={true} />
      
      {/* Mandatory HSSE Notifications - Blocks UI until acknowledged */}
      <MandatoryNotificationDialog />
    </SidebarProvider>;
}