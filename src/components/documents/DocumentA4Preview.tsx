import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { DocumentBrandingSettings, LogoPosition } from "@/types/document-branding";

interface DocumentA4PreviewProps {
  settings: Partial<DocumentBrandingSettings>;
  logoUrl: string | null;
  tenantName: string;
}

export function DocumentA4Preview({ settings, logoUrl, tenantName }: DocumentA4PreviewProps) {
  const { t } = useTranslation();

  const getLogoAlignment = (position: LogoPosition): string => {
    switch (position) {
      case "center":
        return "justify-center";
      case "right":
        return "justify-end";
      default:
        return "justify-start";
    }
  };

  const getTextAlignment = (position: LogoPosition): string => {
    switch (position) {
      case "center":
        return "text-center";
      case "right":
        return "text-end";
      default:
        return "text-start";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-medium mb-3">{t("documentSettings.preview.title")}</h3>
      
      {/* A4 Preview Container - scaled representation */}
      <div
        className="relative bg-white border border-border rounded-lg shadow-sm overflow-hidden flex-1"
        style={{
          aspectRatio: "210 / 297", // A4 aspect ratio
          maxHeight: "600px",
        }}
      >
        {/* Watermark Overlay */}
        {settings.watermarkEnabled && settings.watermarkText && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            style={{
              transform: "rotate(-45deg)",
              opacity: (settings.watermarkOpacity || 15) / 100,
            }}
          >
            <span
              className="text-4xl font-bold text-muted-foreground whitespace-nowrap tracking-widest"
              style={{ letterSpacing: "0.3em" }}
            >
              {settings.watermarkText}
            </span>
          </div>
        )}

        {/* Header Section */}
        <div
          className="px-4 py-3 border-b"
          style={{
            backgroundColor: settings.headerBgColor || "#ffffff",
          }}
        >
          <div className={`flex items-center gap-3 ${getLogoAlignment(settings.headerLogoPosition || "left")}`}>
            {/* Logo */}
            {settings.showLogo !== false && (
              <div className="shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-8 w-auto object-contain"
                  />
                ) : (
                  <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Logo</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Header Text */}
            <div className={getTextAlignment(settings.headerLogoPosition || "left")}>
              <div
                className="font-semibold text-sm"
                style={{ color: settings.headerTextColor || "#1f2937" }}
              >
                {settings.headerTextPrimary || "HSSE Department"}
              </div>
              {settings.headerTextSecondary && (
                <div
                  className="text-xs"
                  style={{ color: settings.headerTextColor || "#1f2937", opacity: 0.7 }}
                >
                  {settings.headerTextSecondary}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document Title */}
        <div className="px-4 py-4 text-center border-b">
          <h2 className="font-bold text-base text-foreground">
            {t("documentSettings.preview.sampleTitle")}
          </h2>
        </div>

        {/* Sample Content */}
        <div className="px-4 py-4 flex-1">
          <div className="space-y-3">
            {/* Sample Table */}
            <div className="border rounded text-xs">
              <div className="grid grid-cols-2 border-b">
                <div className="bg-muted px-2 py-1 font-medium">
                  {t("documentSettings.preview.fieldLabel")}
                </div>
                <div className="px-2 py-1">{t("documentSettings.preview.fieldValue")}</div>
              </div>
              <div className="grid grid-cols-2 border-b">
                <div className="bg-muted px-2 py-1 font-medium">
                  {t("documentSettings.preview.dateLabel")}
                </div>
                <div className="px-2 py-1">{format(new Date(), "PPP")}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="bg-muted px-2 py-1 font-medium">
                  {t("documentSettings.preview.locationLabel")}
                </div>
                <div className="px-2 py-1">{t("documentSettings.preview.locationValue")}</div>
              </div>
            </div>

            {/* Sample Paragraph Lines */}
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded w-full" />
              <div className="h-2 bg-muted rounded w-11/12" />
              <div className="h-2 bg-muted rounded w-10/12" />
              <div className="h-2 bg-muted rounded w-full" />
              <div className="h-2 bg-muted rounded w-9/12" />
            </div>

            {/* Sample Signature Area */}
            <div className="pt-4 mt-auto">
              <div className="flex justify-between text-xs text-muted-foreground">
                <div>
                  <span>{t("documentSettings.preview.signature")}</span>
                  <div className="w-24 border-b border-muted-foreground/30 mt-4" />
                </div>
                <div>
                  <span>{t("documentSettings.preview.date")}</span>
                  <div className="w-20 border-b border-muted-foreground/30 mt-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div
          className="px-4 py-2 border-t text-xs flex items-center justify-between absolute bottom-0 left-0 right-0"
          style={{
            backgroundColor: settings.footerBgColor || "#f3f4f6",
            color: settings.footerTextColor || "#6b7280",
          }}
        >
          <span className="truncate flex-1">
            {settings.footerText || "Confidential - Generated by Dhuud Gatekeeper"}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {settings.showPageNumbers !== false && (
              <span>{t("documentSettings.preview.pageNumber", { page: 1 })}</span>
            )}
            {settings.showDatePrinted !== false && (
              <span>{format(new Date(), "PP")}</span>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-2 text-center">
        {t("documentSettings.preview.hint")}
      </p>
    </div>
  );
}
