import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface RiskAcceptabilitySectionProps {
  riskTolerance: string;
  onRiskToleranceChange: (value: string) => void;
  acceptanceJustification: string;
  onAcceptanceJustificationChange: (value: string) => void;
  reviewFrequency: string;
  onReviewFrequencyChange: (value: string) => void;
  nextReviewDate: string;
  onNextReviewDateChange: (value: string) => void;
  managementApprovalRequired: boolean;
  overallRiskRating: string;
  hazardCount: number;
  highRiskCount: number;
}

const RISK_TOLERANCE_OPTIONS = [
  {
    value: "acceptable",
    label: "Acceptable",
    description: "Risk is at an acceptable level. Proceed with standard monitoring.",
    icon: CheckCircle2,
    color: "text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
    badgeColor: "bg-green-500",
  },
  {
    value: "tolerable_alarp",
    label: "Tolerable (ALARP)",
    description: "Risk is As Low As Reasonably Practicable. Proceed with enhanced monitoring.",
    icon: AlertCircle,
    color: "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800",
    badgeColor: "bg-yellow-500",
  },
  {
    value: "unacceptable",
    label: "Unacceptable",
    description: "Risk is too high. STOP work and implement additional controls.",
    icon: XCircle,
    color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
    badgeColor: "bg-red-500",
  },
];

const REVIEW_FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

export function RiskAcceptabilitySection({
  riskTolerance,
  onRiskToleranceChange,
  acceptanceJustification,
  onAcceptanceJustificationChange,
  reviewFrequency,
  onReviewFrequencyChange,
  nextReviewDate,
  onNextReviewDateChange,
  managementApprovalRequired,
  overallRiskRating,
  hazardCount,
  highRiskCount,
}: RiskAcceptabilitySectionProps) {
  const { t } = useTranslation();

  const selectedTolerance = RISK_TOLERANCE_OPTIONS.find((o) => o.value === riskTolerance);
  const needsJustification = riskTolerance === "tolerable_alarp";
  const isUnacceptable = riskTolerance === "unacceptable";

  // Calculate next review date based on frequency
  const calculateNextReviewDate = (frequency: string): string => {
    const today = new Date();
    switch (frequency) {
      case "daily":
        today.setDate(today.getDate() + 1);
        break;
      case "weekly":
        today.setDate(today.getDate() + 7);
        break;
      case "monthly":
        today.setMonth(today.getMonth() + 1);
        break;
      case "quarterly":
        today.setMonth(today.getMonth() + 3);
        break;
      case "annually":
        today.setFullYear(today.getFullYear() + 1);
        break;
      default:
        today.setMonth(today.getMonth() + 1);
    }
    return today.toISOString().split("T")[0];
  };

  const handleFrequencyChange = (value: string) => {
    onReviewFrequencyChange(value);
    if (!nextReviewDate) {
      onNextReviewDateChange(calculateNextReviewDate(value));
    }
  };

  return (
    <div className="space-y-6">
      {/* Risk Acceptability Decision */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5" />
            {t("risk.acceptability.title", "Risk Acceptability Decision (ISO 45001)")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{hazardCount}</div>
              <div className="text-xs text-muted-foreground">
                {t("risk.summary.hazards", "Hazards")}
              </div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{highRiskCount}</div>
              <div className="text-xs text-muted-foreground">
                {t("risk.summary.highRisk", "High/Critical")}
              </div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold capitalize">{overallRiskRating}</div>
              <div className="text-xs text-muted-foreground">
                {t("risk.summary.rating", "Overall Rating")}
              </div>
            </div>
          </div>

          {/* Tolerance Selection */}
          <div className="space-y-3">
            <Label>{t("risk.acceptability.selectLevel", "Risk Acceptability Level")} *</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {RISK_TOLERANCE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = riskTolerance === option.value;
                return (
                  <div
                    key={option.value}
                    onClick={() => onRiskToleranceChange(option.value)}
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all",
                      isSelected ? option.color : "border-muted hover:border-muted-foreground/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={cn("h-5 w-5", isSelected ? "" : "text-muted-foreground")} />
                      <span className="font-medium">
                        {t(`risk.acceptability.${option.value}`, option.label)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t(`risk.acceptability.${option.value}Desc`, option.description)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unacceptable Risk Warning */}
          {isUnacceptable && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {t("risk.acceptability.unacceptableWarning", "Work cannot proceed with unacceptable risk level. Additional controls must be implemented before work begins.")}
              </AlertDescription>
            </Alert>
          )}

          {/* ALARP Justification */}
          {needsJustification && (
            <div className="space-y-2">
              <Label className="text-orange-600">
                {t("risk.acceptability.justificationRequired", "ALARP Justification Required")} *
              </Label>
              <Textarea
                value={acceptanceJustification}
                onChange={(e) => onAcceptanceJustificationChange(e.target.value)}
                placeholder={t("risk.acceptability.justificationPlaceholder", "Explain why further risk reduction is not reasonably practicable...")}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                {t("risk.acceptability.justificationHelp", "Document the cost-benefit analysis demonstrating that further risk reduction would be grossly disproportionate to the benefits gained.")}
              </p>
            </div>
          )}

          {/* Management Approval Notice */}
          {managementApprovalRequired && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {t("risk.acceptability.managementApproval", "This assessment requires management approval due to high/critical risk level.")}
                </span>
                <Badge variant="outline" className="ms-2">
                  {t("risk.acceptability.approvalRequired", "Approval Required")}
                </Badge>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Review Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("risk.review.title", "Review Schedule (ISO 45001)")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t("risk.review.frequency", "Review Frequency")} *</Label>
              <Select value={reviewFrequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("risk.review.selectFrequency", "Select frequency...")} />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(`risk.review.${option.value}`, option.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("risk.review.nextDate", "Next Review Date")}</Label>
              <input
                type="date"
                value={nextReviewDate}
                onChange={(e) => onNextReviewDateChange(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("risk.review.help", "ISO 45001 requires periodic review of risk assessments. Review frequency should reflect the level of risk and potential for change.")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
