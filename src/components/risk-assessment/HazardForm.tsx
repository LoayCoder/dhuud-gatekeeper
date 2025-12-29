import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
}

interface HazardFormProps {
  hazard: HazardFormData;
  index: number;
  onChange: (index: number, field: string, value: unknown) => void;
  onRemove: (index: number) => void;
  showResidual?: boolean;
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

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      {/* Header with remove button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
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

      {/* Residual Risk */}
      {showResidual && (
        <div className="bg-muted/50 p-3 rounded space-y-2">
          <Label className="text-sm font-medium">
            {t("risk.residual.title", "Residual Risk (After Controls)")}
          </Label>
          <div className="grid grid-cols-3 gap-2">
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
          </div>
        </div>
      )}
    </div>
  );
}
