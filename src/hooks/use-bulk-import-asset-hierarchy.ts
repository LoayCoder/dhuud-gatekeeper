/**
 * Hook for bulk importing asset hierarchy (categories, types, subtypes, parts)
 * Supports both insert-only and update-or-insert modes with real-time progress tracking
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { ParsedHierarchyRow, ParseResult, ImportMode } from '@/lib/asset-hierarchy-import-utils';

export interface ImportResult {
  success: boolean;
  categoriesCreated: number;
  categoriesUpdated: number;
  typesCreated: number;
  typesUpdated: number;
  subtypesCreated: number;
  subtypesUpdated: number;
  partsCreated: number;
  partsUpdated: number;
  skippedCount: number;
  errors: string[];
}

export interface ImportProgress {
  phase: 'idle' | 'categories' | 'types' | 'subtypes' | 'parts' | 'complete';
  categories: { current: number; total: number };
  types: { current: number; total: number };
  subtypes: { current: number; total: number };
  parts: { current: number; total: number };
}

interface CodeIdMap {
  [code: string]: string;
}

interface ImportOptions {
  parseResult: ParseResult;
  mode: ImportMode;
  fileName?: string;
}

type ProgressCallback = (phase: ImportProgress['phase'], current: number, total: number) => void;

async function getTenantId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();
  
  if (!profile?.tenant_id) throw new Error('No tenant ID found');
  return profile.tenant_id;
}

async function importCategories(
  categories: ParsedHierarchyRow[],
  tenantId: string,
  mode: ImportMode,
  onProgress?: ProgressCallback
): Promise<{ created: number; updated: number; codeIdMap: CodeIdMap }> {
  const validCategories = categories.filter(c => c.isValid);
  const total = validCategories.length;
  
  if (total === 0) return { created: 0, updated: 0, codeIdMap: {} };
  
  const codeIdMap: CodeIdMap = {};
  let created = 0;
  let updated = 0;
  
  for (let i = 0; i < validCategories.length; i++) {
    const cat = validCategories[i];
    onProgress?.('categories', i + 1, total);
    
    // Check if category already exists
    const { data: existing } = await supabase
      .from('asset_categories')
      .select('id, code')
      .eq('code', cat.code)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (existing) {
      codeIdMap[cat.code.toLowerCase()] = existing.id;
      
      if (mode === 'update_or_insert') {
        // Update existing category
        const { error } = await supabase
          .from('asset_categories')
          .update({
            name: cat.nameEn,
            name_ar: cat.nameAr || null,
            sort_order: cat.sortOrder,
          })
          .eq('id', existing.id);
        
        if (!error) updated++;
      }
      continue;
    }
    
    // Insert new category
    const { data: inserted, error } = await supabase
      .from('asset_categories')
      .insert({
        code: cat.code,
        name: cat.nameEn,
        name_ar: cat.nameAr || null,
        tenant_id: tenantId,
        is_active: true,
        sort_order: cat.sortOrder,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Failed to insert category:', error);
      continue;
    }
    
    codeIdMap[cat.code.toLowerCase()] = inserted.id;
    created++;
  }
  
  return { created, updated, codeIdMap };
}

async function importTypes(
  types: ParsedHierarchyRow[],
  tenantId: string,
  categoryMap: CodeIdMap,
  mode: ImportMode,
  onProgress?: ProgressCallback
): Promise<{ created: number; updated: number; codeIdMap: CodeIdMap }> {
  const validTypes = types.filter(t => t.isValid);
  const total = validTypes.length;
  
  if (total === 0) return { created: 0, updated: 0, codeIdMap: {} };
  
  const codeIdMap: CodeIdMap = {};
  let created = 0;
  let updated = 0;
  
  for (let i = 0; i < validTypes.length; i++) {
    const type = validTypes[i];
    onProgress?.('types', i + 1, total);
    
    const categoryId = categoryMap[type.parentCode.toLowerCase()];
    if (!categoryId) {
      console.warn(`Parent category not found for type: ${type.code}`);
      continue;
    }
    
    // Check if type already exists
    const { data: existing } = await supabase
      .from('asset_types')
      .select('id, code')
      .eq('code', type.code)
      .eq('category_id', categoryId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (existing) {
      codeIdMap[type.code.toLowerCase()] = existing.id;
      
      if (mode === 'update_or_insert') {
        const { error } = await supabase
          .from('asset_types')
          .update({
            name: type.nameEn,
            name_ar: type.nameAr || null,
          })
          .eq('id', existing.id);
        
        if (!error) updated++;
      }
      continue;
    }
    
    // Insert new type
    const { data: inserted, error } = await supabase
      .from('asset_types')
      .insert({
        code: type.code,
        name: type.nameEn,
        name_ar: type.nameAr || null,
        category_id: categoryId,
        tenant_id: tenantId,
        is_active: true,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Failed to insert type:', error);
      continue;
    }
    
    codeIdMap[type.code.toLowerCase()] = inserted.id;
    created++;
  }
  
  return { created, updated, codeIdMap };
}

async function importSubtypes(
  subtypes: ParsedHierarchyRow[],
  tenantId: string,
  typeMap: CodeIdMap,
  mode: ImportMode,
  onProgress?: ProgressCallback
): Promise<{ created: number; updated: number; codeIdMap: CodeIdMap }> {
  const validSubtypes = subtypes.filter(s => s.isValid);
  const total = validSubtypes.length;
  
  if (total === 0) return { created: 0, updated: 0, codeIdMap: {} };
  
  const codeIdMap: CodeIdMap = {};
  let created = 0;
  let updated = 0;
  
  for (let i = 0; i < validSubtypes.length; i++) {
    const subtype = validSubtypes[i];
    onProgress?.('subtypes', i + 1, total);
    
    const typeId = typeMap[subtype.parentCode.toLowerCase()];
    if (!typeId) {
      console.warn(`Parent type not found for subtype: ${subtype.code}`);
      continue;
    }
    
    // Check if subtype already exists
    const { data: existing } = await supabase
      .from('asset_subtypes')
      .select('id, code')
      .eq('code', subtype.code)
      .eq('type_id', typeId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (existing) {
      codeIdMap[subtype.code.toLowerCase()] = existing.id;
      
      if (mode === 'update_or_insert') {
        const { error } = await supabase
          .from('asset_subtypes')
          .update({
            name: subtype.nameEn,
            name_ar: subtype.nameAr || null,
          })
          .eq('id', existing.id);
        
        if (!error) updated++;
      }
      continue;
    }
    
    // Insert new subtype
    const { data: inserted, error } = await supabase
      .from('asset_subtypes')
      .insert({
        code: subtype.code,
        name: subtype.nameEn,
        name_ar: subtype.nameAr || null,
        type_id: typeId,
        tenant_id: tenantId,
        is_active: true,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Failed to insert subtype:', error);
      continue;
    }
    
    codeIdMap[subtype.code.toLowerCase()] = inserted.id;
    created++;
  }
  
  return { created, updated, codeIdMap };
}

async function importParts(
  parts: ParsedHierarchyRow[],
  tenantId: string,
  typeMap: CodeIdMap,
  subtypeMap: CodeIdMap,
  mode: ImportMode,
  onProgress?: ProgressCallback
): Promise<{ created: number; updated: number }> {
  const validParts = parts.filter(p => p.isValid);
  const total = validParts.length;
  
  if (total === 0) return { created: 0, updated: 0 };
  
  let created = 0;
  let updated = 0;
  
  for (let i = 0; i < validParts.length; i++) {
    const part = validParts[i];
    onProgress?.('parts', i + 1, total);
    
    const parentCode = part.parentCode.toLowerCase();
    const subtypeId = subtypeMap[parentCode];
    const typeId = typeMap[parentCode];
    
    if (!subtypeId && !typeId) {
      console.warn(`Parent not found for part: ${part.code || part.nameEn}`);
      continue;
    }
    
    // Check if part already exists (by code if provided, otherwise by name)
    let existing = null;
    
    if (part.code) {
      const query = supabase
        .from('asset_type_parts')
        .select('id')
        .eq('code', part.code)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);
      
      if (subtypeId) {
        query.eq('subtype_id', subtypeId);
      } else {
        query.eq('type_id', typeId);
      }
      
      const { data } = await query.maybeSingle();
      existing = data;
    }
    
    if (!existing) {
      // Also check by name for parts without codes
      const nameQuery = supabase
        .from('asset_type_parts')
        .select('id')
        .eq('name', part.nameEn)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);
      
      if (subtypeId) {
        nameQuery.eq('subtype_id', subtypeId);
      } else {
        nameQuery.eq('type_id', typeId);
      }
      
      const { data } = await nameQuery.maybeSingle();
      existing = data;
    }
    
    if (existing) {
      if (mode === 'update_or_insert') {
        // Update existing part
        const { error } = await supabase
          .from('asset_type_parts')
          .update({
            code: part.code || null,
            name: part.nameEn,
            name_ar: part.nameAr || null,
            description: part.descriptionEn || null,
            description_ar: part.descriptionAr || null,
            is_critical: part.isCritical,
            default_response_type: part.responseType,
            sort_order: part.sortOrder,
          })
          .eq('id', existing.id);
        
        if (!error) updated++;
      }
      continue;
    }
    
    // Insert new part
    const { error } = await supabase
      .from('asset_type_parts')
      .insert({
        code: part.code || null,
        name: part.nameEn,
        name_ar: part.nameAr || null,
        description: part.descriptionEn || null,
        description_ar: part.descriptionAr || null,
        type_id: subtypeId ? null : typeId,
        subtype_id: subtypeId || null,
        tenant_id: tenantId,
        is_critical: part.isCritical,
        default_response_type: part.responseType,
        sort_order: part.sortOrder,
        is_active: true,
      });
    
    if (error) {
      console.error('Failed to insert part:', error);
      continue;
    }
    
    created++;
  }
  
  return { created, updated };
}

async function logImportHistory(
  tenantId: string,
  userId: string,
  fileName: string | null,
  mode: ImportMode,
  result: ImportResult
): Promise<void> {
  try {
    const totalProcessed = 
      result.categoriesCreated + result.categoriesUpdated +
      result.typesCreated + result.typesUpdated +
      result.subtypesCreated + result.subtypesUpdated +
      result.partsCreated + result.partsUpdated;

    const status = result.success 
      ? (result.errors.length > 0 ? 'partial' : 'success')
      : 'failed';

    await supabase.from('asset_import_history').insert({
      tenant_id: tenantId,
      user_id: userId,
      file_name: fileName,
      import_mode: mode,
      categories_created: result.categoriesCreated,
      categories_updated: result.categoriesUpdated,
      types_created: result.typesCreated,
      types_updated: result.typesUpdated,
      subtypes_created: result.subtypesCreated,
      subtypes_updated: result.subtypesUpdated,
      parts_created: result.partsCreated,
      parts_updated: result.partsUpdated,
      total_rows_processed: totalProcessed,
      skipped_count: result.skippedCount,
      status,
      error_messages: result.errors.length > 0 ? result.errors : null,
    });
  } catch (error) {
    console.error('Failed to log import history:', error);
  }
}

async function performBulkImportWithProgress(
  options: ImportOptions,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const { parseResult, mode, fileName } = options;
  const errors: string[] = [];
  
  // Get user info for logging
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  
  // Initialize totals for progress
  const totals = {
    categories: parseResult.categories.filter(c => c.isValid).length,
    types: parseResult.types.filter(t => t.isValid).length,
    subtypes: parseResult.subtypes.filter(s => s.isValid).length,
    parts: parseResult.parts.filter(p => p.isValid).length,
  };
  
  const progressCallback: ProgressCallback = (phase, current, total) => {
    onProgress({
      phase,
      categories: { 
        current: phase === 'categories' ? current : (phase !== 'idle' ? totals.categories : 0), 
        total: totals.categories 
      },
      types: { 
        current: phase === 'types' ? current : (['subtypes', 'parts', 'complete'].includes(phase) ? totals.types : 0), 
        total: totals.types 
      },
      subtypes: { 
        current: phase === 'subtypes' ? current : (['parts', 'complete'].includes(phase) ? totals.subtypes : 0), 
        total: totals.subtypes 
      },
      parts: { 
        current: phase === 'parts' ? current : (phase === 'complete' ? totals.parts : 0), 
        total: totals.parts 
      },
    });
  };
  
  try {
    const tenantId = await getTenantId();
    
    // Initialize progress
    onProgress({
      phase: 'categories',
      categories: { current: 0, total: totals.categories },
      types: { current: 0, total: totals.types },
      subtypes: { current: 0, total: totals.subtypes },
      parts: { current: 0, total: totals.parts },
    });
    
    // Import in order: Categories → Types → Subtypes → Parts
    const { created: categoriesCreated, updated: categoriesUpdated, codeIdMap: categoryMap } = 
      await importCategories(parseResult.categories, tenantId, mode, progressCallback);
    
    const { created: typesCreated, updated: typesUpdated, codeIdMap: typeMap } = 
      await importTypes(parseResult.types, tenantId, categoryMap, mode, progressCallback);
    
    const { created: subtypesCreated, updated: subtypesUpdated, codeIdMap: subtypeMap } = 
      await importSubtypes(parseResult.subtypes, tenantId, typeMap, mode, progressCallback);
    
    const { created: partsCreated, updated: partsUpdated } = 
      await importParts(parseResult.parts, tenantId, typeMap, subtypeMap, mode, progressCallback);
    
    // Mark as complete
    onProgress({
      phase: 'complete',
      categories: { current: totals.categories, total: totals.categories },
      types: { current: totals.types, total: totals.types },
      subtypes: { current: totals.subtypes, total: totals.subtypes },
      parts: { current: totals.parts, total: totals.parts },
    });
    
    const totalCreated = categoriesCreated + typesCreated + subtypesCreated + partsCreated;
    const totalUpdated = categoriesUpdated + typesUpdated + subtypesUpdated + partsUpdated;
    const processed = totalCreated + totalUpdated;
    const skippedCount = parseResult.validCount - processed;
    
    const result: ImportResult = {
      success: true,
      categoriesCreated,
      categoriesUpdated,
      typesCreated,
      typesUpdated,
      subtypesCreated,
      subtypesUpdated,
      partsCreated,
      partsUpdated,
      skippedCount: Math.max(0, skippedCount),
      errors,
    };
    
    // Log import history
    if (userId) {
      await logImportHistory(tenantId, userId, fileName || null, mode, result);
    }
    
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    errors.push(message);
    
    const failedResult: ImportResult = {
      success: false,
      categoriesCreated: 0,
      categoriesUpdated: 0,
      typesCreated: 0,
      typesUpdated: 0,
      subtypesCreated: 0,
      subtypesUpdated: 0,
      partsCreated: 0,
      partsUpdated: 0,
      skippedCount: 0,
      errors,
    };
    
    // Log failed import
    const tenantId = await getTenantId().catch(() => null);
    if (userId && tenantId) {
      await logImportHistory(tenantId, userId, fileName || null, mode, failedResult);
    }
    
    return failedResult;
  }
}

const initialProgress: ImportProgress = {
  phase: 'idle',
  categories: { current: 0, total: 0 },
  types: { current: 0, total: 0 },
  subtypes: { current: 0, total: 0 },
  parts: { current: 0, total: 0 },
};

export function useBulkImportAssetHierarchy() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<ImportProgress>(initialProgress);
  
  const resetProgress = useCallback(() => {
    setProgress(initialProgress);
  }, []);
  
  const mutation = useMutation({
    mutationFn: (options: ImportOptions) => 
      performBulkImportWithProgress(options, setProgress),
    onSuccess: (result) => {
      if (result.success) {
        const totalCreated = result.categoriesCreated + result.typesCreated + 
                            result.subtypesCreated + result.partsCreated;
        const totalUpdated = result.categoriesUpdated + result.typesUpdated + 
                            result.subtypesUpdated + result.partsUpdated;
        const total = totalCreated + totalUpdated;
        
        toast.success(t('assetCategories.bulkImport.success', 'Import Complete'), {
          description: t('assetCategories.bulkImport.successDesc', 
            '{{total}} items processed ({{categories}} categories, {{types}} types, {{subtypes}} subtypes, {{parts}} parts). {{created}} created, {{updated}} updated.',
            {
              total,
              categories: result.categoriesCreated + result.categoriesUpdated,
              types: result.typesCreated + result.typesUpdated,
              subtypes: result.subtypesCreated + result.subtypesUpdated,
              parts: result.partsCreated + result.partsUpdated,
              created: totalCreated,
              updated: totalUpdated,
            }
          ),
        });
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
        queryClient.invalidateQueries({ queryKey: ['asset-types'] });
        queryClient.invalidateQueries({ queryKey: ['asset-subtypes'] });
        queryClient.invalidateQueries({ queryKey: ['asset-type-parts'] });
        queryClient.invalidateQueries({ queryKey: ['asset-import-history'] });
      } else {
        toast.error(t('assetCategories.bulkImport.failed', 'Import Failed'), {
          description: result.errors.join(', '),
        });
      }
      
      // Reset progress after a short delay to show completion
      setTimeout(resetProgress, 2000);
    },
    onError: (error) => {
      toast.error(t('assetCategories.bulkImport.failed', 'Import Failed'), {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      resetProgress();
    },
  });
  
  return { ...mutation, progress, resetProgress };
}
