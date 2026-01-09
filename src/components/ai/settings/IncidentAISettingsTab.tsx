import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { useAISettings, type IncidentAISettings, DEFAULT_INCIDENT_SETTINGS } from "@/hooks/use-ai-settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function IncidentAISettingsTab() {
  const { t } = useTranslation();
  const { settings, isLoading, updateSettings, isUpdating } = useAISettings("incident");
  const [localSettings, setLocalSettings] = useState<IncidentAISettings>(DEFAULT_INCIDENT_SETTINGS);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings as IncidentAISettings);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings(localSettings);
  };

  const updateNestedSetting = <K extends keyof IncidentAISettings>(
    section: K,
    key: keyof IncidentAISettings[K],
    value: boolean | string
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rewrite & Translation Rules */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.ai.incident.rewriteRules", "Rewrite & Translation Rules")}</CardTitle>
          <CardDescription>
            {t("admin.ai.incident.rewriteDesc", "Configure how AI processes incident text")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-translation" className="flex-1">
              {t("admin.ai.enableTranslation", "Enable Translation to English")}
            </Label>
            <Switch
              id="enable-translation"
              checked={localSettings.rewrite_rules.enable_translation}
              onCheckedChange={(checked) =>
                updateNestedSetting("rewrite_rules", "enable_translation", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="rewrite-title" className="flex-1">
              {t("admin.ai.rewriteTitle", "Rewrite Title Professionally")}
            </Label>
            <Switch
              id="rewrite-title"
              checked={localSettings.rewrite_rules.rewrite_title}
              onCheckedChange={(checked) =>
                updateNestedSetting("rewrite_rules", "rewrite_title", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="rewrite-description" className="flex-1">
              {t("admin.ai.rewriteDescription", "Rewrite Description Professionally")}
            </Label>
            <Switch
              id="rewrite-description"
              checked={localSettings.rewrite_rules.rewrite_description}
              onCheckedChange={(checked) =>
                updateNestedSetting("rewrite_rules", "rewrite_description", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="target-language" className="flex-1">
              {t("admin.ai.targetLanguage", "Target Language")}
            </Label>
            <Select
              value={localSettings.rewrite_rules.target_language}
              onValueChange={(value) =>
                updateNestedSetting("rewrite_rules", "target_language", value)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Classification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.ai.incident.classification", "Classification Settings")}</CardTitle>
          <CardDescription>
            {t("admin.ai.incident.classificationDesc", "Configure automatic incident classification")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted/50 p-3">
            <Label className="text-sm font-medium">
              {t("admin.ai.incidentTypes", "Incident Types (System Defined)")}
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {localSettings.classification.incident_types.map((type) => (
                <span
                  key={type}
                  className="rounded-full bg-background px-3 py-1 text-xs border"
                >
                  {t(`incidents.hsseEventTypes.${type}`, type)}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-3">
            <Label className="text-sm font-medium">
              {t("admin.ai.severityLevels", "Severity Levels (System Defined)")}
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {localSettings.classification.severity_levels.map((level) => (
                <span
                  key={level}
                  className="rounded-full bg-background px-3 py-1 text-xs border"
                >
                  {t(`severity.${level}.label`, level.replace(/_/g, " "))}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Injury Extraction */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.ai.incident.injuryExtraction", "Injury Extraction")}</CardTitle>
          <CardDescription>
            {t("admin.ai.incident.injuryDesc", "Configure automatic injury information extraction")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="injury-enabled" className="flex-1">
              {t("admin.ai.enableInjuryExtraction", "Enable Injury Detection")}
            </Label>
            <Switch
              id="injury-enabled"
              checked={localSettings.injury_extraction.enabled}
              onCheckedChange={(checked) =>
                updateNestedSetting("injury_extraction", "enabled", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-fill-count" className="flex-1">
              {t("admin.ai.autoFillInjuryCount", "Auto-fill Injury Count")}
            </Label>
            <Switch
              id="auto-fill-count"
              checked={localSettings.injury_extraction.auto_fill_count}
              disabled={!localSettings.injury_extraction.enabled}
              onCheckedChange={(checked) =>
                updateNestedSetting("injury_extraction", "auto_fill_count", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-fill-type" className="flex-1">
              {t("admin.ai.autoFillInjuryType", "Auto-fill Injury Type")}
            </Label>
            <Switch
              id="auto-fill-type"
              checked={localSettings.injury_extraction.auto_fill_type}
              disabled={!localSettings.injury_extraction.enabled}
              onCheckedChange={(checked) =>
                updateNestedSetting("injury_extraction", "auto_fill_type", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Property Damage Extraction */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.ai.incident.damageExtraction", "Property Damage Extraction")}</CardTitle>
          <CardDescription>
            {t("admin.ai.incident.damageDesc", "Configure automatic property damage detection")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="damage-enabled" className="flex-1">
              {t("admin.ai.enableDamageExtraction", "Enable Damage Detection")}
            </Label>
            <Switch
              id="damage-enabled"
              checked={localSettings.damage_extraction.enabled}
              onCheckedChange={(checked) =>
                updateNestedSetting("damage_extraction", "enabled", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-fill-category" className="flex-1">
              {t("admin.ai.autoFillDamageCategory", "Auto-fill Damage Category")}
            </Label>
            <Switch
              id="auto-fill-category"
              checked={localSettings.damage_extraction.auto_fill_category}
              disabled={!localSettings.damage_extraction.enabled}
              onCheckedChange={(checked) =>
                updateNestedSetting("damage_extraction", "auto_fill_category", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Tagging Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.ai.incident.tagging", "Tagging Settings")}</CardTitle>
          <CardDescription>
            {t("admin.ai.incident.taggingDesc", "Configure automatic tag application")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="tagging-enabled" className="flex-1">
              {t("admin.ai.enableTagging", "Enable AI Tagging")}
            </Label>
            <Switch
              id="tagging-enabled"
              checked={localSettings.tagging.enabled}
              onCheckedChange={(checked) =>
                updateNestedSetting("tagging", "enabled", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-apply" className="flex-1">
              {t("admin.ai.autoApplyTags", "Auto-apply Suggested Tags")}
            </Label>
            <Switch
              id="auto-apply"
              checked={localSettings.tagging.auto_apply}
              disabled={!localSettings.tagging.enabled}
              onCheckedChange={(checked) =>
                updateNestedSetting("tagging", "auto_apply", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="me-2 h-4 w-4" />
          )}
          {t("common.save", "Save Settings")}
        </Button>
      </div>
    </div>
  );
}
