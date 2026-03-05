import { useTranslation } from "react-i18next";
import { FileText, Scale, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ActivityDetailsSectionProps {
  activityType: string;
  onActivityTypeChange: (value: string) => void;
  workEnvironment: string;
  onWorkEnvironmentChange: (value: string) => void;
  scopeDescription: string;
  onScopeDescriptionChange: (value: string) => void;
  applicableLegislation: string[];
  onApplicableLegislationChange: (value: string[]) => void;
}

const ACTIVITY_TYPES = [
  { value: "routine", label: "Routine", description: "Regular, day-to-day activities" },
  { value: "non_routine", label: "Non-Routine", description: "Occasional or infrequent activities" },
  { value: "emergency", label: "Emergency", description: "Emergency response activities" },
  { value: "maintenance", label: "Maintenance", description: "Maintenance or repair work" },
];

const COMMON_LEGISLATION = [
  { value: "osha_1910", label: "OSHA 29 CFR 1910", region: "USA" },
  { value: "osha_1926", label: "OSHA 29 CFR 1926 (Construction)", region: "USA" },
  { value: "iso_45001", label: "ISO 45001:2018", region: "International" },
  { value: "saudi_labor", label: "Saudi Labor Law", region: "KSA" },
  { value: "aramco_hse", label: "ARAMCO HSE Standards", region: "KSA" },
  { value: "sabic_hse", label: "SABIC HSE Requirements", region: "KSA" },
  { value: "civil_defense", label: "Civil Defense Regulations", region: "KSA" },
  { value: "environmental", label: "Environmental Regulations", region: "General" },
];

export function ActivityDetailsSection({
  activityType,
  onActivityTypeChange,
  workEnvironment,
  onWorkEnvironmentChange,
  scopeDescription,
  onScopeDescriptionChange,
  applicableLegislation,
  onApplicableLegislationChange,
}: ActivityDetailsSectionProps) {
  const { t } = useTranslation();

  const toggleLegislation = (value: string) => {
    const updated = applicableLegislation.includes(value)
      ? applicableLegislation.filter((l) => l !== value)
      : [...applicableLegislation, value];
    onApplicableLegislationChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Activity Type (ISO 45001 6.1.2.1) */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t("risk.compliance.activityType", "Activity Type")} *
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ACTIVITY_TYPES.map((type) => {
            const isSelected = activityType === type.value;
            return (
              <div
                key={type.value}
                onClick={() => onActivityTypeChange(type.value)}
                className={cn(
                  "p-3 rounded-lg border-2 cursor-pointer transition-all text-center",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-muted hover:border-muted-foreground/50"
                )}
              >
                <div className="font-medium text-sm">
                  {t(`risk.activityType.${type.value}`, type.label)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t(`risk.activityType.${type.value}Desc`, type.description)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Work Environment */}
      <div>
        <Label className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {t("risk.compliance.workEnvironment", "Work Environment")}
        </Label>
        <Input
          value={workEnvironment}
          onChange={(e) => onWorkEnvironmentChange(e.target.value)}
          placeholder={t("risk.compliance.workEnvironmentPlaceholder", "e.g., Outdoor, confined space, elevated work, chemical exposure area...")}
          className="mt-1"
        />
      </div>

      {/* Scope and Boundaries */}
      <div>
        <Label>{t("risk.compliance.scopeDescription", "Scope & Boundaries")}</Label>
        <Textarea
          value={scopeDescription}
          onChange={(e) => onScopeDescriptionChange(e.target.value)}
          placeholder={t("risk.compliance.scopePlaceholder", "Define what is included/excluded from this assessment. Consider equipment, processes, areas, and timeframes...")}
          className="mt-1 min-h-[80px]"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t("risk.compliance.scopeHelp", "ISO 45001 requires clear definition of assessment scope and boundaries.")}
        </p>
      </div>

      {/* Applicable Legislation (ISO 45001 6.1.3) */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Scale className="h-4 w-4" />
          {t("risk.compliance.applicableLegislation", "Applicable Legislation & Standards")}
        </Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_LEGISLATION.map((leg) => {
            const isSelected = applicableLegislation.includes(leg.value);
            return (
              <Badge
                key={leg.value}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  isSelected && "bg-primary"
                )}
                onClick={() => toggleLegislation(leg.value)}
              >
                {leg.label}
                <span className="ms-1 text-xs opacity-70">({leg.region})</span>
              </Badge>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("risk.compliance.legislationHelp", "Select all applicable legislation and standards that apply to this activity.")}
        </p>
      </div>
    </div>
  );
}
