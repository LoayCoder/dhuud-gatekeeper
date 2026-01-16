/**
 * Secure Export Utility
 * Validates export permissions and logs all export activities
 */

import { supabase } from '@/integrations/supabase/client';
import { logExport } from './audit-logger';
import { exportToExcel, exportToPDF } from './asset-report-export';
import { exportToCSV as exportToCSVUtil, ExportColumn as ExportUtilColumn } from './export-utils';
import type { EntityType } from './audit-logger';

export interface ReportColumn {
  id: string;
  label: string;
}

// Re-export for convenience
export type { ExportUtilColumn };

interface ExportPermissionResult {
  canExport: boolean;
  reason?: string;
}

/**
 * Check if user has export permission for a specific menu
 */
export async function validateExportPermission(
  userId: string,
  menuCode: string
): Promise<ExportPermissionResult> {
  try {
    const { data, error } = await supabase.rpc('get_user_menu_permissions', {
      _user_id: userId,
      _menu_code: menuCode,
    });

    if (error) {
      console.error('Error checking export permission:', error);
      return { canExport: false, reason: 'Permission check failed' };
    }

    if (!data || data.length === 0) {
      return { canExport: false, reason: 'No menu access' };
    }

    const permission = data[0] as Record<string, unknown>;
    
    // Check for explicit export permission or admin access
    if (permission.can_export === true) {
      return { canExport: true };
    }
    
    // Fallback: allow if user has read access (for backwards compatibility)
    if (permission.can_read === true) {
      return { canExport: true };
    }

    return { canExport: false, reason: 'Export permission denied' };
  } catch (err) {
    console.error('Export permission check exception:', err);
    return { canExport: false, reason: 'Permission check error' };
  }
}

/**
 * Secure export to Excel with permission validation and audit logging
 */
export async function secureExportToExcel(
  userId: string,
  menuCode: string,
  entityType: EntityType,
  data: Record<string, unknown>[],
  columns: ReportColumn[],
  reportTitle: string,
  filters?: Record<string, unknown>
): Promise<{ blob: Blob | null; error?: string }> {
  // Validate permission
  const permission = await validateExportPermission(userId, menuCode);
  
  if (!permission.canExport) {
    console.warn('Export permission denied for user:', userId, 'menu:', menuCode);
    return { blob: null, error: permission.reason };
  }

  // Log the export action
  await logExport(entityType, 'excel', data.length, filters);

  // Generate the Excel file
  try {
    const blob = await exportToExcel(data, columns, reportTitle);
    return { blob };
  } catch (err) {
    console.error('Excel export error:', err);
    return { blob: null, error: 'Export generation failed' };
  }
}

/**
 * Secure export to PDF with permission validation and audit logging
 */
export async function secureExportToPDF(
  userId: string,
  menuCode: string,
  entityType: EntityType,
  data: Record<string, unknown>[],
  columns: ReportColumn[],
  reportTitle: string,
  filters?: Record<string, unknown>
): Promise<{ blob: Blob | null; error?: string }> {
  // Validate permission
  const permission = await validateExportPermission(userId, menuCode);
  
  if (!permission.canExport) {
    console.warn('Export permission denied for user:', userId, 'menu:', menuCode);
    return { blob: null, error: permission.reason };
  }

  // Log the export action
  await logExport(entityType, 'pdf', data.length, filters);

  // Generate the PDF file
  try {
    const blob = await exportToPDF(data, columns, reportTitle);
    return { blob };
  } catch (err) {
    console.error('PDF export error:', err);
    return { blob: null, error: 'Export generation failed' };
  }
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
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
 * Secure export to CSV with permission validation and audit logging
 */
export async function secureExportToCSV<T extends object>(
  userId: string,
  menuCode: string,
  entityType: EntityType,
  data: T[],
  columns: ExportUtilColumn[],
  filename: string,
  filters?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  // Validate permission
  const permission = await validateExportPermission(userId, menuCode);
  
  if (!permission.canExport) {
    console.warn('Export permission denied for user:', userId, 'menu:', menuCode);
    return { success: false, error: permission.reason };
  }

  // Log the export action
  await logExport(entityType, 'csv', data.length, filters);

  // Generate and download the CSV file
  try {
    exportToCSVUtil(data, filename, columns);
    return { success: true };
  } catch (err) {
    console.error('CSV export error:', err);
    return { success: false, error: 'Export generation failed' };
  }
}

/**
 * Secure export wrapper that handles the complete flow
 */
export async function performSecureExport(
  userId: string,
  menuCode: string,
  entityType: EntityType,
  data: Record<string, unknown>[],
  columns: ReportColumn[],
  reportTitle: string,
  format: 'excel' | 'pdf' | 'csv',
  filters?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  // Handle CSV separately since it uses different column format
  if (format === 'csv') {
    const csvColumns: ExportUtilColumn[] = columns.map(c => ({
      key: c.id,
      label: c.label,
    }));
    const filename = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    return secureExportToCSV(userId, menuCode, entityType, data, csvColumns, filename, filters);
  }

  const exportFn = format === 'excel' ? secureExportToExcel : secureExportToPDF;
  const extension = format === 'excel' ? 'xlsx' : 'pdf';
  
  const result = await exportFn(
    userId, 
    menuCode, 
    entityType, 
    data, 
    columns, 
    reportTitle, 
    filters
  );

  if (!result.blob) {
    return { success: false, error: result.error };
  }

  const filename = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${extension}`;
  downloadBlob(result.blob, filename);
  
  return { success: true };
}
