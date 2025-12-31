import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SafetyRatioAlertProps {
  workerCount: number;
  safetyOfficerCount: number;
}

const SAFETY_RATIO_THRESHOLD = 22;

export function SafetyRatioAlert({ workerCount, safetyOfficerCount }: SafetyRatioAlertProps) {
  const { t } = useTranslation();

  const calculateRatio = () => {
    if (safetyOfficerCount === 0 && workerCount > 0) {
      return { ratio: Infinity, compliant: false };
    }
    if (workerCount === 0) {
      return { ratio: 0, compliant: true };
    }
    const ratio = workerCount / safetyOfficerCount;
    return { ratio, compliant: ratio <= SAFETY_RATIO_THRESHOLD };
  };

  const { ratio, compliant } = calculateRatio();

  if (workerCount === 0 && safetyOfficerCount === 0) {
    return (
      <Alert className="border-muted">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{t("contractors.companies.safetyRatio", "Safety Ratio")}</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          {t("contractors.companies.noWorkersAssigned", "No workers assigned yet")}
        </AlertDescription>
      </Alert>
    );
  }

  if (!compliant) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("contractors.companies.safetyRatioAlert", "Safety Ratio Alert")}</AlertTitle>
        <AlertDescription>
          <div className="space-y-1">
            <p>
              {t("contractors.companies.ratioExceeded", "Safety officer ratio exceeds the 1:22 requirement")}
            </p>
            <div className="flex flex-wrap gap-4 text-sm font-medium mt-2">
              <span>{t("contractors.companies.workers", "Workers")}: {workerCount}</span>
              <span>{t("contractors.companies.safetyOfficers", "Safety Officers")}: {safetyOfficerCount}</span>
              <span>
                {t("contractors.companies.currentRatio", "Current Ratio")}: 1:{ratio === Infinity ? "∞" : ratio.toFixed(1)}
              </span>
            </div>
            {safetyOfficerCount === 0 ? (
              <p className="mt-2 font-medium">
                {t("contractors.companies.noSafetyOfficer", "No safety officer assigned!")}
              </p>
            ) : (
              <p className="mt-2">
                {t("contractors.companies.requiredOfficers", "Required safety officers")}: {Math.ceil(workerCount / SAFETY_RATIO_THRESHOLD)}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-500 bg-green-500/10">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-700 dark:text-green-400">
        {t("contractors.companies.safetyCompliant", "Safety Compliant")}
      </AlertTitle>
      <AlertDescription>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>{t("contractors.companies.workers", "Workers")}: {workerCount}</span>
          <span>{t("contractors.companies.safetyOfficers", "Safety Officers")}: {safetyOfficerCount}</span>
          <span>{t("contractors.companies.currentRatio", "Current Ratio")}: 1:{ratio.toFixed(1)}</span>
        </div>
      </AlertDescription>
    </Alert>
  );
}
