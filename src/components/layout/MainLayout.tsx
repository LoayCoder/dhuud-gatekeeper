import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { Outlet } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TrialBanner } from "@/components/TrialBanner";
import { OfflineStatusBanner } from "@/components/offline/OfflineStatusBanner";
import { OfflineStatusBadge } from "@/components/layout/OfflineStatusBadge";

export default function MainLayout() {
  const {
    tenantName
  } = useTheme();
  return <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="min-w-0 overflow-hidden">
          {/* Header with Trigger */}
          <header className="sticky top-0 z-10 bg-background h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 flex flex-row">
            <div className="items-center gap-2 flex flex-row min-w-0">
              <SidebarTrigger className="-ms-1 shrink-0" />
              <Separator orientation="vertical" className="me-2 h-4" />
              <span className="text-sm font-medium truncate">{tenantName}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <OfflineStatusBadge />
              <LanguageSelector />
            </div>
          </header>

          {/* Main Page Content */}
          <main className="flex flex-1 flex-col gap-4 p-4 min-w-0 overflow-hidden">
            <TrialBanner />
            <Outlet />
          </main>
        </SidebarInset>
      </div>
      
      {/* Offline Status Banner - Fixed position */}
      <OfflineStatusBanner />
    </SidebarProvider>;
}