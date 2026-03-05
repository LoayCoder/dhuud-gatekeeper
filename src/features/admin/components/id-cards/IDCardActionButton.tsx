import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  CreditCard, 
  Download, 
  Printer, 
  Send, 
  Eye,
  Loader2,
  ChevronDown
} from "lucide-react";
import { IDCardPreviewDialog } from "./IDCardPreviewDialog";
import { useIDCardGenerator } from "@/hooks/use-id-card-generator";
import { useIDCardSettingsByType } from "@/hooks/use-id-card-settings";
import { useCachedProfile } from "@/hooks/use-cached-profile";
import type { 
  IDCardType, 
  IDCardPersonData, 
  IDCardTenantData,
  TenantIDCardSettings
} from "@/types/id-card.types";
import { toast } from "sonner";

interface IDCardActionButtonProps {
  cardType: IDCardType;
  entityId: string;
  personData: IDCardPersonData;
  tenantId: string;
  tenantData?: IDCardTenantData;
  recipientPhone?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  onSent?: () => void;
}

export function IDCardActionButton({
  cardType,
  entityId,
  personData,
  tenantId,
  tenantData: providedTenantData,
  recipientPhone,
  variant = "outline",
  size = "sm",
  showLabel = true,
  onSent,
}: IDCardActionButtonProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [showPreview, setShowPreview] = useState(false);
  const [isQuickSending, setIsQuickSending] = useState(false);
  
  const cachedProfile = useCachedProfile();
  const { data: settings, isLoading: settingsLoading } = useIDCardSettingsByType(tenantId, cardType);
  const { generateCard, sendViaWhatsApp, isGenerating } = useIDCardGenerator();

  // Default tenant data if not provided
  const tenantData: IDCardTenantData = providedTenantData || {
    id: tenantId,
    name: '',
    nameAr: '',
    logoUrl: undefined,
  };

  // Default settings if not loaded
  const cardSettings: TenantIDCardSettings = (settings as TenantIDCardSettings) || {
    id: '',
    tenant_id: tenantId,
    card_type: cardType,
    front_bg_color: '#FFFFFF',
    front_accent_color: '#1e40af',
    front_text_color: '#1f2937',
    show_photo: true,
    show_qr_code: true,
    qr_position: 'right',
    front_fields: ['full_name', 'company', 'role', 'valid_until'],
    back_enabled: false,
    back_bg_color: '#f3f4f6',
    back_fields: ['emergency_contact', 'safety_instructions'],
    back_custom_text: null,
    back_custom_text_ar: null,
    card_orientation: 'landscape',
    show_logo: true,
    logo_position: 'top-left',
    show_tenant_name: true,
    template_preset: 'standard',
    is_active: true,
    created_at: '',
    updated_at: '',
  };

  const handleQuickSend = useCallback(async () => {
    if (!recipientPhone) {
      toast.error(t("idCard.noPhone", "No phone number available"));
      return;
    }

    setIsQuickSending(true);
    try {
      const result = await generateCard({
        cardType,
        entityId,
        tenantId,
        personData,
        tenantData,
        language: isRTL ? 'ar' : 'en',
        saveToStorage: true,
      });

      if (result.success && result.frontImageUrl) {
        const sent = await sendViaWhatsApp(
          cardType,
          entityId,
          tenantId,
          recipientPhone,
          result.frontImageUrl
        );
        
        if (sent) {
          onSent?.();
        }
      } else {
        toast.error(result.error || t("idCard.sendError", "Failed to generate card"));
      }
    } finally {
      setIsQuickSending(false);
    }
  }, [cardType, entityId, tenantId, personData, tenantData, recipientPhone, isRTL, generateCard, sendViaWhatsApp, onSent, t]);

  const isLoading = settingsLoading || isGenerating || isQuickSending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {showLabel && (
              <>
                <span className="ms-1">{t("idCard.idCard", "ID Card")}</span>
                <ChevronDown className="h-3 w-3 ms-1" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 me-2" />
            {t("idCard.preview.title", "Preview Card")}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {recipientPhone && (
            <DropdownMenuItem onClick={handleQuickSend} disabled={isQuickSending}>
              <Send className="h-4 w-4 me-2" />
              {t("idCard.sendWhatsApp", "Send via WhatsApp")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <IDCardPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        cardType={cardType}
        personData={personData}
        tenantData={tenantData}
        settings={cardSettings}
        entityId={entityId}
        recipientPhone={recipientPhone}
      />
    </>
  );
}

export default IDCardActionButton;
