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

interface NameIdMap {
  [name: string]: string;
}

interface ParentMaps {
  categoryCodeMap: CodeIdMap;
  categoryNameMap: NameIdMap;
  typeCodeMap: CodeIdMap;
  typeNameMap: NameIdMap;
  subtypeCodeMap: CodeIdMap;
  subtypeNameMap: NameIdMap;
}

interface SkippedItem {
  code: string;
  name: string;
  level: string;
  reason: string;
}

interface ImportOptions {
  parseResult: ParseResult;
  mode: ImportMode;
  fileName?: string;
}

type ProgressCallback = (phase: ImportProgress['phase'], current: number, total: number) => void;

/**
 * Pre-load existing categories, types, and subtypes from the database
 * to allow parent lookups against pre-existing records
 */
async function loadExistingParentMaps(tenantId: string): Promise<ParentMaps> {
  const [categoriesRes, typesRes, subtypesRes] = await Promise.all([
    supabase
      .from('asset_categories')
      .select('id, code, name')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
    supabase
      .from('asset_types')
      .select('id, code, name')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
    supabase
      .from('asset_subtypes')
      .select('id, code, name')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
  ]);

  const categoryCodeMap: CodeIdMap = {};
  const categoryNameMap: NameIdMap = {};
  const typeCodeMap: CodeIdMap = {};
  const typeNameMap: NameIdMap = {};
  const subtypeCodeMap: CodeIdMap = {};
  const subtypeNameMap: NameIdMap = {};

  categoriesRes.data?.forEach(c => {
    categoryCodeMap[c.code.toLowerCase()] = c.id;
    categoryNameMap[c.name.toLowerCase()] = c.id;
  });

  typesRes.data?.forEach(t => {
    typeCodeMap[t.code.toLowerCase()] = t.id;
    typeNameMap[t.name.toLowerCase()] = t.id;
  });

  subtypesRes.data?.forEach(s => {
    subtypeCodeMap[s.code.toLowerCase()] = s.id;
    subtypeNameMap[s.name.toLowerCase()] = s.id;
  });

  return {
    categoryCodeMap,
    categoryNameMap,
    typeCodeMap,
    typeNameMap,
    subtypeCodeMap,
    subtypeNameMap,
  };
}

/**
 * Find parent ID by code first, then fallback to name matching
 */
function findParentId(
  parentCode: string,
  codeMap: CodeIdMap,
  nameMap: NameIdMap
): string | null {
  const normalized = parentCode.toLowerCase().trim();
  
  // First try exact code match
  if (codeMap[normalized]) return codeMap[normalized];
  
  // Fallback: try matching by name
  if (nameMap[normalized]) return nameMap[normalized];
  
  return null;
}

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
  categoryCodeMap: CodeIdMap,
  categoryNameMap: NameIdMap,
  mode: ImportMode,
  skippedItems: SkippedItem[],
  onProgress?: ProgressCallback
): Promise<{ created: number; updated: number; codeIdMap: CodeIdMap; nameIdMap: NameIdMap }> {
  const validTypes = types.filter(t => t.isValid);
  const total = validTypes.length;
  
  if (total === 0) return { created: 0, updated: 0, codeIdMap: {}, nameIdMap: {} };
  
  const codeIdMap: CodeIdMap = {};
  const nameIdMap: NameIdMap = {};
  let created = 0;
  let updated = 0;
  
  for (let i = 0; i < validTypes.length; i++) {
    const type = validTypes[i];
    onProgress?.('types', i + 1, total);
    
    const categoryId = findParentId(type.parentCode, categoryCodeMap, categoryNameMap);
    if (!categoryId) {
      skippedItems.push({
        code: type.code,
        name: type.nameEn,
        level: 'Type',
        reason: `Parent category "${type.parentCode}" not found`,
      });
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
      nameIdMap[type.nameEn.toLowerCase()] = existing.id;
      
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
      skippedItems.push({
        code: type.code,
        name: type.nameEn,
        level: 'Type',
        reason: `Database error: ${error.message}`,
      });
      continue;
    }
    
    codeIdMap[type.code.toLowerCase()] = inserted.id;
    nameIdMap[type.nameEn.toLowerCase()] = inserted.id;
    created++;
  }
  
  return { created, updated, codeIdMap, nameIdMap };
}

async function importSubtypes(
  subtypes: ParsedHierarchyRow[],
  tenantId: string,
  typeCodeMap: CodeIdMap,
  typeNameMap: NameIdMap,
  mode: ImportMode,
  skippedItems: SkippedItem[],
  onProgress?: ProgressCallback
): Promise<{ created: number; updated: number; codeIdMap: CodeIdMap; nameIdMap: NameIdMap }> {
  const validSubtypes = subtypes.filter(s => s.isValid);
  const total = validSubtypes.length;
  
  if (total === 0) return { created: 0, updated: 0, codeIdMap: {}, nameIdMap: {} };
  
  const codeIdMap: CodeIdMap = {};
  const nameIdMap: NameIdMap = {};
  let created = 0;
  let updated = 0;
  
  for (let i = 0; i < validSubtypes.length; i++) {
    const subtype = validSubtypes[i];
    onProgress?.('subtypes', i + 1, total);
    
    const typeId = findParentId(subtype.parentCode, typeCodeMap, typeNameMap);
    if (!typeId) {
      skippedItems.push({
        code: subtype.code,
        name: subtype.nameEn,
        level: 'Subtype',
        reason: `Parent type "${subtype.parentCode}" not found`,
      });
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
      nameIdMap[subtype.nameEn.toLowerCase()] = existing.id;
      
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
      skippedItems.push({
        code: subtype.code,
        name: subtype.nameEn,
        level: 'Subtype',
        reason: `Database error: ${error.message}`,
      });
      continue;
    }
    
    codeIdMap[subtype.code.toLowerCase()] = inserted.id;
    nameIdMap[subtype.nameEn.toLowerCase()] = inserted.id;
    created++;
  }
  
  return { created, updated, codeIdMap, nameIdMap };
}

async function importParts(
  parts: ParsedHierarchyRow[],
  tenantId: string,
  typeCodeMap: CodeIdMap,
  typeNameMap: NameIdMap,
  subtypeCodeMap: CodeIdMap,
  subtypeNameMap: NameIdMap,
  mode: ImportMode,
  skippedItems: SkippedItem[],
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
    
    // Try to find parent - first check subtypes, then types
    const subtypeId = findParentId(part.parentCode, subtypeCodeMap, subtypeNameMap);
    const typeId = findParentId(part.parentCode, typeCodeMap, typeNameMap);
    
    if (!subtypeId && !typeId) {
      skippedItems.push({
        code: part.code || '',
        name: part.nameEn,
        level: 'Part',
        reason: `Parent "${part.parentCode}" not found (expected Type or Subtype)`,
      });
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
      skippedItems.push({
        code: part.code || '',
        name: part.nameEn,
        level: 'Part',
        reason: `Database error: ${error.message}`,
      });
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
    
    // Pre-load existing parent maps from database for parent lookups
    const existingMaps = await loadExistingParentMaps(tenantId);
    const skippedItems: SkippedItem[] = [];
    
    // Initialize progress
    onProgress({
      phase: 'categories',
      categories: { current: 0, total: totals.categories },
      types: { current: 0, total: totals.types },
      subtypes: { current: 0, total: totals.subtypes },
      parts: { current: 0, total: totals.parts },
    });
    
    // Import Categories
    const { created: categoriesCreated, updated: categoriesUpdated, codeIdMap: newCatCodeMap } = 
      await importCategories(parseResult.categories, tenantId, mode, progressCallback);
    
    // Merge existing + new category maps
    const categoryCodeMap = { ...existingMaps.categoryCodeMap, ...newCatCodeMap };
    const categoryNameMap = { ...existingMaps.categoryNameMap };
    
    // Import Types
    const { created: typesCreated, updated: typesUpdated, codeIdMap: newTypeCodeMap, nameIdMap: newTypeNameMap } = 
      await importTypes(parseResult.types, tenantId, categoryCodeMap, categoryNameMap, mode, skippedItems, progressCallback);
    
    // Merge existing + new type maps
    const typeCodeMap = { ...existingMaps.typeCodeMap, ...newTypeCodeMap };
    const typeNameMap = { ...existingMaps.typeNameMap, ...newTypeNameMap };
    
    // Import Subtypes
    const { created: subtypesCreated, updated: subtypesUpdated, codeIdMap: newSubtypeCodeMap, nameIdMap: newSubtypeNameMap } = 
      await importSubtypes(parseResult.subtypes, tenantId, typeCodeMap, typeNameMap, mode, skippedItems, progressCallback);
    
    // Merge existing + new subtype maps
    const subtypeCodeMap = { ...existingMaps.subtypeCodeMap, ...newSubtypeCodeMap };
    const subtypeNameMap = { ...existingMaps.subtypeNameMap, ...newSubtypeNameMap };
    
    // Import Parts
    const { created: partsCreated, updated: partsUpdated } = 
      await importParts(parseResult.parts, tenantId, typeCodeMap, typeNameMap, subtypeCodeMap, subtypeNameMap, mode, skippedItems, progressCallback);
    
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
    const skippedCount = skippedItems.length;
    
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
