import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import html2canvas from "html2canvas";
import type { 
  IDCardType, 
  IDCardPersonData, 
  IDCardTenantData,
  TenantIDCardSettings,
  IDCardGenerateResult 
} from "@/types/id-card.types";
import { fetchIDCardSettings } from "./use-id-card-settings";

interface GenerateCardOptions {
  cardType: IDCardType;
  entityId: string;
  tenantId: string;
  personData: IDCardPersonData;
  tenantData: IDCardTenantData;
  language?: 'en' | 'ar';
  saveToStorage?: boolean;
  sendViaWhatsApp?: boolean;
  recipientPhone?: string;
}

export function useIDCardGenerator() {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const generateCardImage = useCallback(async (
    container: HTMLElement,
    options: { scale?: number; backgroundColor?: string } = {}
  ): Promise<string | null> => {
    try {
      const canvas = await html2canvas(container, {
        scale: options.scale || 3, // High resolution for print
        backgroundColor: options.backgroundColor || '#FFFFFF',
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      return canvas.toDataURL('image/png', 1.0);
    } catch (error) {
      console.error('Error generating card image:', error);
      return null;
    }
  }, []);

  const uploadToStorage = useCallback(async (
    dataUrl: string,
    path: string
  ): Promise<string | null> => {
    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('id-cards')
        .upload(path, blob, {
          contentType: 'image/png',
          upsert: true,
        });

      if (error) {
        console.error('Storage upload error:', error);
        return null;
      }

      // Get signed URL (valid for 1 year)
      const { data: signedData } = await supabase.storage
        .from('id-cards')
        .createSignedUrl(data.path, 365 * 24 * 60 * 60);

      return signedData?.signedUrl || null;
    } catch (error) {
      console.error('Error uploading to storage:', error);
      return null;
    }
  }, []);

  const generateCard = useCallback(async (
    options: GenerateCardOptions
  ): Promise<IDCardGenerateResult> => {
    setIsGenerating(true);

    try {
      // Fetch card settings
      const settings = await fetchIDCardSettings(options.tenantId, options.cardType);
      
      if (!settings) {
        return { success: false, error: 'Failed to fetch card settings' };
      }

      // Import the template renderer dynamically
      const { renderIDCardToHTML } = await import('./id-card-html-renderer');
      
      // Create temporary container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      const language = options.language || 'en';
      const result: IDCardGenerateResult = { success: true };

      try {
        // Render and capture front side
        container.innerHTML = renderIDCardToHTML({
          cardType: options.cardType,
          personData: options.personData,
          tenantData: options.tenantData,
          settings: settings as TenantIDCardSettings,
          side: 'front',
          language,
        });

        const frontImage = await generateCardImage(container.firstElementChild as HTMLElement);
        
        if (frontImage && options.saveToStorage) {
          const frontPath = `${options.tenantId}/${options.cardType}/${options.entityId}_front.png`;
          result.frontImageUrl = await uploadToStorage(frontImage, frontPath) || undefined;
          result.frontImagePath = frontPath;
        } else if (frontImage) {
          result.frontImageUrl = frontImage;
        }

        // Render and capture back side if enabled
        if (settings.back_enabled) {
          container.innerHTML = renderIDCardToHTML({
            cardType: options.cardType,
            personData: options.personData,
            tenantData: options.tenantData,
            settings: settings as TenantIDCardSettings,
            side: 'back',
            language,
          });

          const backImage = await generateCardImage(container.firstElementChild as HTMLElement);
          
          if (backImage && options.saveToStorage) {
            const backPath = `${options.tenantId}/${options.cardType}/${options.entityId}_back.png`;
            result.backImageUrl = await uploadToStorage(backImage, backPath) || undefined;
            result.backImagePath = backPath;
          } else if (backImage) {
            result.backImageUrl = backImage;
          }
        }

        return result;
      } finally {
        document.body.removeChild(container);
      }
    } catch (error) {
      console.error('Error generating ID card:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setIsGenerating(false);
    }
  }, [generateCardImage, uploadToStorage]);

  const downloadCard = useCallback((
    dataUrl: string,
    filename: string
  ) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }, []);

  const printCard = useCallback((
    frontDataUrl: string,
    backDataUrl?: string
  ) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(t("idCard.printError", "Could not open print window"));
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ID Card Print</title>
        <style>
          @page {
            size: 85.6mm 54mm;
            margin: 0;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .card { 
              width: 85.6mm; 
              height: 54mm; 
              page-break-after: always;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .card img { 
              max-width: 100%; 
              max-height: 100%;
              object-fit: contain;
            }
          }
          body { 
            font-family: Arial, sans-serif; 
            text-align: center;
            padding: 20px;
          }
          .card { 
            display: inline-block; 
            margin: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
          .card img { max-width: 323px; }
          h3 { margin: 20px 0 10px; color: #666; }
        </style>
      </head>
      <body>
        <h3>Front Side</h3>
        <div class="card"><img src="${frontDataUrl}" /></div>
        ${backDataUrl ? `<h3>Back Side</h3><div class="card"><img src="${backDataUrl}" /></div>` : ''}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [t]);

  const sendViaWhatsApp = useCallback(async (
    entityType: IDCardType,
    entityId: string,
    tenantId: string,
    recipientPhone: string,
    cardImageUrl: string
  ): Promise<boolean> => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-id-card-notification', {
        body: {
          entity_type: entityType,
          entity_id: entityId,
          tenant_id: tenantId,
          recipient_phone: recipientPhone,
          card_image_url: cardImageUrl,
        },
      });

      if (error) throw error;
      
      toast.success(t("idCard.sentSuccess", "ID card sent successfully"));
      return true;
    } catch (error) {
      console.error('Error sending ID card:', error);
      toast.error(t("idCard.sendError", "Failed to send ID card"));
      return false;
    } finally {
      setIsSending(false);
    }
  }, [t]);

  return {
    generateCard,
    downloadCard,
    printCard,
    sendViaWhatsApp,
    isGenerating,
    isSending,
  };
}
