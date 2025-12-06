import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ShadingType,
} from "docx";
import { format } from "date-fns";
import { DocumentBrandingSettings, DEFAULT_DOCUMENT_SETTINGS } from "@/types/document-branding";

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

const createLabelCell = (text: string): TableCell => {
  return new TableCell({
    width: { size: 30, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.SOLID, color: "E5E7EB" },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
            size: 22,
            font: "Arial",
          }),
        ],
      }),
    ],
  });
};

const createValueCell = (text: string): TableCell => {
  return new TableCell({
    width: { size: 70, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            size: 22,
            font: "Arial",
          }),
        ],
      }),
    ],
  });
};

const createSectionTitle = (text: string): Paragraph => {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 400, after: 200 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 26,
        font: "Arial",
        color: "1F2937",
      }),
    ],
  });
};

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

export async function generateFilledWitnessDoc(
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

  const documentChildren: (Paragraph | Table)[] = [
    // Header
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: incidentContext.tenantName.toUpperCase(),
          bold: true,
          size: 32,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "HSSE DEPARTMENT",
          bold: true,
          size: 24,
          font: "Arial",
          color: "4B5563",
        }),
      ],
    }),
    // Form Title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 400 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: "1F2937" },
      },
      children: [
        new TextRun({
          text: "WITNESS STATEMENT",
          bold: true,
          size: 36,
          font: "Arial",
        }),
      ],
    }),
    // Section 1: Incident Context
    createSectionTitle("INCIDENT CONTEXT"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      },
      rows: [
        new TableRow({
          children: [createLabelCell("Reference No"), createValueCell(incidentContext.referenceId)],
        }),
        new TableRow({
          children: [createLabelCell("Incident Title"), createValueCell(incidentContext.title)],
        }),
        new TableRow({
          children: [createLabelCell("Date & Time"), createValueCell(dateTimeText)],
        }),
        new TableRow({
          children: [
            createLabelCell("Location"),
            createValueCell(incidentContext.location || "Not specified"),
          ],
        }),
      ],
    }),
    // Section 2: Witness Details
    createSectionTitle("WITNESS DETAILS"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      },
      rows: [
        new TableRow({
          children: [createLabelCell("Witness Name"), createValueCell(witnessData.witnessName)],
        }),
        new TableRow({
          children: [
            createLabelCell("Contact"),
            createValueCell(witnessData.witnessContact || "Not provided"),
          ],
        }),
        new TableRow({
          children: [
            createLabelCell("Relationship"),
            createValueCell(witnessData.relationship || "Not specified"),
          ],
        }),
        new TableRow({
          children: [
            createLabelCell("Statement Type"),
            createValueCell(getStatementTypeLabel(witnessData.statementType)),
          ],
        }),
        new TableRow({
          children: [createLabelCell("Statement Date"), createValueCell(statementDateText)],
        }),
        ...(witnessData.createdBy
          ? [
              new TableRow({
                children: [createLabelCell("Recorded By"), createValueCell(witnessData.createdBy)],
              }),
            ]
          : []),
      ],
    }),
    // Section 3: Statement
    createSectionTitle("STATEMENT"),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: witnessData.statement,
          size: 22,
          font: "Arial",
        }),
      ],
    }),
  ];

  // Add AI Analysis section if available
  if (aiSummary || emotionalCues.length > 0 || keyFacts.length > 0 || missingInfo.length > 0) {
    documentChildren.push(createSectionTitle("AI ANALYSIS"));

    if (aiSummary) {
      documentChildren.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Summary: ",
              bold: true,
              size: 22,
              font: "Arial",
            }),
            new TextRun({
              text: aiSummary,
              size: 22,
              font: "Arial",
            }),
          ],
        })
      );
    }

    if (emotionalCues.length > 0) {
      documentChildren.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Emotional Cues: ",
              bold: true,
              size: 22,
              font: "Arial",
            }),
            new TextRun({
              text: emotionalCues.join(", "),
              size: 22,
              font: "Arial",
            }),
          ],
        })
      );
    }

    if (keyFacts.length > 0) {
      documentChildren.push(
        new Paragraph({
          spacing: { before: 100, after: 50 },
          children: [
            new TextRun({
              text: "Key Facts:",
              bold: true,
              size: 22,
              font: "Arial",
            }),
          ],
        })
      );
      keyFacts.forEach((fact) => {
        documentChildren.push(
          new Paragraph({
            spacing: { after: 50 },
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: fact,
                size: 22,
                font: "Arial",
              }),
            ],
          })
        );
      });
    }

    if (missingInfo.length > 0) {
      documentChildren.push(
        new Paragraph({
          spacing: { before: 100, after: 50 },
          children: [
            new TextRun({
              text: "Missing Information:",
              bold: true,
              size: 22,
              font: "Arial",
            }),
          ],
        })
      );
      missingInfo.forEach((info) => {
        documentChildren.push(
          new Paragraph({
            spacing: { after: 50 },
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: info,
                size: 22,
                font: "Arial",
              }),
            ],
          })
        );
      });
    }
  }

  // Footer
  documentChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      children: [
        new TextRun({
          text: `Generated on ${format(new Date(), "PPpp")} | ${incidentContext.tenantName} HSSE Department`,
          size: 18,
          font: "Arial",
          color: "9CA3AF",
          italics: true,
        }),
      ],
    })
  );

  const doc = new Document({
    creator: incidentContext.tenantName,
    title: `Witness Statement - ${witnessData.witnessName}`,
    description: `Witness Statement for Incident ${incidentContext.referenceId}`,
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 22,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: documentChildren,
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Witness_Statement_${witnessData.witnessName.replace(/[^a-zA-Z0-9]/g, "_")}_${incidentContext.referenceId.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
