import { ReactNode } from "react";
import { useClientSiteRepCompanies } from "@/hooks/contractor-management/use-client-site-rep-data";
import { PageLoader } from "@/components/ui/page-loader";
import { ShieldAlert, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface ClientSiteRepRouteProps {
  children: ReactNode;
}

/**
 * Access control wrapper for /client-site-rep routes.
 * Only allows access to users with companies assigned via contractor_companies.client_site_rep_id
 */
export function ClientSiteRepRoute({ children }: ClientSiteRepRouteProps) {
  const { data: companies, isLoading, error } = useClientSiteRepCompanies();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  if (isLoading) {
    return <PageLoader />;
  }

  // User has no companies assigned as client site rep
  if (!companies || companies.length === 0) {
    return (
      <div 
        className="flex min-h-screen items-center justify-center bg-background p-4"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t("accessControl.accessDenied", "Access Denied")}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t(
              "accessControl.notClientSiteRep",
              "You do not have any contractor companies assigned to you as a site representative. Contact your administrator to be assigned as a client site representative."
            )}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              {t("common.goBack", "Go Back")}
            </Button>
            <Button
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <Building2 className="h-4 w-4" />
              {t("common.goToDashboard", "Go to Dashboard")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // User has companies assigned - render children
  return <>{children}</>;
}
