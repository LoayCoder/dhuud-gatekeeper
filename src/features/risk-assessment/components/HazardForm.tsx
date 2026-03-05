import { useTranslation } from "react-i18next";
import { Trash2, AlertCircle, HardHat, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface HazardFormData {
  id?: string;
  hazard_description: string;
  hazard_description_ar?: string;
  hazard_category: string;
  likelihood: number;
  severity: number;
  existing_controls: { description: string; type: string }[];
  additional_controls: { description: string; responsible: string; target_date: string }[];
  residual_likelihood: number;
  residual_severity: number;
  // ISO 45001 & OSHA Compliance Fields
  job_step_number?: number;
  job_step_description?: string;
  persons_at_risk?: string[];
  number_exposed?: number;
  control_hierarchy_level?: string;
  higher_control_justification?: string;
  required_ppe?: string[];
  control_status?: string;
}

interface HazardFormProps {
  hazard: HazardFormData;
  index: number;
  onChange: (index: number, field: string, value: unknown) => void;
  onRemove: (index: number) => void;
  showResidual?: boolean;
  showComplianceFields?: boolean;
}

const HAZARD_CATEGORIES = [
  "physical",
  "chemical",
  "biological",
  "ergonomic",
  "psychological",
  "environmental",
];

const CONTROL_TYPES = [
  "elimination",
  "substitution",
  "engineering",
  "administrative",
  "ppe",
];

const PERSONS_AT_RISK = [
  "employees",
  "contractors",
  "visitors",
  "public",
  "young_workers",
  "pregnant_workers",
  "disabled_persons",
];

const PPE_TYPES = [
  "hard_hat",
  "safety_glasses",
  "face_shield",
  "hearing_protection",
  "respirator",
  "gloves",
  "safety_boots",
  "high_vis_vest",
  "fall_protection",
  "coveralls",
];

const CONTROL_HIERARCHY_LEVELS = [
  { value: "elimination", color: "bg-green-500", priority: 1 },
  { value: "substitution", color: "bg-green-400", priority: 2 },
  { value: "engineering", color: "bg-yellow-500", priority: 3 },
  { value: "administrative", color: "bg-orange-500", priority: 4 },
  { value: "ppe", color: "bg-red-500", priority: 5 },
];

const getRiskScoreColor = (score: number): string => {
  if (score <= 4) return "bg-green-500 text-white";
  if (score <= 9) return "bg-yellow-500 text-white";
  if (score <= 15) return "bg-orange-500 text-white";
  return "bg-red-500 text-white";
};

export function HazardForm({
  hazard,
  index,
  onChange,
  onRemove,
  showResidual = true,
  showComplianceFields = true,
}: HazardFormProps) {
  const { t } = useTranslation();
  const initialScore = hazard.likelihood * hazard.severity;
  const residualScore = hazard.residual_likelihood * hazard.residual_severity;

  const addExistingControl = () => {
    const controls = [...hazard.existing_controls, { description: "", type: "administrative" }];
    onChange(index, "existing_controls", controls);
  };

  const updateExistingControl = (ctrlIndex: number, field: string, value: string) => {
    const controls = [...hazard.existing_controls];
    controls[ctrlIndex] = { ...controls[ctrlIndex], [field]: value };
    onChange(index, "existing_controls", controls);
  };

  const removeExistingControl = (ctrlIndex: number) => {
    const controls = hazard.existing_controls.filter((_, i) => i !== ctrlIndex);
    onChange(index, "existing_controls", controls);
  };

  const addAdditionalControl = () => {
    const controls = [...hazard.additional_controls, { description: "", responsible: "", target_date: "" }];
    onChange(index, "additional_controls", controls);
  };

  const updateAdditionalControl = (ctrlIndex: number, field: string, value: string) => {
    const controls = [...hazard.additional_controls];
    controls[ctrlIndex] = { ...controls[ctrlIndex], [field]: value };
    onChange(index, "additional_controls", controls);
  };

  const removeAdditionalControl = (ctrlIndex: number) => {
    const controls = hazard.additional_controls.filter((_, i) => i !== ctrlIndex);
    onChange(index, "additional_controls", controls);
  };

  const togglePersonAtRisk = (person: string) => {
    const current = hazard.persons_at_risk || [];
    const updated = current.includes(person)
      ? current.filter((p) => p !== person)
      : [...current, person];
    onChange(index, "persons_at_risk", updated);
  };

  const togglePPE = (ppe: string) => {
    const current = hazard.required_ppe || [];
    const updated = current.includes(ppe)
      ? current.filter((p) => p !== ppe)
      : [...current, ppe];
    onChange(index, "required_ppe", updated);
  };

  const getHierarchyLevelInfo = (level?: string) => {
    return CONTROL_HIERARCHY_LEVELS.find((h) => h.value === level);
  };

  const hierarchyLevel = getHierarchyLevelInfo(hazard.control_hierarchy_level);
  const needsJustification = hierarchyLevel && hierarchyLevel.priority >= 4;

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      {/* Header with Job Step and remove button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          {/* Job Step (OSHA JHA) */}
          {showComplianceFields && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-lg border">
              <div>
                <Label className="text-xs">{t("risk.compliance.jobStepNumber", "Step #")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={hazard.job_step_number || ""}
                  onChange={(e) => onChange(index, "job_step_number", parseInt(e.target.value) || null)}
                  placeholder="1"
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-3">
                <Label className="text-xs">{t("risk.compliance.jobStepDescription", "Job Step Description")}</Label>
                <Input
                  value={hazard.job_step_description || ""}
                  onChange={(e) => onChange(index, "job_step_description", e.target.value)}
                  placeholder={t("risk.compliance.jobStepPlaceholder", "e.g., Position ladder securely...")}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div>
            <Label>{t("risk.hazard.description", "Hazard Description")}</Label>
            <Textarea
              value={hazard.hazard_description}
              onChange={(e) => onChange(index, "hazard_description", e.target.value)}
              placeholder={t("risk.hazard.descriptionPlaceholder", "Describe the hazard...")}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>{t("risk.hazard.category", "Category")}</Label>
              <Select
                value={hazard.hazard_category}
                onValueChange={(v) => onChange(index, "hazard_category", v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HAZARD_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {t(`risk.category.${cat}`, cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Initial Risk Score */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">{t("risk.likelihood.label", "Likelihood")}</Label>
                <Select
                  value={String(hazard.likelihood)}
                  onValueChange={(v) => onChange(index, "likelihood", parseInt(v))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("risk.severity.label", "Severity")}</Label>
                <Select
                  value={String(hazard.severity)}
                  onValueChange={(v) => onChange(index, "severity", parseInt(v))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("risk.score", "Score")}</Label>
                <div className={cn("mt-1 p-2 rounded text-center font-bold", getRiskScoreColor(initialScore))}>
                  {initialScore}
                </div>
              </div>
            </div>
          </div>

          {/* Persons at Risk (ISO 45001) */}
          {showComplianceFields && (
            <div className="space-y-2 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                {t("risk.compliance.personsAtRisk", "Persons at Risk (ISO 45001)")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {PERSONS_AT_RISK.map((person) => {
                  const isSelected = hazard.persons_at_risk?.includes(person);
                  return (
                    <Badge
                      key={person}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected && "bg-blue-600 hover:bg-blue-700"
                      )}
                      onClick={() => togglePersonAtRisk(person)}
                    >
                      {t(`risk.personsAtRisk.${person}`, person.replace("_", " "))}
                    </Badge>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label className="text-xs">{t("risk.compliance.numberExposed", "Number Exposed")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={hazard.number_exposed || ""}
                  onChange={(e) => onChange(index, "number_exposed", parseInt(e.target.value) || null)}
                  placeholder="1"
                  className="w-24 h-8 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Control Hierarchy Level (ISO 45001) */}
      {showComplianceFields && (
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {t("risk.compliance.controlHierarchy", "Control Hierarchy Level")}
          </Label>
          <div className="flex flex-wrap gap-2">
            {CONTROL_HIERARCHY_LEVELS.map((level) => {
              const isSelected = hazard.control_hierarchy_level === level.value;
              return (
                <Badge
                  key={level.value}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isSelected && level.color
                  )}
                  onClick={() => onChange(index, "control_hierarchy_level", level.value)}
                >
                  {t(`risk.controlType.${level.value}`, level.value)}
                </Badge>
              );
            })}
          </div>

          {/* Justification for lower-level controls */}
          {needsJustification && (
            <div className="mt-2">
              <Label className="text-xs text-orange-600">
                {t("risk.compliance.hierarchyJustification", "Why can't higher-level controls be applied?")} *
              </Label>
              <Textarea
                value={hazard.higher_control_justification || ""}
                onChange={(e) => onChange(index, "higher_control_justification", e.target.value)}
                placeholder={t("risk.compliance.hierarchyJustificationPlaceholder", "Explain why elimination, substitution, or engineering controls are not feasible...")}
                className="mt-1 text-sm"
                rows={2}
              />
            </div>
          )}
        </div>
      )}

      {/* Existing Controls */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {t("risk.controls.existing", "Existing Controls")}
        </Label>
        {hazard.existing_controls.map((ctrl, ctrlIndex) => (
          <div key={ctrlIndex} className="flex items-center gap-2 bg-muted/50 p-2 rounded">
            <Input
              value={ctrl.description}
              onChange={(e) => updateExistingControl(ctrlIndex, "description", e.target.value)}
              placeholder={t("risk.controls.descriptionPlaceholder", "Control measure...")}
              className="flex-1"
            />
            <Select
              value={ctrl.type}
              onValueChange={(v) => updateExistingControl(ctrlIndex, "type", v)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTROL_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`risk.controlType.${type}`, type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeExistingControl(ctrlIndex)}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addExistingControl}>
          {t("risk.controls.addExisting", "+ Add Existing Control")}
        </Button>
      </div>

      {/* Additional Controls */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {t("risk.controls.additional", "Additional Controls Required")}
        </Label>
        {hazard.additional_controls.map((ctrl, ctrlIndex) => (
          <div key={ctrlIndex} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-blue-50 dark:bg-blue-950/20 p-2 rounded border border-blue-200">
            <Input
              value={ctrl.description}
              onChange={(e) => updateAdditionalControl(ctrlIndex, "description", e.target.value)}
              placeholder={t("risk.controls.descriptionPlaceholder", "Control measure...")}
              className="md:col-span-2"
            />
            <Input
              value={ctrl.responsible}
              onChange={(e) => updateAdditionalControl(ctrlIndex, "responsible", e.target.value)}
              placeholder={t("risk.controls.responsible", "Responsible person")}
            />
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={ctrl.target_date}
                onChange={(e) => updateAdditionalControl(ctrlIndex, "target_date", e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeAdditionalControl(ctrlIndex)}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addAdditionalControl}>
          {t("risk.controls.addAdditional", "+ Add Additional Control")}
        </Button>
      </div>

      {/* Required PPE (derived from hazard) */}
      {showComplianceFields && (
        <div className="space-y-2 bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <HardHat className="h-4 w-4" />
            {t("risk.compliance.requiredPPE", "Required PPE")}
          </Label>
          <div className="flex flex-wrap gap-2">
            {PPE_TYPES.map((ppe) => {
              const isSelected = hazard.required_ppe?.includes(ppe);
              return (
                <div key={ppe} className="flex items-center space-x-2">
                  <Checkbox
                    id={`ppe-${index}-${ppe}`}
                    checked={isSelected}
                    onCheckedChange={() => togglePPE(ppe)}
                  />
                  <label
                    htmlFor={`ppe-${index}-${ppe}`}
                    className="text-sm cursor-pointer"
                  >
                    {t(`risk.ppe.${ppe}`, ppe.replace("_", " "))}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Residual Risk */}
      {showResidual && (
        <div className="bg-muted/50 p-3 rounded space-y-2">
          <Label className="text-sm font-medium">
            {t("risk.residual.title", "Residual Risk (After Controls)")}
          </Label>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">{t("risk.likelihood.label", "Likelihood")}</Label>
              <Select
                value={String(hazard.residual_likelihood)}
                onValueChange={(v) => onChange(index, "residual_likelihood", parseInt(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t("risk.severity.label", "Severity")}</Label>
              <Select
                value={String(hazard.residual_severity)}
                onValueChange={(v) => onChange(index, "residual_severity", parseInt(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t("risk.score", "Residual Score")}</Label>
              <div className={cn("mt-1 p-2 rounded text-center font-bold", getRiskScoreColor(residualScore))}>
                {residualScore}
              </div>
            </div>
            <div>
              <Label className="text-xs">{t("risk.compliance.riskReduction", "Reduction")}</Label>
              <div className="mt-1 p-2 rounded text-center font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                {initialScore > 0 ? `-${Math.round(((initialScore - residualScore) / initialScore) * 100)}%` : "0%"}
              </div>
            </div>
          </div>

          {/* Control Implementation Status */}
          {showComplianceFields && (
            <div className="mt-3">
              <Label className="text-xs">{t("risk.compliance.controlStatus", "Implementation Status")}</Label>
              <Select
                value={hazard.control_status || "pending"}
                onValueChange={(v) => onChange(index, "control_status", v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t("risk.controlStatus.pending", "Pending")}</SelectItem>
                  <SelectItem value="in_progress">{t("risk.controlStatus.inProgress", "In Progress")}</SelectItem>
                  <SelectItem value="implemented">{t("risk.controlStatus.implemented", "Implemented")}</SelectItem>
                  <SelectItem value="verified">{t("risk.controlStatus.verified", "Verified")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
