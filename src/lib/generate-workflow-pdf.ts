// Branded PDF Generator for Workflow Diagrams
// Uses jsPDF + html2canvas with tenant document settings

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { WorkflowDefinition, workflowCategories } from './workflow-definitions';
import { renderWorkflowSVG } from './render-workflow-svg';
import { fetchDocumentSettings } from '@/hooks/use-document-branding';
import { DocumentBrandingSettings, DEFAULT_DOCUMENT_SETTINGS } from '@/types/document-branding';
import { format } from 'date-fns';

export interface WorkflowPDFOptions {
  workflow: WorkflowDefinition;
  tenantId: string;
  language: 'en' | 'ar';
  includeActors?: boolean;
  includeDescription?: boolean;
  showLegend?: boolean;
}

// Landscape A4 dimensions in mm
const PAGE_WIDTH = 297;
const PAGE_HEIGHT = 210;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN * 2;

export async function generateWorkflowPDF(options: WorkflowPDFOptions): Promise<void> {
  const {
    workflow,
    tenantId,
    language,
    includeActors = true,
    includeDescription = true,
    showLegend = true,
  } = options;

  const isRtl = language === 'ar';

  // Fetch document branding settings
  let settings: DocumentBrandingSettings = DEFAULT_DOCUMENT_SETTINGS;
  try {
    const fetchedSettings = await fetchDocumentSettings(tenantId);
    if (fetchedSettings) settings = fetchedSettings;
  } catch (error) {
    console.warn('Failed to fetch document settings, using defaults');
  }

  // Create PDF in landscape orientation
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Page 1: Title page
  await renderTitlePage(pdf, workflow, settings, isRtl);

  // Page 2+: Workflow diagram
  pdf.addPage();
  await renderDiagramPage(pdf, workflow, settings, isRtl, showLegend);

  // Apply watermark if enabled
  if (settings.watermarkEnabled && settings.watermarkText) {
    applyWatermark(pdf, settings);
  }

  // Generate filename
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const filename = `${workflow.id}-workflow-${dateStr}.pdf`;

  // Download PDF
  pdf.save(filename);
}

async function renderTitlePage(
  pdf: jsPDF,
  workflow: WorkflowDefinition,
  settings: DocumentBrandingSettings,
  isRtl: boolean
): Promise<void> {
  const name = isRtl ? workflow.nameAr : workflow.name;
  const description = isRtl ? workflow.descriptionAr : workflow.description;
  const category = workflowCategories.find(c => c.id === workflow.category);
  const categoryName = category ? (isRtl ? category.nameAr : category.name) : '';

  // Header with logo
  if (settings.logoUrl) {
    try {
      const img = await loadImage(settings.logoUrl);
      const logoWidth = 50;
      const logoHeight = (img.height / img.width) * logoWidth;
      const logoX = isRtl ? PAGE_WIDTH - MARGIN - logoWidth : MARGIN;
      pdf.addImage(img, 'PNG', logoX, MARGIN, logoWidth, logoHeight);
    } catch (error) {
      console.warn('Failed to load logo for PDF');
    }
  }

  // Title
  pdf.setFontSize(28);
  pdf.setTextColor(33, 33, 33);
  const titleY = 70;
  
  if (isRtl) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(name, PAGE_WIDTH - MARGIN, titleY, { align: 'right' });
  } else {
    pdf.setFont('helvetica', 'bold');
    pdf.text(name, MARGIN, titleY);
  }

  // Category badge
  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  const categoryY = titleY + 15;
  const categoryLabel = isRtl ? 'الفئة: ' : 'Category: ';
  
  if (isRtl) {
    pdf.text(categoryLabel + categoryName, PAGE_WIDTH - MARGIN, categoryY, { align: 'right' });
  } else {
    pdf.text(categoryLabel + categoryName, MARGIN, categoryY);
  }

  // Description
  if (description) {
    pdf.setFontSize(14);
    pdf.setTextColor(66, 66, 66);
    const descY = categoryY + 25;
    const maxWidth = CONTENT_WIDTH;
    
    const lines = pdf.splitTextToSize(description, maxWidth);
    if (isRtl) {
      pdf.text(lines, PAGE_WIDTH - MARGIN, descY, { align: 'right' });
    } else {
      pdf.text(lines, MARGIN, descY);
    }
  }

  // Document info box
  const infoBoxY = 130;
  pdf.setDrawColor(200, 200, 200);
  pdf.setFillColor(248, 248, 248);
  pdf.roundedRect(MARGIN, infoBoxY, CONTENT_WIDTH, 40, 3, 3, 'FD');

  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  
  const dateLabel = isRtl ? 'تاريخ الإنشاء:' : 'Generated:';
  const dateValue = format(new Date(), isRtl ? 'dd/MM/yyyy' : 'MMM dd, yyyy');
  const versionLabel = isRtl ? 'الإصدار:' : 'Version:';
  const versionValue = '1.0';
  
  const col1X = MARGIN + 10;
  const col2X = MARGIN + CONTENT_WIDTH / 2;
  
  pdf.text(dateLabel, col1X, infoBoxY + 15);
  pdf.text(dateValue, col1X, infoBoxY + 25);
  pdf.text(versionLabel, col2X, infoBoxY + 15);
  pdf.text(versionValue, col2X, infoBoxY + 25);

  // Footer
  renderFooter(pdf, settings, isRtl, 1);
}

async function renderDiagramPage(
  pdf: jsPDF,
  workflow: WorkflowDefinition,
  settings: DocumentBrandingSettings,
  isRtl: boolean,
  showLegend: boolean
): Promise<void> {
  // Render SVG to canvas
  const svgContent = renderWorkflowSVG(workflow, {
    isRtl,
    includeActors: true,
    showLegend,
  });

  // Create temporary container for rendering
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.backgroundColor = '#ffffff';
  container.innerHTML = svgContent;
  document.body.appendChild(container);

  try {
    // Convert SVG to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Calculate dimensions to fit in page
    const imgWidth = CONTENT_WIDTH;
    const imgHeight = (canvas.height / canvas.width) * imgWidth;
    const maxHeight = CONTENT_HEIGHT - 30; // Leave room for header/footer

    let finalWidth = imgWidth;
    let finalHeight = imgHeight;

    if (imgHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = (canvas.width / canvas.height) * finalHeight;
    }

    // Center the image
    const imgX = MARGIN + (CONTENT_WIDTH - finalWidth) / 2;
    const imgY = MARGIN + 15;

    // Add header
    pdf.setFontSize(14);
    pdf.setTextColor(33, 33, 33);
    const title = isRtl ? workflow.nameAr : workflow.name;
    if (isRtl) {
      pdf.text(title, PAGE_WIDTH - MARGIN, MARGIN + 8, { align: 'right' });
    } else {
      pdf.text(title, MARGIN, MARGIN + 8);
    }

    // Add diagram image
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', imgX, imgY, finalWidth, finalHeight);

    // Footer
    renderFooter(pdf, settings, isRtl, 2);
  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
}

function renderFooter(
  pdf: jsPDF,
  settings: DocumentBrandingSettings,
  isRtl: boolean,
  pageNumber: number
): void {
  const footerY = PAGE_HEIGHT - MARGIN + 5;
  
  // Footer line
  pdf.setDrawColor(200, 200, 200);
  pdf.line(MARGIN, footerY - 5, PAGE_WIDTH - MARGIN, footerY - 5);

  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);

  // Footer text
  const footerText = settings.footerText || (isRtl ? 'سري - للاستخدام الداخلي فقط' : 'Confidential - Internal Use Only');
  
  if (isRtl) {
    pdf.text(footerText, PAGE_WIDTH - MARGIN, footerY, { align: 'right' });
    pdf.text(`${pageNumber}`, MARGIN, footerY);
  } else {
    pdf.text(footerText, MARGIN, footerY);
    pdf.text(`Page ${pageNumber}`, PAGE_WIDTH - MARGIN, footerY, { align: 'right' });
  }
}

function applyWatermark(pdf: jsPDF, settings: DocumentBrandingSettings): void {
  if (!settings.watermarkText) return;

  const pageCount = pdf.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(40);
    pdf.setTextColor(200, 200, 200);
    
    // Diagonal watermark
    pdf.text(
      settings.watermarkText,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT / 2,
      {
        align: 'center',
        angle: -30,
      }
    );
  }
}

// Helper to load image
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Bulk export multiple workflows
export async function generateBulkWorkflowPDFs(
  workflows: WorkflowDefinition[],
  tenantId: string,
  language: 'en' | 'ar'
): Promise<void> {
  for (const workflow of workflows) {
    await generateWorkflowPDF({
      workflow,
      tenantId,
      language,
      includeActors: true,
      includeDescription: true,
      showLegend: true,
    });
    // Small delay between downloads
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
