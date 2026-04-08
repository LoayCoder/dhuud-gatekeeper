import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Building2, Users, FolderKanban, Truck, LayoutDashboard, LogOut, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

interface ContractorPortalLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: "/contractor-portal", icon: LayoutDashboard, labelKey: "contractorPortal.nav.dashboard", fallback: "Dashboard" },
  { path: "/contractor-portal/workers", icon: Users, labelKey: "contractorPortal.nav.workers", fallback: "Workers" },
  { path: "/contractor-portal/projects", icon: FolderKanban, labelKey: "contractorPortal.nav.projects", fallback: "Projects" },
  { path: "/contractor-portal/gate-passes", icon: Truck, labelKey: "contractorPortal.nav.gatePasses", fallback: "Passes" },
  { path: "/contractor-portal/activity-log", icon: History, labelKey: "contractorPortal.nav.activityLog", fallback: "Log" },
];

export default function ContractorPortalLayout({ children }: ContractorPortalLayoutProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { logoLightUrl } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 sm:h-16 items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {logoLightUrl ? (
              <img 
                src={logoLightUrl} 
                alt="Logo" 
                className="h-7 sm:h-8 w-auto flex-shrink-0"
              />
            ) : (
              <Building2 className="h-7 w-7 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-semibold truncate">
                {t("contractorPortal.title", "Contractor Portal")}
              </h1>
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                {profile?.full_name}
              </p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {t(item.labelKey, item.fallback)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationCenter />
            {/* Desktop: text + icon, Mobile: icon only */}
            <Button variant="ghost" size="icon" onClick={handleLogout} className="md:hidden">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:flex">
              <LogOut className="h-4 w-4 me-2" />
              {t("common.logout", "Logout")}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content — extra bottom padding on mobile for bottom nav */}
      <main className="container py-4 sm:py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                <span className="truncate max-w-[60px]">{t(item.labelKey, item.fallback)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
