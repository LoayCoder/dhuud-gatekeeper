/**
 * Test print button component for ID cards
 * Generates a sample card and opens the browser print dialog
 */
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { IDCardTemplate } from "../IDCardTemplate";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import type { 
  TenantIDCardSettings, 
  IDCardTenantData, 
  IDCardPersonData,
  IDCardType 
} from "@/types/id-card.types";

interface TestPrintButtonProps {
  settings: TenantIDCardSettings;
  tenantData: IDCardTenantData;
  cardType: IDCardType;
  samplePersonData: IDCardPersonData;
  className?: string;
}

export function TestPrintButton({
  settings,
  tenantData,
  cardType,
  samplePersonData,
  className,
}: TestPrintButtonProps) {
  const { t } = useTranslation();
  const [isPrinting, setIsPrinting] = useState(false);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const handleTestPrint = async () => {
    setIsPrinting(true);

    try {
      // Render cards to canvas
      const frontCanvas = frontRef.current 
        ? await html2canvas(frontRef.current, { scale: 3, useCORS: true, backgroundColor: null })
        : null;
      
      const backCanvas = settings.back_enabled && backRef.current
        ? await html2canvas(backRef.current, { scale: 3, useCORS: true, backgroundColor: null })
        : null;

      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error(t("idCard.print.popupBlocked", "Popup blocked. Please allow popups to print."));
        setIsPrinting(false);
        return;
      }

      // CR-80 dimensions
      const isPortrait = settings.card_orientation === 'portrait';
      const cardWidth = isPortrait ? '54mm' : '85.6mm';
      const cardHeight = isPortrait ? '85.6mm' : '54mm';

      const frontDataUrl = frontCanvas?.toDataURL('image/png') || '';
      const backDataUrl = backCanvas?.toDataURL('image/png') || '';

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="ltr" lang="en">
        <head>
          <title>Test Print - ID Card</title>
          <style>
            @page {
              size: ${cardWidth} ${cardHeight};
              margin: 0;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none !important; }
              .card-page { page-break-after: always; }
              .card-page:last-child { page-break-after: auto; }
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Arial, sans-serif;
              background: #f5f5f5;
              min-height: 100vh;
            }
            .test-banner {
              background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
              border: 2px dashed #f59e0b;
              padding: 16px 24px;
              text-align: center;
              margin: 20px;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
            }
            .test-banner strong {
              color: #d97706;
              font-size: 18px;
            }
            .test-banner p {
              color: #92400e;
              margin-top: 4px;
              font-size: 14px;
            }
            .cards-container {
              display: flex;
              flex-wrap: wrap;
              gap: 24px;
              justify-content: center;
              padding: 20px;
            }
            .card-wrapper {
              background: white;
              padding: 16px;
              border-radius: 12px;
              box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            }
            .card-label {
              text-align: center;
              font-size: 12px;
              color: #666;
              margin-bottom: 12px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .card-image {
              display: block;
              max-width: 100%;
              height: auto;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .card-page {
              width: ${cardWidth};
              height: ${cardHeight};
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            .card-page img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .print-btn {
              display: block;
              margin: 20px auto;
              padding: 12px 32px;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 500;
              cursor: pointer;
              transition: background 0.2s;
            }
            .print-btn:hover {
              background: #2563eb;
            }
          </style>
        </head>
        <body>
          <div class="no-print test-banner">
            <strong>🖨️ TEST PRINT</strong>
            <p>Sample ID Card Preview - Click Print to send to printer</p>
          </div>
          
          <div class="no-print cards-container">
            <div class="card-wrapper">
              <div class="card-label">Front Side</div>
              <img class="card-image" src="${frontDataUrl}" alt="ID Card Front" />
            </div>
            ${settings.back_enabled ? `
            <div class="card-wrapper">
              <div class="card-label">Back Side</div>
              <img class="card-image" src="${backDataUrl}" alt="ID Card Back" />
            </div>
            ` : ''}
          </div>
          
          <button class="no-print print-btn" onclick="window.print()">
            Print Test Card
          </button>
          
          <!-- Print-only pages -->
          <div class="card-page">
            <img src="${frontDataUrl}" alt="Front" />
          </div>
          ${settings.back_enabled ? `
          <div class="card-page">
            <img src="${backDataUrl}" alt="Back" />
          </div>
          ` : ''}
        </body>
        </html>
      `);

      printWindow.document.close();
      toast.success(t("idCard.print.ready", "Print preview ready"));
    } catch (error) {
      console.error('Test print error:', error);
      toast.error(t("idCard.print.error", "Failed to generate print preview"));
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleTestPrint}
        disabled={isPrinting}
        className={className}
      >
        {isPrinting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin me-2" />
            {t("idCard.settings.generating", "Generating...")}
          </>
        ) : (
          <>
            <Printer className="h-4 w-4 me-2" />
            {t("idCard.settings.testPrint", "Test Print")}
          </>
        )}
      </Button>

      {/* Hidden card renderers for canvas capture */}
      <div className="fixed -left-[9999px] top-0" aria-hidden="true">
        <div ref={frontRef}>
          <IDCardTemplate
            cardType={cardType}
            personData={samplePersonData}
            tenantData={tenantData}
            settings={settings}
            side="front"
            language="en"
            scale={2}
          />
        </div>
        {settings.back_enabled && (
          <div ref={backRef}>
            <IDCardTemplate
              cardType={cardType}
              personData={samplePersonData}
              tenantData={tenantData}
              settings={settings}
              side="back"
              language="en"
              scale={2}
            />
          </div>
        )}
      </div>
    </>
  );
}
