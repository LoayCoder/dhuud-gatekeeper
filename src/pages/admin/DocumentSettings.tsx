import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDocumentBranding } from "@/hooks/use-document-branding";
import { DocumentA4Preview } from "@/components/documents/DocumentA4Preview";
import { DocumentBrandingSettings, LogoPosition, DEFAULT_DOCUMENT_SETTINGS } from "@/types/document-branding";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, FileText, RotateCcw } from "lucide-react";

export default function DocumentSettings() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const {
    settings: savedSettings,
    isLoading,
    updateSettings,
    isUpdating,
    logoUrl,
    tenantName,
  } = useDocumentBranding();

  // Local form state
  const [formState, setFormState] = useState<Partial<DocumentBrandingSettings>>(DEFAULT_DOCUMENT_SETTINGS);

  // Sync form state with saved settings
  useEffect(() => {
    if (savedSettings) {
      setFormState(savedSettings);
    }
  }, [savedSettings]);

  const handleSave = () => {
    updateSettings(formState);
  };

  const handleReset = () => {
    setFormState(DEFAULT_DOCUMENT_SETTINGS);
  };

  const updateField = <K extends keyof DocumentBrandingSettings>(
    field: K,
    value: DocumentBrandingSettings[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            {t("documentSettings.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("documentSettings.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 me-2" />
            {t("documentSettings.reset")}
          </Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            <Save className="h-4 w-4 me-2" />
            {isUpdating ? t("common.saving") : t("documentSettings.save")}
          </Button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Controls */}
        <Card>
          <CardHeader>
            <CardTitle>{t("documentSettings.configuration")}</CardTitle>
            <CardDescription>{t("documentSettings.configurationHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="header" dir={direction}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="header">{t("documentSettings.tabs.header")}</TabsTrigger>
                <TabsTrigger value="footer">{t("documentSettings.tabs.footer")}</TabsTrigger>
                <TabsTrigger value="watermark">{t("documentSettings.tabs.watermark")}</TabsTrigger>
              </TabsList>

              {/* Header Tab */}
              <TabsContent value="header" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{t("documentSettings.header.primaryText")}</Label>
                  <Input
                    value={formState.headerTextPrimary || ""}
                    onChange={(e) => updateField("headerTextPrimary", e.target.value)}
                    placeholder={t("documentSettings.header.primaryTextPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("documentSettings.header.secondaryText")}</Label>
                  <Input
                    value={formState.headerTextSecondary || ""}
                    onChange={(e) => updateField("headerTextSecondary", e.target.value || null)}
                    placeholder={t("documentSettings.header.secondaryTextPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("documentSettings.header.logoPosition")}</Label>
                  <RadioGroup
                    value={formState.headerLogoPosition || "left"}
                    onValueChange={(value) => updateField("headerLogoPosition", value as LogoPosition)}
                    className="flex gap-4"
                    dir={direction}
                  >
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="left" id="pos-left" />
                      <Label htmlFor="pos-left" className="font-normal">
                        {t("documentSettings.header.positionLeft")}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="center" id="pos-center" />
                      <Label htmlFor="pos-center" className="font-normal">
                        {t("documentSettings.header.positionCenter")}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="right" id="pos-right" />
                      <Label htmlFor="pos-right" className="font-normal">
                        {t("documentSettings.header.positionRight")}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex items-center justify-between">
                  <Label>{t("documentSettings.header.showLogo")}</Label>
                  <Switch
                    checked={formState.showLogo !== false}
                    onCheckedChange={(checked) => updateField("showLogo", checked)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("documentSettings.header.bgColor")}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formState.headerBgColor || "#ffffff"}
                        onChange={(e) => updateField("headerBgColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={formState.headerBgColor || "#ffffff"}
                        onChange={(e) => updateField("headerBgColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("documentSettings.header.textColor")}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formState.headerTextColor || "#1f2937"}
                        onChange={(e) => updateField("headerTextColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={formState.headerTextColor || "#1f2937"}
                        onChange={(e) => updateField("headerTextColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Footer Tab */}
              <TabsContent value="footer" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{t("documentSettings.footer.text")}</Label>
                  <Input
                    value={formState.footerText || ""}
                    onChange={(e) => updateField("footerText", e.target.value)}
                    placeholder={t("documentSettings.footer.textPlaceholder")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>{t("documentSettings.footer.showPageNumbers")}</Label>
                  <Switch
                    checked={formState.showPageNumbers !== false}
                    onCheckedChange={(checked) => updateField("showPageNumbers", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>{t("documentSettings.footer.showDatePrinted")}</Label>
                  <Switch
                    checked={formState.showDatePrinted !== false}
                    onCheckedChange={(checked) => updateField("showDatePrinted", checked)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("documentSettings.footer.bgColor")}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formState.footerBgColor || "#f3f4f6"}
                        onChange={(e) => updateField("footerBgColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={formState.footerBgColor || "#f3f4f6"}
                        onChange={(e) => updateField("footerBgColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("documentSettings.footer.textColor")}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formState.footerTextColor || "#6b7280"}
                        onChange={(e) => updateField("footerTextColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={formState.footerTextColor || "#6b7280"}
                        onChange={(e) => updateField("footerTextColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Watermark Tab */}
              <TabsContent value="watermark" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label>{t("documentSettings.watermark.enabled")}</Label>
                  <Switch
                    checked={formState.watermarkEnabled || false}
                    onCheckedChange={(checked) => updateField("watermarkEnabled", checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("documentSettings.watermark.text")}</Label>
                  <Input
                    value={formState.watermarkText || ""}
                    onChange={(e) => updateField("watermarkText", e.target.value || null)}
                    placeholder={t("documentSettings.watermark.textPlaceholder")}
                    disabled={!formState.watermarkEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("documentSettings.watermark.opacity")}</Label>
                    <span className="text-sm text-muted-foreground">
                      {formState.watermarkOpacity || 15}%
                    </span>
                  </div>
                  <Slider
                    value={[formState.watermarkOpacity || 15]}
                    onValueChange={([value]) => updateField("watermarkOpacity", value)}
                    min={5}
                    max={50}
                    step={5}
                    disabled={!formState.watermarkEnabled}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Right Column: Live Preview */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>{t("documentSettings.preview.title")}</CardTitle>
            <CardDescription>{t("documentSettings.preview.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <DocumentA4Preview
              settings={formState}
              logoUrl={logoUrl}
              tenantName={tenantName}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
