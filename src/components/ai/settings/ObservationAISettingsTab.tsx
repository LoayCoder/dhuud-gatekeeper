import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { useAISettings, type ObservationAISettings, DEFAULT_OBSERVATION_SETTINGS } from "@/hooks/use-ai-settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ObservationAISettingsTab() {
  const { t } = useTranslation();
  const { settings, isLoading, updateSettings, isUpdating } = useAISettings("observation");
  const [localSettings, setLocalSettings] = useState<ObservationAISettings>(DEFAULT_OBSERVATION_SETTINGS);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings as ObservationAISettings);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings(localSettings);
  };

  const updateNestedSetting = <K extends keyof ObservationAISettings>(
    section: K,
    key: keyof ObservationAISettings[K],
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
          <CardTitle>{t("admin.ai.observation.rewriteRules", "Rewrite & Translation Rules")}</CardTitle>
          <CardDescription>
            {t("admin.ai.observation.rewriteDesc", "Configure how AI processes observation text")}
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
          <CardTitle>{t("admin.ai.observation.classification", "Classification Settings")}</CardTitle>
          <CardDescription>
            {t("admin.ai.observation.classificationDesc", "Configure automatic observation classification")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="positive-negative" className="flex-1">
              {t("admin.ai.enablePositiveNegative", "Enable Positive/Negative Classification")}
            </Label>
            <Switch
              id="positive-negative"
              checked={localSettings.classification.enable_positive_negative}
              onCheckedChange={(checked) =>
                updateNestedSetting("classification", "enable_positive_negative", checked)
              }
            />
          </div>

          <div className="rounded-md bg-muted/50 p-3">
            <Label className="text-sm font-medium">
              {t("admin.ai.observationTypes", "Observation Types (System Defined)")}
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {localSettings.classification.observation_types.map((type) => (
                <span
                  key={type}
                  className="rounded-full bg-background px-3 py-1 text-xs border"
                >
                  {t(`observations.types.${type}`, type.replace(/_/g, " "))}
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
                  {t(`severity.${level}`, level.replace(/_/g, " "))}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tagging Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.ai.observation.tagging", "Tagging Settings")}</CardTitle>
          <CardDescription>
            {t("admin.ai.observation.taggingDesc", "Configure automatic tag application")}
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
