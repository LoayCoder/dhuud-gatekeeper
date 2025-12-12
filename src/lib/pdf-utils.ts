import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";

export interface PDFOptions {
  filename: string;
  margin?: number;
  quality?: number;
}

export interface PDFBrandingOptions {
  filename: string;
  margin?: number;
  quality?: number;
  
  // Per-page branding
  header?: {
    logoBase64?: string | null;
    logoPosition?: 'left' | 'center' | 'right';
    primaryText?: string;
    secondaryText?: string | null;
    bgColor?: string;
    textColor?: string;
  };
  footer?: {
    text?: string;
    showPageNumbers?: boolean;
    showDatePrinted?: boolean;
    bgColor?: string;
    textColor?: string;
  };
  watermark?: {
    text?: string | null;
    enabled?: boolean;
    opacity?: number;
  };
  isRTL?: boolean;
}

// Convert hex color to RGB array
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ];
  }
  return [255, 255, 255]; // Default white
}

// Draw header on each page
function drawPageHeader(
  pdf: jsPDF,
  header: PDFBrandingOptions['header'],
  margin: number,
  pageWidth: number,
  isRTL?: boolean
): number {
  if (!header) return margin;
  
  const headerY = margin;
  const headerHeight = 18;
  
  // Background rectangle
  const bgColor = hexToRgb(header.bgColor || '#ffffff');
  pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  pdf.rect(margin, headerY, pageWidth - margin * 2, headerHeight, 'F');
  
  // Logo (if provided)
  if (header.logoBase64) {
    try {
      const logoWidth = 35;
      const logoHeight = 12;
      let logoX = margin + 2;
      
      if (header.logoPosition === 'right') {
        logoX = pageWidth - margin - logoWidth - 2;
      } else if (header.logoPosition === 'center') {
        logoX = (pageWidth - logoWidth) / 2;
      }
      
      pdf.addImage(header.logoBase64, 'PNG', logoX, headerY + 3, logoWidth, logoHeight);
    } catch (e) {
      console.warn('Failed to add logo to PDF:', e);
    }
  }
  
  // Text
  const textColor = hexToRgb(header.textColor || '#1f2937');
  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFontSize(11);
  
  let textX: number;
  if (header.logoPosition === 'center') {
    textX = isRTL ? pageWidth - margin - 5 : margin + 5;
  } else if (header.logoPosition === 'right') {
    textX = isRTL ? pageWidth - margin - 5 : margin + 5;
  } else {
    textX = isRTL ? pageWidth - margin - 5 : margin + 40;
  }
  
  if (header.primaryText) {
    pdf.text(header.primaryText, textX, headerY + 8, { align: isRTL ? 'right' : 'left' });
  }
  
  if (header.secondaryText) {
    pdf.setFontSize(8);
    pdf.text(header.secondaryText, textX, headerY + 14, { align: isRTL ? 'right' : 'left' });
  }
  
  // Separator line
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  pdf.line(margin, headerY + headerHeight, pageWidth - margin, headerY + headerHeight);
  
  return headerY + headerHeight + 2; // Return Y position after header
}

// Draw watermark on each page
function drawWatermark(
  pdf: jsPDF,
  text: string,
  opacity: number,
  pageWidth: number,
  pageHeight: number
): void {
  pdf.saveGraphicsState();
  
  // Set transparency using GState
  const gState = new (pdf as any).GState({ opacity: opacity / 100 });
  pdf.setGState(gState);
  
  // Diagonal text across the page
  pdf.setFontSize(48);
  pdf.setTextColor(156, 163, 175); // Gray color
  
  // Center of page
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;
  
  pdf.text(text, centerX, centerY, {
    angle: -45,
    align: 'center'
  });
  
  pdf.restoreGraphicsState();
}

// Draw footer on each page
function drawPageFooter(
  pdf: jsPDF,
  footer: PDFBrandingOptions['footer'],
  currentPage: number,
  totalPages: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  isRTL?: boolean
): void {
  if (!footer) return;
  
  const footerHeight = 12;
  const footerY = pageHeight - margin - footerHeight;
  
  // Background rectangle
  const bgColor = hexToRgb(footer.bgColor || '#f3f4f6');
  pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  pdf.rect(margin, footerY, pageWidth - margin * 2, footerHeight, 'F');
  
  // Top border line
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  pdf.line(margin, footerY, pageWidth - margin, footerY);
  
  // Footer text
  const textColor = hexToRgb(footer.textColor || '#6b7280');
  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFontSize(8);
  
  // Left side - custom text
  if (footer.text) {
    const textX = isRTL ? pageWidth - margin - 5 : margin + 5;
    pdf.text(footer.text, textX, footerY + 7, { align: isRTL ? 'right' : 'left' });
  }
  
  // Center - page numbers
  if (footer.showPageNumbers) {
    const pageText = `${currentPage} / ${totalPages}`;
    pdf.text(pageText, pageWidth / 2, footerY + 7, { align: 'center' });
  }
  
  // Right side - date printed
  if (footer.showDatePrinted) {
    const dateText = format(new Date(), 'PPP');
    const dateX = isRTL ? margin + 5 : pageWidth - margin - 5;
    pdf.text(dateText, dateX, footerY + 7, { align: isRTL ? 'left' : 'right' });
  }
}

/**
 * Generate a PDF with per-page header, footer, and watermark
 */
export async function generateBrandedPDFFromElement(
  element: HTMLElement,
  options: PDFBrandingOptions
): Promise<void> {
  const { 
    filename, 
    margin = 15, 
    quality = 2,
    header,
    footer,
    watermark,
    isRTL = false
  } = options;

  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  
  // Calculate reserved space for header and footer
  const headerHeight = header ? 20 : 0;
  const footerHeight = footer ? 14 : 0;
  
  // Available content area per page
  const contentStartY = margin + headerHeight;
  const contentEndY = pageHeight - margin - footerHeight;
  const contentAreaHeight = contentEndY - contentStartY;
  const contentWidth = pageWidth - margin * 2;

  // Render HTML to canvas
  const canvas = await html2canvas(element, {
    scale: quality,
    useCORS: true,
    logging: false,
    allowTaint: true,
    backgroundColor: "#ffffff",
  });

  // Calculate image dimensions to fit content width
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  // Calculate total pages needed
  const totalPages = Math.ceil(imgHeight / contentAreaHeight);

  // Create PDF
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const imgData = canvas.toDataURL("image/png");

  // Generate each page
  for (let page = 1; page <= totalPages; page++) {
    if (page > 1) {
      pdf.addPage();
    }

    // Draw header on this page
    drawPageHeader(pdf, header, margin, pageWidth, isRTL);

    // Draw watermark on this page (if enabled)
    if (watermark?.enabled && watermark?.text) {
      drawWatermark(pdf, watermark.text, watermark.opacity || 15, pageWidth, pageHeight);
    }

    // Calculate which portion of the image to show on this page
    const sourceY = (page - 1) * contentAreaHeight;
    
    // Create a temporary canvas for just this page's content
    const pageCanvas = document.createElement('canvas');
    const ctx = pageCanvas.getContext('2d');
    
    if (ctx) {
      // Calculate source dimensions in canvas pixels
      const pixelRatio = canvas.width / imgWidth;
      const sourceHeight = Math.min(contentAreaHeight, imgHeight - sourceY);
      const sourcePixelY = sourceY * pixelRatio;
      const sourcePixelHeight = sourceHeight * pixelRatio;
      
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourcePixelHeight;
      
      // Draw the portion of the original canvas
      ctx.drawImage(
        canvas,
        0, sourcePixelY, canvas.width, sourcePixelHeight,
        0, 0, canvas.width, sourcePixelHeight
      );
      
      const pageImgData = pageCanvas.toDataURL("image/png");
      
      // Add the content image for this page
      pdf.addImage(
        pageImgData,
        "PNG",
        margin,
        contentStartY,
        contentWidth,
        sourceHeight
      );
    }

    // Draw footer on this page
    drawPageFooter(pdf, footer, page, totalPages, margin, pageWidth, pageHeight, isRTL);
  }

  // Download the PDF
  pdf.save(filename);
}

/**
 * Preload an image URL as base64 for embedding in PDF
 */
export async function preloadImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  
  try {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      };
      
      img.onerror = () => {
        console.warn('Failed to load image for PDF:', url);
        resolve(null);
      };
      
      img.src = url;
    });
  } catch {
    return null;
  }
}

/**
 * Generate a PDF from an HTML element using html2canvas + jsPDF
 * This approach properly handles Arabic text and RTL layouts
 * @deprecated Use generateBrandedPDFFromElement for proper per-page branding
 */
export async function generatePDFFromElement(
  element: HTMLElement,
  options: PDFOptions
): Promise<void> {
  const { filename, margin = 10, quality = 2 } = options;

  // Render HTML to canvas
  const canvas = await html2canvas(element, {
    scale: quality,
    useCORS: true,
    logging: false,
    allowTaint: true,
    backgroundColor: "#ffffff",
  });

  // Calculate dimensions for A4
  const imgWidth = 210 - margin * 2; // A4 width in mm minus margins
  const pageHeight = 297 - margin * 2; // A4 height in mm minus margins
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Create PDF
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const imgData = canvas.toDataURL("image/png");

  // Handle multi-page if content is longer than one page
  let heightLeft = imgHeight;
  let position = margin;

  // Add first page
  pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Add subsequent pages if needed
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  // Download the PDF
  pdf.save(filename);
}

/**
 * Create a hidden container for PDF rendering
 */
export function createPDFRenderContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px"; // A4 width at 96 DPI
  container.style.backgroundColor = "#ffffff";
  container.style.padding = "40px";
  container.style.fontFamily = "Rubik, Arial, sans-serif";
  document.body.appendChild(container);
  return container;
}

/**
 * Clean up the render container
 */
export function removePDFRenderContainer(container: HTMLDivElement): void {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
}
