import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, Loader2, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PrintableRiskAssessmentSummary } from "./PrintableRiskAssessmentSummary";

interface Hazard {
  id: string;
  hazard_description: string;
  likelihood: number;
  severity: number;
  residual_likelihood?: number;
  residual_severity?: number;
  existing_controls?: { description: string }[];
  additional_controls?: { description: string; responsible?: string; target_date?: string }[];
}

interface RiskAssessmentPDFExportButtonProps {
  assessmentNumber: string;
  activityName: string;
  activityDescription?: string;
  location?: string;
  validUntil?: string;
  activityType?: string;
  workEnvironment?: string;
  scopeDescription?: string;
  applicableLegislation?: string[];
  overallRiskRating?: string;
  riskTolerance?: string;
  acceptanceJustification?: string;
  reviewFrequency?: string;
  nextReviewDate?: string;
  hazards: Hazard[];
  createdBy?: string;
  createdAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export function RiskAssessmentPDFExportButton(props: RiskAssessmentPDFExportButtonProps) {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!printRef.current) return;

    setIsGenerating(true);
    try {
      // Create a temporary container for rendering
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.style.width = "210mm"; // A4 width
      document.body.appendChild(tempContainer);

      // Clone the print content
      const clone = printRef.current.cloneNode(true) as HTMLElement;
      tempContainer.appendChild(clone);

      // Wait for any fonts to load
      await document.fonts.ready;

      // Generate canvas
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Create PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      // Handle multi-page if content is long
      const pageHeight = pdfHeight;
      const contentHeight = (imgHeight * ratio);
      let position = 0;
      let pageNum = 1;

      while (position < contentHeight) {
        if (pageNum > 1) {
          pdf.addPage();
        }
        
        pdf.addImage(
          imgData,
          "PNG",
          imgX,
          imgY - position,
          imgWidth * ratio,
          imgHeight * ratio
        );
        
        position += pageHeight;
        pageNum++;
      }

      // Download
      pdf.save(`${props.assessmentNumber}_Risk_Assessment.pdf`);

      // Cleanup
      document.body.removeChild(tempContainer);

      toast.success(t("risk.pdf.success", "PDF generated successfully"));
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(t("risk.pdf.error", "Failed to generate PDF"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error(t("common.popupBlocked", "Please allow popups to print"));
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${props.assessmentNumber} - Risk Assessment</title>
          <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Rubik', sans-serif; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${printRef.current.outerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  return (
    <>
      {/* Hidden print container */}
      <div className="hidden">
        <PrintableRiskAssessmentSummary ref={printRef} {...props} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 me-2" />
            )}
            {t("risk.pdf.export", "Export")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={generatePDF} disabled={isGenerating}>
            <Download className="h-4 w-4 me-2" />
            {t("risk.pdf.downloadPDF", "Download PDF")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 me-2" />
            {t("risk.pdf.print", "Print")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
