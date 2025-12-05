/**
 * Export utilities for downloading data as CSV or Excel files
 */

export interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: unknown) => string;
}

/**
 * Export data to CSV format
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns: ExportColumn[]
): void {
  // Create CSV header
  const header = columns.map(col => `"${col.label.replace(/"/g, '""')}"`).join(',');
  
  // Create CSV rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      const formatted = col.formatter ? col.formatter(value) : String(value ?? '');
      // Escape quotes and wrap in quotes
      return `"${formatted.replace(/"/g, '""')}"`;
    }).join(',');
  });
  
  // Add UTF-8 BOM for proper Arabic/Unicode support
  const BOM = '\uFEFF';
  const csvContent = BOM + header + '\n' + rows.join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Export data to Excel (XLSX) format using simple XML structure
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns: ExportColumn[]
): void {
  // Create XML-based Excel format
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#E0E0E0" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Users">
    <Table>`;
  
  const xmlFooter = `
    </Table>
  </Worksheet>
</Workbook>`;
  
  // Create header row
  const headerRow = `
      <Row>
        ${columns.map(col => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(col.label)}</Data></Cell>`).join('\n        ')}
      </Row>`;
  
  // Create data rows
  const dataRows = data.map(row => {
    const cells = columns.map(col => {
      const value = row[col.key];
      const formatted = col.formatter ? col.formatter(value) : String(value ?? '');
      return `<Cell><Data ss:Type="String">${escapeXml(formatted)}</Data></Cell>`;
    }).join('\n        ');
    return `
      <Row>
        ${cells}
      </Row>`;
  }).join('');
  
  const xmlContent = xmlHeader + headerRow + dataRows + xmlFooter;
  
  // Create and download file
  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, filename.replace('.xlsx', '.xls'));
}

/**
 * Helper to escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Helper to trigger file download
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
