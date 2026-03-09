/**
 * Shared ExcelJS utilities for reading and writing Excel files.
 * Replaces the vulnerable `xlsx` (SheetJS) package.
 */
import ExcelJS from 'exceljs';

/**
 * Read an Excel file (ArrayBuffer) and return rows as array-of-arrays (like XLSX.utils.sheet_to_json with header:1).
 * Returns the first (or named) sheet data.
 */
export async function readExcelAsRows(
  data: ArrayBuffer,
  options?: { sheetName?: string; sheetSelector?: (names: string[]) => string }
): Promise<unknown[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);

  let sheet: ExcelJS.Worksheet | undefined;
  if (options?.sheetSelector) {
    const names = workbook.worksheets.map(ws => ws.name);
    const selectedName = options.sheetSelector(names);
    sheet = workbook.getWorksheet(selectedName);
  } else if (options?.sheetName) {
    sheet = workbook.getWorksheet(options.sheetName);
  }
  if (!sheet) {
    sheet = workbook.worksheets[0];
  }
  if (!sheet) return [];

  const rows: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    // row.values is 1-indexed, so slice(1) to get 0-indexed array
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    rows.push(values.map(v => (v === null || v === undefined) ? '' : v));
  });
  return rows;
}

/**
 * Read an Excel file and return rows as array of key-value objects (like XLSX.utils.sheet_to_json).
 * First row is used as headers.
 */
export async function readExcelAsObjects<T = Record<string, unknown>>(
  data: ArrayBuffer,
  options?: { sheetName?: string; sheetSelector?: (names: string[]) => string }
): Promise<T[]> {
  const rows = await readExcelAsRows(data, options);
  if (rows.length < 1) return [];

  const headers = rows[0].map(h => String(h ?? '').trim());
  const result: T[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, unknown> = {};
    let hasValue = false;
    headers.forEach((header, idx) => {
      if (header) {
        const val = idx < row.length ? row[idx] : '';
        obj[header] = val === null || val === undefined ? '' : val;
        if (val !== '' && val !== null && val !== undefined) hasValue = true;
      }
    });
    if (hasValue) {
      result.push(obj as T);
    }
  }
  return result;
}

/**
 * Create a simple Excel workbook from data and trigger download.
 * Replacement for XLSX.utils.json_to_sheet + XLSX.writeFile pattern.
 */
export async function writeExcelAndDownload(
  sheets: Array<{
    name: string;
    data: Record<string, unknown>[];
    columnWidths?: number[];
  }>,
  filename: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  for (const sheetDef of sheets) {
    const sheet = workbook.addWorksheet(sheetDef.name);
    
    if (sheetDef.data.length === 0) continue;

    // Add headers from first row keys
    const headers = Object.keys(sheetDef.data[0]);
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
    });

    // Add data rows
    for (const row of sheetDef.data) {
      sheet.addRow(headers.map(h => row[h] ?? ''));
    }

    // Set column widths
    if (sheetDef.columnWidths) {
      sheetDef.columnWidths.forEach((w, i) => {
        if (sheet.columns[i]) {
          sheet.getColumn(i + 1).width = w;
        }
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create a workbook from array-of-arrays and download.
 * Replacement for XLSX.utils.aoa_to_sheet + XLSX.writeFile pattern.
 */
export async function writeExcelAoaAndDownload(
  sheets: Array<{
    name: string;
    data: unknown[][];
    columnWidths?: number[];
  }>,
  filename: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  for (const sheetDef of sheets) {
    const sheet = workbook.addWorksheet(sheetDef.name);
    
    for (const row of sheetDef.data) {
      sheet.addRow(row);
    }

    if (sheetDef.columnWidths) {
      sheetDef.columnWidths.forEach((w, i) => {
        sheet.getColumn(i + 1).width = w;
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
