import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface PDFOptions {
  filename: string;
  margin?: number;
  quality?: number;
}

/**
 * Generate a PDF from an HTML element using html2canvas + jsPDF
 * This approach properly handles Arabic text and RTL layouts
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
