import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  Printer, 
  Send, 
  Loader2, 
  RotateCcw,
  CreditCard,
  Smartphone
} from "lucide-react";
import { IDCardTemplate } from "./IDCardTemplate";
import { useIDCardGenerator } from "@/hooks/use-id-card-generator";
import type { 
  IDCardType, 
  IDCardPersonData, 
  IDCardTenantData, 
  TenantIDCardSettings 
} from "@/types/id-card.types";
import { CARD_TYPE_LABELS } from "@/types/id-card.types";
import { toast } from "sonner";

interface IDCardPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardType: IDCardType;
  personData: IDCardPersonData;
  tenantData: IDCardTenantData;
  settings: TenantIDCardSettings;
  entityId: string;
  recipientPhone?: string;
  onResend?: () => void;
  isResending?: boolean;
}

export function IDCardPreviewDialog({
  open,
  onOpenChange,
  cardType,
  personData,
  tenantData,
  settings,
  entityId,
  recipientPhone,
  onResend,
  isResending,
}: IDCardPreviewDialogProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [language, setLanguage] = useState<'en' | 'ar'>(isRTL ? 'ar' : 'en');
  const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  
  const { 
    generateCard, 
    downloadCard, 
    printCard, 
    sendViaWhatsApp,
    isGenerating,
    isSending 
  } = useIDCardGenerator();

  const cardTypeLabel = CARD_TYPE_LABELS[cardType][language];

  const handleDownload = async () => {
    const result = await generateCard({
      cardType,
      entityId,
      tenantId: tenantData.id,
      personData,
      tenantData,
      language,
      saveToStorage: false,
    });

    if (result.success && result.frontImageUrl) {
      downloadCard(result.frontImageUrl, `${cardType}-${personData.fullName.replace(/\s+/g, '-')}-front.png`);
      
      if (result.backImageUrl) {
        setTimeout(() => {
          downloadCard(result.backImageUrl!, `${cardType}-${personData.fullName.replace(/\s+/g, '-')}-back.png`);
        }, 500);
      }
      
      toast.success(t("idCard.downloadSuccess", "ID card downloaded"));
    } else {
      toast.error(result.error || t("idCard.downloadError", "Failed to download"));
    }
  };

  const handlePrint = async () => {
    const result = await generateCard({
      cardType,
      entityId,
      tenantId: tenantData.id,
      personData,
      tenantData,
      language,
      saveToStorage: false,
    });

    if (result.success && result.frontImageUrl) {
      printCard(result.frontImageUrl, result.backImageUrl);
    } else {
      toast.error(result.error || t("idCard.printError", "Failed to prepare print"));
    }
  };

  const handleSendWhatsApp = async () => {
    if (!recipientPhone) {
      toast.error(t("idCard.noPhone", "No phone number available"));
      return;
    }

    const result = await generateCard({
      cardType,
      entityId,
      tenantId: tenantData.id,
      personData,
      tenantData,
      language,
      saveToStorage: true,
    });

    if (result.success && result.frontImageUrl) {
      await sendViaWhatsApp(
        cardType,
        entityId,
        tenantData.id,
        recipientPhone,
        result.frontImageUrl
      );
    } else {
      toast.error(result.error || t("idCard.sendError", "Failed to send"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("idCard.preview.title", "ID Card Preview")} - {cardTypeLabel}
          </DialogTitle>
          <DialogDescription>
            {t("idCard.preview.description", "Preview, download, print, or send the ID card")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Language Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={language === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('en')}
              >
                🇬🇧 English
              </Button>
              <Button
                variant={language === 'ar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('ar')}
              >
                🇸🇦 العربية
              </Button>
            </div>
            
            {onResend && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResend}
                disabled={isResending}
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 me-1 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 me-1" />
                )}
                {t("idCard.resend", "Resend Card")}
              </Button>
            )}
          </div>

          {/* Card Preview Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'front' | 'back')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="front">
                {t("idCard.frontSide", "Front Side")}
              </TabsTrigger>
              <TabsTrigger value="back" disabled={!settings.back_enabled}>
                {t("idCard.backSide", "Back Side")}
                {!settings.back_enabled && ` (${t("common.disabled", "Disabled")})`}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="front" className="flex justify-center py-4">
              <div ref={frontRef} className="inline-block">
                <IDCardTemplate
                  cardType={cardType}
                  personData={personData}
                  tenantData={tenantData}
                  settings={settings}
                  side="front"
                  language={language}
                  scale={1.5}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="back" className="flex justify-center py-4">
              {settings.back_enabled && (
                <div ref={backRef} className="inline-block">
                  <IDCardTemplate
                    cardType={cardType}
                    personData={personData}
                    tenantData={tenantData}
                    settings={settings}
                    side="back"
                    language={language}
                    scale={1.5}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-center pt-4 border-t">
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex-1 min-w-[140px]"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 me-2" />
              )}
              {t("idCard.download", "Download PNG")}
            </Button>
            
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={isGenerating}
              className="flex-1 min-w-[140px]"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 me-2" />
              )}
              {t("idCard.print", "Print Card")}
            </Button>
            
            {recipientPhone && (
              <Button
                variant="secondary"
                onClick={handleSendWhatsApp}
                disabled={isGenerating || isSending}
                className="flex-1 min-w-[140px]"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Smartphone className="h-4 w-4 me-2" />
                )}
                {t("idCard.sendWhatsApp", "Send via WhatsApp")}
              </Button>
            )}
          </div>

          {/* Save to Device Hint */}
          <p className="text-xs text-center text-muted-foreground">
            {t("idCard.saveHint", "Recipients can save this card to their device or Apple/Google Wallet")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default IDCardPreviewDialog;
