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

export interface WitnessFormData {
  referenceId: string;
  title: string;
  occurredAt: string | null;
  location: string | null;
  branchName?: string | null;
  siteName?: string | null;
  tenantName: string;
  logoUrl?: string | null;
}

export interface WitnessFormOptions {
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

const createEmptyFieldRow = (label: string): TableRow => {
  return new TableRow({
    children: [
      createLabelCell(label),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "_".repeat(50),
                size: 22,
                font: "Arial",
                color: "CCCCCC",
              }),
            ],
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

export async function generateWitnessWordDoc(
  data: WitnessFormData,
  options: WitnessFormOptions = {}
): Promise<void> {
  const { documentSettings } = options;
  
  // Merge with defaults
  const settings = {
    ...DEFAULT_DOCUMENT_SETTINGS,
    ...documentSettings,
  };

  const locationText = [data.location, data.siteName, data.branchName]
    .filter(Boolean)
    .join(", ") || "Not specified";

  const dateTimeText = data.occurredAt
    ? format(new Date(data.occurredAt), "PPpp")
    : "Not specified";

  // Create the document with branding settings
  const doc = new Document({
    creator: data.tenantName,
    title: "Witness Statement Form",
    description: `Witness Statement Form for Incident ${data.referenceId}`,
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
        children: [
          // Header with Tenant Name and HSSE Department
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: data.tenantName.toUpperCase(),
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
                text: "WITNESS STATEMENT FORM",
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
                children: [
                  createLabelCell("Reference No"),
                  createValueCell(data.referenceId),
                ],
              }),
              new TableRow({
                children: [
                  createLabelCell("Incident Title"),
                  createValueCell(data.title),
                ],
              }),
              new TableRow({
                children: [
                  createLabelCell("Date & Time"),
                  createValueCell(dateTimeText),
                ],
              }),
              new TableRow({
                children: [
                  createLabelCell("Location"),
                  createValueCell(locationText),
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
              createEmptyFieldRow("Full Name"),
              createEmptyFieldRow("Employee ID"),
              createEmptyFieldRow("Position / Job Title"),
              createEmptyFieldRow("Department"),
              createEmptyFieldRow("Contact Number"),
              createEmptyFieldRow("Email Address"),
            ],
          }),

          // Section 3: Statement
          createSectionTitle("STATEMENT"),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "I, the undersigned, hereby state the following regarding the incident referenced above:",
                italics: true,
                size: 22,
                font: "Arial",
              }),
            ],
          }),

          // Statement lines
          ...Array(15)
            .fill(null)
            .map(
              () =>
                new Paragraph({
                  spacing: { after: 300 },
                  border: {
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
                  },
                  children: [
                    new TextRun({
                      text: " ",
                      size: 22,
                    }),
                  ],
                })
            ),

          // Section 4: Declaration
          createSectionTitle("DECLARATION"),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: "I declare that this statement is true and accurate to the best of my knowledge and belief. I understand that providing false information may result in disciplinary action.",
                size: 22,
                font: "Arial",
              }),
            ],
          }),

          // Signature section
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NIL },
              bottom: { style: BorderStyle.NIL },
              left: { style: BorderStyle.NIL },
              right: { style: BorderStyle.NIL },
              insideHorizontal: { style: BorderStyle.NIL },
              insideVertical: { style: BorderStyle.NIL },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 400 },
                        children: [
                          new TextRun({
                            text: "Signature: _________________________",
                            size: 22,
                            font: "Arial",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 400 },
                        children: [
                          new TextRun({
                            text: "Date: _________________________",
                            size: 22,
                            font: "Arial",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Footer note
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 },
            children: [
              new TextRun({
                text: `Generated on ${format(new Date(), "PPpp")} | ${data.tenantName} HSSE Department`,
                size: 18,
                font: "Arial",
                color: "9CA3AF",
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Witness_Statement_${data.referenceId.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
