import { useState, useCallback } from 'react';
import { usePTWPermit } from './use-ptw-permits';
import { generateBrandedPDFFromElement, preloadImageWithDimensions } from '@/lib/pdf-utils';
import { useTranslation } from 'react-i18next';

export type PDFLanguage = 'en' | 'ar' | 'ur' | 'fil';

interface GeneratePDFOptions {
  primaryLanguage?: PDFLanguage;
  showQR?: boolean;
}

/**
 * Hook for generating PTW permit PDF with bilingual layout
 */
export function usePTWPermitPDF(permitId: string | undefined) {
  const { t, i18n } = useTranslation();
  const { data: permit, isLoading: isLoadingPermit } = usePTWPermit(permitId);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = useCallback(async (options: GeneratePDFOptions = {}) => {
    if (!permit) {
      throw new Error('Permit not found');
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
      const { renderPermitPDFTemplate } = await import('@/components/ptw/PermitPDFTemplate');
      const templateHtml = renderPermitPDFTemplate(permit, {
        primaryLanguage: options.primaryLanguage || 'en',
        secondaryLanguage: options.primaryLanguage === 'en' ? 'ar' : 'en',
        showQR: options.showQR !== false,
        t,
      });
      
      container.innerHTML = templateHtml;

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate PDF
      await generateBrandedPDFFromElement(container, {
        filename: `permit-${permit.reference_id}.pdf`,
        margin: 10,
        quality: 2,
        header: {
          primaryText: permit.reference_id,
        },
        footer: {
          text: t('ptw.pdf.confidential', 'CONFIDENTIAL - For authorized use only'),
          showPageNumbers: true,
          showDatePrinted: true,
        },
        watermark: permit.status === 'draft' ? {
          enabled: true,
          text: 'DRAFT',
          opacity: 0.1,
        } : undefined,
      });

      // Clean up
      document.body.removeChild(container);
    } finally {
      setIsGenerating(false);
    }
  }, [permit, t]);

  return {
    permit,
    isLoading: isLoadingPermit,
    isGenerating,
    generatePDF,
  };
}
