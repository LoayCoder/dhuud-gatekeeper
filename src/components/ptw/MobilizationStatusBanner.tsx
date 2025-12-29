import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, Building2, User, MapPin, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { MobilizationStatus } from "@/hooks/ptw/use-mobilization-check";

interface MobilizationStatusBannerProps {
  status: MobilizationStatus | undefined;
  isLoading?: boolean;
  projectId?: string;
}

export function MobilizationStatusBanner({ 
  status, 
  isLoading, 
  projectId 
}: MobilizationStatusBannerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

  if (isLoading) {
    return (
      <Alert className="border-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>{t("ptw.mobilization.checking", "Checking mobilization status...")}</AlertTitle>
      </Alert>
    );
  }

  if (!status || status.status === "not_found") {
    return null;
  }

  const isReady = status.isReady;

  return (
    <Alert variant={isReady ? "default" : "destructive"} className={isReady ? "border-green-500/50 bg-green-50 dark:bg-green-950/20" : ""}>
      {isReady ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertTitle className="flex items-center gap-2">
        {isReady 
          ? t("ptw.mobilization.ready", "Project Ready for Permits")
          : t("ptw.mobilization.notReady", "Project Not Ready")
        }
        <Badge variant={isReady ? "outline" : "destructive"} className="font-normal">
          {status.percentage}% {t("ptw.mobilization.mobilized", "Mobilized")}
        </Badge>
      </AlertTitle>
      <AlertDescription className="space-y-3">
        {/* Project Context Info */}
        <div className="flex flex-wrap gap-4 mt-2 text-sm">
          {status.contractorName && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{t("ptw.form.contractor", "Contractor")}:</span>
              <span className="font-medium">{status.contractorName}</span>
            </div>
          )}
          {status.siteName && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{t("ptw.form.site", "Site")}:</span>
              <span className="font-medium">{status.siteName}</span>
            </div>
          )}
          {status.projectManagerName && (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{t("ptw.form.projectManager", "PM")}:</span>
              <span className="font-medium">{status.projectManagerName}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {!isReady && (
          <div className="space-y-2">
            <Progress value={status.percentage} className="h-2" />
            
            {/* Blockers List */}
            {status.blockers.length > 0 && (
              <ul className="text-sm space-y-1">
                {status.blockers.map((blocker, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <span className="text-destructive">•</span>
                    <span>{blocker}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Link to Mobilization Page */}
            {projectId && (
              <Button variant="outline" size="sm" asChild className="mt-2">
                <Link to={`/ptw/projects/${projectId}/mobilization`}>
                  {t("ptw.mobilization.completeMobilization", "Complete Mobilization")}
                </Link>
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
