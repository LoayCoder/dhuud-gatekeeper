/**
 * Hook for bulk importing visitors from CSV/Excel files
 * Handles validation, batch inserts, and QR code generation
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

// Types for bulk import
export interface BulkVisitorRow {
  full_name: string;
  phone?: string;
  national_id?: string;
  company_name?: string;
  nationality?: string;
  email?: string;
  host_name?: string;
  host_phone?: string;
  visitor_type?: string;
}

export interface ParsedVisitorRow extends BulkVisitorRow {
  valid: boolean;
  errors: string[];
  rowIndex: number;
}

export interface BulkImportResult {
  successCount: number;
  failCount: number;
  errors: Array<{ rowIndex: number; name: string; error: string }>;
}

// Column aliases for header mapping (English and Arabic)
export const VISITOR_COLUMN_ALIASES: Record<string, string[]> = {
  full_name: ['name', 'fullname', 'full_name', 'visitor_name', 'الاسم', 'اسم الزائر', 'الاسم الكامل'],
  phone: ['phone', 'phone_number', 'mobile', 'mobile_number', 'رقم الجوال', 'الهاتف', 'رقم الهاتف'],
  national_id: ['national_id', 'id', 'id_number', 'iqama', 'iqama_number', 'رقم الهوية', 'رقم الإقامة'],
  company_name: ['company', 'company_name', 'organization', 'الشركة', 'اسم الشركة', 'المنظمة'],
  nationality: ['nationality', 'country', 'الجنسية', 'البلد'],
  email: ['email', 'email_address', 'البريد', 'البريد الإلكتروني'],
  host_name: ['host', 'host_name', 'sponsor', 'المستضيف', 'اسم المستضيف'],
  host_phone: ['host_phone', 'host_mobile', 'sponsor_phone', 'هاتف المستضيف'],
  visitor_type: ['type', 'visitor_type', 'نوع الزائر', 'النوع'],
};

// Valid visitor types
const VALID_VISITOR_TYPES = ['guest', 'contractor', 'vendor', 'delivery', 'interview', 'vip', 'other'];

// Generate a unique QR token
const generateQRToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Validate a single row
export const validateVisitorRow = (
  row: BulkVisitorRow,
  rowIndex: number,
  t: (key: string, fallback: string) => string
): ParsedVisitorRow => {
  const errors: string[] = [];

  // Required: full_name
  if (!row.full_name || row.full_name.trim().length < 2) {
    errors.push(t('bulkImportVisitors.errors.nameRequired', 'Name is required (min 2 characters)'));
  }

  // Optional: phone validation
  if (row.phone) {
    const cleanPhone = row.phone.replace(/[\s\-\(\)]/g, '');
    if (!/^\+?[0-9]{8,15}$/.test(cleanPhone)) {
      errors.push(t('bulkImportVisitors.errors.invalidPhone', 'Invalid phone format'));
    }
  }

  // Optional: national_id validation
  if (row.national_id && row.national_id.length < 5) {
    errors.push(t('bulkImportVisitors.errors.invalidId', 'National ID must be at least 5 characters'));
  }

  // Optional: email validation
  if (row.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email.trim())) {
      errors.push(t('bulkImportVisitors.errors.invalidEmail', 'Invalid email format'));
    }
  }

  // Optional: visitor_type validation
  if (row.visitor_type && !VALID_VISITOR_TYPES.includes(row.visitor_type.toLowerCase())) {
    errors.push(t('bulkImportVisitors.errors.invalidType', 'Invalid visitor type'));
  }

  return {
    ...row,
    valid: errors.length === 0,
    errors,
    rowIndex,
  };
};

// Map CSV header to our field names
export const mapColumnHeader = (header: string): string | null => {
  const normalizedHeader = header.toLowerCase().trim();
  
  for (const [field, aliases] of Object.entries(VISITOR_COLUMN_ALIASES)) {
    if (aliases.some(alias => normalizedHeader === alias || normalizedHeader.includes(alias))) {
      return field;
    }
  }
  
  return null;
};

// Parse CSV line handling quoted values
export const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

// Hook for bulk importing visitors
export function useBulkImportVisitors() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (validRows: ParsedVisitorRow[]): Promise<BulkImportResult> => {
      if (!profile?.tenant_id) {
        throw new Error('No tenant ID found');
      }

      const BATCH_SIZE = 50;
      let successCount = 0;
      let failCount = 0;
      const errors: Array<{ rowIndex: number; name: string; error: string }> = [];

      // Process in batches
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE);
        
        const visitorsToInsert = batch.map(row => ({
          full_name: row.full_name.trim(),
          phone: row.phone?.trim() || null,
          national_id: row.national_id?.trim() || null,
          company_name: row.company_name?.trim() || null,
          nationality: row.nationality?.trim() || null,
          email: row.email?.trim() || null,
          host_name: row.host_name?.trim() || null,
          host_phone: row.host_phone?.trim() || null,
          visitor_type: (row.visitor_type?.toLowerCase().trim() as any) || 'guest',
          qr_code_token: generateQRToken(),
          tenant_id: profile.tenant_id,
          is_active: true,
        }));

        const { data, error } = await supabase
          .from('visitors')
          .insert(visitorsToInsert)
          .select('id');

        if (error) {
          // If batch insert fails, try individual inserts
          for (const row of batch) {
            try {
              const { error: singleError } = await supabase
                .from('visitors')
                .insert({
                  full_name: row.full_name.trim(),
                  phone: row.phone?.trim() || null,
                  national_id: row.national_id?.trim() || null,
                  company_name: row.company_name?.trim() || null,
                  nationality: row.nationality?.trim() || null,
                  email: row.email?.trim() || null,
                  host_name: row.host_name?.trim() || null,
                  host_phone: row.host_phone?.trim() || null,
                  visitor_type: (row.visitor_type?.toLowerCase().trim() as any) || 'guest',
                  qr_code_token: generateQRToken(),
                  tenant_id: profile.tenant_id,
                  is_active: true,
                });

              if (singleError) {
                failCount++;
                errors.push({
                  rowIndex: row.rowIndex,
                  name: row.full_name,
                  error: singleError.message,
                });
              } else {
                successCount++;
              }
            } catch (err) {
              failCount++;
              errors.push({
                rowIndex: row.rowIndex,
                name: row.full_name,
                error: err instanceof Error ? err.message : 'Unknown error',
              });
            }
          }
        } else {
          successCount += data?.length || batch.length;
        }
      }

      return { successCount, failCount, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      
      if (result.failCount === 0) {
        toast({
          title: t('bulkImportVisitors.success', 'Import Complete'),
          description: t('bulkImportVisitors.allImported', '{{count}} visitors imported successfully', { 
            count: result.successCount 
          }),
        });
      } else {
        toast({
          title: t('bulkImportVisitors.partialSuccess', 'Import Completed with Errors'),
          description: t('bulkImportVisitors.partialResult', '{{success}} imported, {{failed}} failed', { 
            success: result.successCount, 
            failed: result.failCount 
          }),
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error instanceof Error ? error.message : t('bulkImportVisitors.importFailed', 'Failed to import visitors'),
        variant: 'destructive',
      });
    },
  });
}
