import { ReactNode } from "react";
import { useContractorRepresentative } from "@/hooks/contractor-management/use-contractor-portal";
import { PageLoader } from "@/components/ui/page-loader";
import { ShieldAlert, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface ContractorPortalRouteProps {
  children: ReactNode;
}

/**
 * Access control wrapper for /contractor-portal routes.
 * Only allows access to users linked via contractor_representatives.user_id
 */
export function ContractorPortalRoute({ children }: ContractorPortalRouteProps) {
  const { data: rep, isLoading, error } = useContractorRepresentative();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  if (isLoading) {
    return <PageLoader />;
  }

  // User is not a contractor representative
  if (!rep) {
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
              "accessControl.notContractorRep",
              "You are not registered as a contractor representative. This portal is only accessible to users linked to a contractor company."
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

  // User is a valid contractor representative - render children
  return <>{children}</>;
}
