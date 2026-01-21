import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePurchaseRequestPDF, PurchaseRequestPDFLanguage } from "@/hooks/use-purchase-request-pdf";

interface PurchaseRequestPDFExportButtonProps {
  requestId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const languageOptions: { code: PurchaseRequestPDFLanguage; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export function PurchaseRequestPDFExportButton({
  requestId,
  variant = 'outline',
  size = 'sm',
}: PurchaseRequestPDFExportButtonProps) {
  const { t } = useTranslation();
  const { generatePDF, isGenerating, isLoading } = usePurchaseRequestPDF(requestId);
  const [selectedLanguage, setSelectedLanguage] = useState<PurchaseRequestPDFLanguage | null>(null);

  const handleExport = async (language: PurchaseRequestPDFLanguage) => {
    setSelectedLanguage(language);
    try {
      await generatePDF({
        primaryLanguage: language,
        showQR: true,
        includeApprovalHistory: true,
      });
      toast.success(t("common.exportSuccess", "PDF exported successfully"));
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error(t("common.exportError", "Failed to export PDF"));
    } finally {
      setSelectedLanguage(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isGenerating || isLoading}>
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin me-2" />
          ) : (
            <FileDown className="h-4 w-4 me-2" />
          )}
          {t("common.exportPDF", "Export PDF")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languageOptions.map((option) => (
          <DropdownMenuItem
            key={option.code}
            onClick={() => handleExport(option.code)}
            disabled={isGenerating}
          >
            <span className="me-2">{option.flag}</span>
            {option.label}
            {isGenerating && selectedLanguage === option.code && (
              <Loader2 className="h-3 w-3 animate-spin ms-2" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
