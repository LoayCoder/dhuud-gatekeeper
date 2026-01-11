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
  { path: "/contractor-portal", icon: LayoutDashboard, labelKey: "contractorPortal.nav.dashboard" },
  { path: "/contractor-portal/workers", icon: Users, labelKey: "contractorPortal.nav.workers" },
  { path: "/contractor-portal/projects", icon: FolderKanban, labelKey: "contractorPortal.nav.projects" },
  { path: "/contractor-portal/gate-passes", icon: Truck, labelKey: "contractorPortal.nav.gatePasses" },
  { path: "/contractor-portal/activity-log", icon: History, labelKey: "contractorPortal.nav.activityLog" },
];

export default function ContractorPortalLayout({ children }: ContractorPortalLayoutProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { logoLightUrl, tenantName } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            {logoLightUrl ? (
              <img 
                src={logoLightUrl} 
                alt="Logo" 
                className="h-8 w-auto"
              />
            ) : (
              <Building2 className="h-8 w-8 text-primary" />
            )}
            <div>
              <h1 className="text-lg font-semibold">
                {t("contractorPortal.title", "Contractor Portal")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {profile?.full_name}
              </p>
            </div>
          </div>

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
                {t(item.labelKey, item.labelKey.split(".").pop())}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 me-2" />
              {t("common.logout", "Logout")}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden sticky top-16 z-40 w-full border-b bg-background overflow-x-auto">
        <div className="flex items-center gap-1 p-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                location.pathname === item.path
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey, item.labelKey.split(".").pop())}
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
}
