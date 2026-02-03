import { useState, useCallback } from 'react';
import { useGatePassDetails, useGatePassItems } from './use-gate-pass-details';
import { generateBrandedPDFFromElement } from '@/lib/pdf-utils';
import { useTranslation } from 'react-i18next';
import { useDocumentBranding } from '@/hooks/use-document-branding';

export type GatePassPDFLanguage = 'en' | 'ar';

interface GeneratePDFOptions {
  primaryLanguage?: GatePassPDFLanguage;
  showQR?: boolean;
  includeItems?: boolean;
}

/**
 * Hook for generating Gate Pass PDF with bilingual layout, QR code, and tenant branding
 */
export function useGatePassPDF(passId: string | undefined) {
  const { t, i18n } = useTranslation();
  const { data: passDetails, isLoading: isLoadingDetails } = useGatePassDetails(passId);
  const { data: items, isLoading: isLoadingItems } = useGatePassItems(passId);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get document branding settings
  const {
    getHeaderConfig,
    getFooterConfig,
    getWatermarkConfig,
    logoUrl,
    tenantName,
  } = useDocumentBranding();

  const generatePDF = useCallback(async (options: GeneratePDFOptions = {}) => {
    if (!passDetails) {
      throw new Error('Gate pass not found');
    }

    setIsGenerating(true);

    try {
      // Create a temporary container for rendering
      const container = document.createElement('div');
      container.id = 'pdf-render-container';
      container.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 210mm;
        background: white;
        font-family: 'IBM Plex Sans Arabic', 'Segoe UI', sans-serif;
      `;
      document.body.appendChild(container);

      // Import and render the PDF template
      const { renderGatePassPDFTemplate } = await import('@/components/contractors/GatePassPDFTemplate');
      
      // Map passDetails to expected format
      const passData = {
        id: passDetails.id,
        reference_number: passDetails.reference_number,
        status: passDetails.status,
        material_description: passDetails.material_description,
        quantity: passDetails.quantity,
        pass_type: passDetails.pass_type,
        pass_date: passDetails.pass_date,
        time_window_start: passDetails.time_window_start,
        time_window_end: passDetails.time_window_end,
        vehicle_plate: passDetails.vehicle_plate,
        driver_name: passDetails.driver_name,
        driver_mobile: passDetails.driver_mobile,
        entry_time: passDetails.entry_time,
        exit_time: passDetails.exit_time,
        is_internal_request: passDetails.is_internal_request,
        qr_code_token: passDetails.qr_code_token,
        project: passDetails.project,
        company: passDetails.project?.company,
        requester: passDetails.requester as { full_name: string } | null,
        pm_approver: passDetails.pm_approver as { full_name: string } | null,
        safety_approver: passDetails.safety_approver as { full_name: string } | null,
        pm_approved_at: passDetails.pm_approved_at,
        safety_approved_at: passDetails.safety_approved_at,
      };

      const templateHtml = renderGatePassPDFTemplate(passData, {
        primaryLanguage: options.primaryLanguage || 'en',
        showQR: options.showQR !== false,
        includeItems: options.includeItems !== false,
        items: items?.map(item => ({
          ...item,
          quantity: item.quantity ? Number(item.quantity) : null,
        })) || [],
      });
      
      container.innerHTML = templateHtml;

      // Wait for QR code image to load
      await new Promise(resolve => setTimeout(resolve, 800));

      // Generate PDF with tenant branding
      const isRTL = options.primaryLanguage === 'ar';
      const headerConfig = getHeaderConfig();
      const footerConfig = getFooterConfig();
      const watermarkConfig = getWatermarkConfig();

      // Convert logo URL to base64 if available
      let logoBase64: string | null = null;
      let logoWidth = 0;
      let logoHeight = 0;

      if (headerConfig.showLogo && logoUrl) {
        try {
          const response = await fetch(logoUrl);
          const blob = await response.blob();
          logoBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          // Get image dimensions
          const img = new Image();
          await new Promise((resolve) => {
            img.onload = resolve;
            img.src = logoUrl;
          });
          logoWidth = img.naturalWidth;
          logoHeight = img.naturalHeight;
        } catch (err) {
          console.error('Failed to load logo for PDF:', err);
        }
      }

      await generateBrandedPDFFromElement(container, {
        filename: `gate-pass-${passDetails.reference_number}.pdf`,
        margin: 10,
        quality: 2,
        isRTL,
        header: {
          logoBase64,
          logoWidth,
          logoHeight,
          logoPosition: headerConfig.logoPosition,
          primaryText: passDetails.reference_number,
          secondaryText: passDetails.project?.project_name || tenantName || undefined,
          bgColor: headerConfig.backgroundColor,
          textColor: headerConfig.textColor,
        },
        footer: {
          text: footerConfig.text || t('contractors.gatePassPdf.confidential', 'CONFIDENTIAL - For authorized use only'),
          showPageNumbers: footerConfig.showPageNumbers,
          showDatePrinted: footerConfig.showDatePrinted,
          bgColor: footerConfig.backgroundColor,
          textColor: footerConfig.textColor,
        },
        watermark: passDetails.status !== 'approved'
          ? {
              enabled: true,
              text: passDetails.status === 'rejected' ? 'REJECTED' : 'PENDING',
              opacity: 10,
            }
          : watermarkConfig.enabled
          ? {
              enabled: true,
              text: watermarkConfig.text || undefined,
              opacity: watermarkConfig.opacity,
            }
          : undefined,
      });

      // Clean up
      document.body.removeChild(container);
    } finally {
      setIsGenerating(false);
    }
  }, [passDetails, items, t, getHeaderConfig, getFooterConfig, getWatermarkConfig, logoUrl, tenantName]);

  return {
    passDetails,
    items,
    isLoading: isLoadingDetails || isLoadingItems,
    isGenerating,
    generatePDF,
  };
}
