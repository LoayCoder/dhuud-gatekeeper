import { format } from "date-fns";
import { DocumentBrandingSettings, DEFAULT_DOCUMENT_SETTINGS } from "@/types/document-branding";
import {
  generatePDFFromElement,
  createPDFRenderContainer,
  removePDFRenderContainer,
} from "./pdf-utils";

export interface IncidentContext {
  referenceId: string;
  title: string;
  occurredAt: string | null;
  location: string | null;
  tenantName: string;
}

export interface WitnessData {
  witnessName: string;
  witnessContact?: string;
  relationship?: string;
  statement: string;
  statementType: string;
  createdAt: string | null;
  createdBy?: string;
  aiAnalysis?: Record<string, unknown> | null;
}

export interface FilledFormOptions {
  documentSettings?: Partial<DocumentBrandingSettings> | null;
}

const getStatementTypeLabel = (type: string): string => {
  switch (type) {
    case "document_upload":
      return "Document Upload";
    case "direct_entry":
      return "Direct Entry";
    case "voice_recording":
      return "Voice Recording";
    default:
      return type;
  }
};

const escapeHtml = (text: string): string => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

export async function generateFilledWitnessPDF(
  incidentContext: IncidentContext,
  witnessData: WitnessData,
  options: FilledFormOptions = {}
): Promise<void> {
  const { documentSettings } = options;

  const settings = {
    ...DEFAULT_DOCUMENT_SETTINGS,
    ...documentSettings,
  };

  const dateTimeText = incidentContext.occurredAt
    ? format(new Date(incidentContext.occurredAt), "PPpp")
    : "Not specified";

  const statementDateText = witnessData.createdAt
    ? format(new Date(witnessData.createdAt), "PPpp")
    : "Not specified";

  const aiAnalysis = witnessData.aiAnalysis;
  const aiSummary = aiAnalysis?.summary ? String(aiAnalysis.summary) : null;
  const emotionalCues = (aiAnalysis?.emotional_cues as { detected?: string[] })?.detected || [];
  const keyFacts = (aiAnalysis?.key_facts as string[]) || [];
  const missingInfo = (aiAnalysis?.missing_info as string[]) || [];

  // Create hidden container for rendering
  const container = createPDFRenderContainer();

  // Build HTML content
  let html = `
    <div style="font-family: Rubik, Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 24px; font-weight: bold; text-transform: uppercase;">
          ${escapeHtml(incidentContext.tenantName)}
        </div>
        <div style="font-size: 16px; color: #4b5563; font-weight: bold;">
          HSSE DEPARTMENT
        </div>
      </div>

      <!-- Title -->
      <div style="text-align: center; margin: 30px 0; padding-bottom: 15px; border-bottom: 3px solid #1f2937;">
        <div style="font-size: 28px; font-weight: bold;">WITNESS STATEMENT</div>
      </div>

      <!-- Incident Context Section -->
      <div style="margin-bottom: 25px;">
        <div style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb;">
          INCIDENT CONTEXT
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 30%; padding: 8px; background: #e5e7eb; font-weight: bold; border: 1px solid #d1d5db;">Reference No</td>
            <td style="width: 70%; padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(incidentContext.referenceId)}</td>
          </tr>
          <tr>
            <td style="width: 30%; padding: 8px; background: #e5e7eb; font-weight: bold; border: 1px solid #d1d5db;">Incident Title</td>
            <td style="width: 70%; padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(incidentContext.title)}</td>
          </tr>
          <tr>
            <td style="width: 30%; padding: 8px; background: #e5e7eb; font-weight: bold; border: 1px solid #d1d5db;">Date & Time</td>
            <td style="width: 70%; padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(dateTimeText)}</td>
          </tr>
          <tr>
            <td style="width: 30%; padding: 8px; background: #e5e7eb; font-weight: bold; border: 1px solid #d1d5db;">Location</td>
            <td style="width: 70%; padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(incidentContext.location || "Not specified")}</td>
          </tr>
        </table>
      </div>

      <!-- Witness Details Section -->
      <div style="margin-bottom: 25px;">
        <div style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb;">
          WITNESS DETAILS
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 30%; padding: 8px; background: #e5e7eb; font-weight: bold; border: 1px solid #d1d5db;">Witness Name</td>
            <td style="width: 70%; padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(witnessData.witnessName)}</td>
          </tr>
          <tr>
            <td style="width: 30%; padding: 8px; background: #e5e7eb; font-weight: bold; border: 1px solid #d1d5db;">Contact</td>
            <td style="width: 70%; padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(witnessData.witnessContact || "Not provided")}</td>
          </tr>
          <tr>
            <td style="width: 30%; padding: 8px; background: #e5e7eb; font-weight: bold; border: 1px solid #d1d5db;">Relationship</td>
            <td style="width: 70%; padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(witnessData.relationship || "Not specified")}</td>
          </tr>
          <tr>
            <td style="width: 30%; padding: 8px; background: #e5e7eb; font-weight: bold; border: 1px solid #d1d5db;">Statement Type</td>
            <td style="width: 70%; padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(getStatementTypeLabel(witnessData.statementType))}</td>
          </tr>
          <tr>
            <td style="width: 30%; padding: 8px; background: #e5e7eb; font-weight: bold; border: 1px solid #d1d5db;">Statement Date</td>
            <td style="width: 70%; padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(statementDateText)}</td>
          </tr>
          ${witnessData.createdBy ? `
          <tr>
            <td style="width: 30%; padding: 8px; background: #e5e7eb; font-weight: bold; border: 1px solid #d1d5db;">Recorded By</td>
            <td style="width: 70%; padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(witnessData.createdBy)}</td>
          </tr>
          ` : ""}
        </table>
      </div>

      <!-- Statement Section -->
      <div style="margin-bottom: 25px;">
        <div style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb;">
          STATEMENT
        </div>
        <div style="padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; white-space: pre-wrap;">
          ${escapeHtml(witnessData.statement)}
        </div>
      </div>
  `;

  // Add AI Analysis section if available
  if (aiSummary || emotionalCues.length > 0 || keyFacts.length > 0 || missingInfo.length > 0) {
    html += `
      <div style="margin-bottom: 25px;">
        <div style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb;">
          AI ANALYSIS
        </div>
        <div style="padding: 15px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 4px;">
    `;

    if (aiSummary) {
      html += `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #0369a1;">Summary: </span>
            <span>${escapeHtml(aiSummary)}</span>
          </div>
      `;
    }

    if (emotionalCues.length > 0) {
      html += `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #0369a1;">Emotional Cues: </span>
            <span>${emotionalCues.map(c => escapeHtml(c)).join(", ")}</span>
          </div>
      `;
    }

    if (keyFacts.length > 0) {
      html += `
          <div style="margin-bottom: 12px;">
            <div style="font-weight: bold; color: #0369a1; margin-bottom: 5px;">Key Facts:</div>
            <ul style="margin: 0; padding-inline-start: 20px;">
              ${keyFacts.map(f => `<li>${escapeHtml(f)}</li>`).join("")}
            </ul>
          </div>
      `;
    }

    if (missingInfo.length > 0) {
      html += `
          <div>
            <div style="font-weight: bold; color: #0369a1; margin-bottom: 5px;">Missing Information:</div>
            <ul style="margin: 0; padding-inline-start: 20px;">
              ${missingInfo.map(i => `<li>${escapeHtml(i)}</li>`).join("")}
            </ul>
          </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  // Footer
  html += `
      <div style="margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; font-style: italic;">
        Generated on ${format(new Date(), "PPpp")} | ${escapeHtml(incidentContext.tenantName)} HSSE Department
      </div>
    </div>
  `;

  container.innerHTML = html;

  try {
    const filename = `Witness_Statement_${witnessData.witnessName.replace(/[^a-zA-Z0-9]/g, "_")}_${incidentContext.referenceId.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    await generatePDFFromElement(container, { filename });
  } finally {
    removePDFRenderContainer(container);
  }
}
