import { useState, useCallback } from 'react';
import { useGatePassDetails, useGatePassItems } from './use-gate-pass-details';
import { generateBrandedPDFFromElement } from '@/lib/pdf-utils';
import { useTranslation } from 'react-i18next';

export type GatePassPDFLanguage = 'en' | 'ar';

interface GeneratePDFOptions {
  primaryLanguage?: GatePassPDFLanguage;
  showQR?: boolean;
  includeItems?: boolean;
}

/**
 * Hook for generating Gate Pass PDF with bilingual layout and clear QR code
 */
export function useGatePassPDF(passId: string | undefined) {
  const { t, i18n } = useTranslation();
  const { data: passDetails, isLoading: isLoadingDetails } = useGatePassDetails(passId);
  const { data: items, isLoading: isLoadingItems } = useGatePassItems(passId);
  const [isGenerating, setIsGenerating] = useState(false);

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

      // Generate PDF
      const isRTL = options.primaryLanguage === 'ar';
      await generateBrandedPDFFromElement(container, {
        filename: `gate-pass-${passDetails.reference_number}.pdf`,
        margin: 10,
        quality: 2,
        isRTL,
        header: {
          primaryText: passDetails.reference_number,
          secondaryText: passDetails.project?.project_name || undefined,
        },
        footer: {
          text: t('contractors.gatePassPdf.confidential', 'CONFIDENTIAL - For authorized use only'),
          showPageNumbers: true,
          showDatePrinted: true,
        },
        watermark: passDetails.status !== 'approved' ? {
          enabled: true,
          text: passDetails.status === 'rejected' ? 'REJECTED' : 'PENDING',
          opacity: 10,
        } : undefined,
      });

      // Clean up
      document.body.removeChild(container);
    } finally {
      setIsGenerating(false);
    }
  }, [passDetails, items, t]);

  return {
    passDetails,
    items,
    isLoading: isLoadingDetails || isLoadingItems,
    isGenerating,
    generatePDF,
  };
}
