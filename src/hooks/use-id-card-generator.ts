import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import html2canvas from "html2canvas";
import React from "react";
import { createRoot } from "react-dom/client";
import { IDCardTemplate } from "@/features/admin/components/id-cards/IDCardTemplate/IDCardTemplate";
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

/**
 * Wait for all <img> elements inside a container to finish loading.
 */
function waitForImages(container: HTMLElement, timeoutMs = 5000): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) return Promise.resolve();

  return new Promise<void>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; resolve(); }
    }, timeoutMs);

    let loaded = 0;
    const total = images.length;
    const onDone = () => {
      loaded++;
      if (loaded >= total && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve();
      }
    };
    images.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) {
        onDone();
      } else {
        img.addEventListener('load', onDone, { once: true });
        img.addEventListener('error', onDone, { once: true });
      }
    });
  });
}

/**
 * Render an IDCardTemplate React component off-screen, capture it with html2canvas,
 * and return a PNG data URL.
 */
async function renderCardSide(
  cardType: IDCardType,
  personData: IDCardPersonData,
  tenantData: IDCardTenantData,
  settings: TenantIDCardSettings,
  side: 'front' | 'back',
  language: 'en' | 'ar',
): Promise<string | null> {
  // Create hidden container
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '-9999px';
  // Prevent any overflow clipping
  wrapper.style.overflow = 'visible';
  document.body.appendChild(wrapper);

  try {
    // Render the React component into the hidden container
    const root = createRoot(wrapper);

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(IDCardTemplate, {
          cardType,
          personData,
          tenantData,
          settings,
          side,
          language,
          scale: 1,
        })
      );
      // Give React a tick to flush the render
      requestAnimationFrame(() => {
        setTimeout(resolve, 50);
      });
    });

    // Wait for images (photos, logos) to load
    await waitForImages(wrapper);

    // Find the rendered card element
    const cardEl = wrapper.firstElementChild as HTMLElement;
    if (!cardEl) {
      console.error('No card element rendered');
      return null;
    }

    // Capture with html2canvas at 3x for print quality
    const canvas = await html2canvas(cardEl, {
      scale: 3,
      backgroundColor: '#FFFFFF',
      useCORS: true,
      allowTaint: true,
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);

    // Cleanup React root
    root.unmount();

    return dataUrl;
  } catch (error) {
    console.error('Error rendering card side:', error);
    return null;
  } finally {
    document.body.removeChild(wrapper);
  }
}

export function useIDCardGenerator() {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const uploadToStorage = useCallback(async (
    dataUrl: string,
    path: string
  ): Promise<string | null> => {
    try {
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
      const settings = await fetchIDCardSettings(options.tenantId, options.cardType);
      
      if (!settings) {
        return { success: false, error: 'Failed to fetch card settings' };
      }

      const language = options.language || 'en';
      const result: IDCardGenerateResult = { success: true };

      // Render front side using the actual React component
      const frontImage = await renderCardSide(
        options.cardType,
        options.personData,
        options.tenantData,
        settings as TenantIDCardSettings,
        'front',
        language,
      );

      if (frontImage && options.saveToStorage) {
        const frontPath = `${options.tenantId}/${options.cardType}/${options.entityId}_front.png`;
        const uploadedUrl = await uploadToStorage(frontImage, frontPath);
        result.frontImageUrl = uploadedUrl || frontImage;
        result.frontImagePath = frontPath;
      } else if (frontImage) {
        result.frontImageUrl = frontImage;
      }

      // Render back side if enabled
      if (settings.back_enabled) {
        const backImage = await renderCardSide(
          options.cardType,
          options.personData,
          options.tenantData,
          settings as TenantIDCardSettings,
          'back',
          language,
        );

        if (backImage && options.saveToStorage) {
          const backPath = `${options.tenantId}/${options.cardType}/${options.entityId}_back.png`;
          const uploadedBackUrl = await uploadToStorage(backImage, backPath);
          result.backImageUrl = uploadedBackUrl || backImage;
          result.backImagePath = backPath;
        } else if (backImage) {
          result.backImageUrl = backImage;
        }
      }

      return result;
    } catch (error) {
      console.error('Error generating ID card:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setIsGenerating(false);
    }
  }, [uploadToStorage]);

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
