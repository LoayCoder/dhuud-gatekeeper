/**
 * Hook for bulk importing asset hierarchy (categories, types, subtypes, parts)
 * Supports both insert-only and update-or-insert modes
 */

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

interface CodeIdMap {
  [code: string]: string;
}

interface ImportOptions {
  parseResult: ParseResult;
  mode: ImportMode;
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
  mode: ImportMode
): Promise<{ created: number; updated: number; codeIdMap: CodeIdMap }> {
  if (categories.length === 0) return { created: 0, updated: 0, codeIdMap: {} };
  
  const validCategories = categories.filter(c => c.isValid);
  const codeIdMap: CodeIdMap = {};
  let created = 0;
  let updated = 0;
  
  for (const cat of validCategories) {
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
  mode: ImportMode
): Promise<{ created: number; updated: number; codeIdMap: CodeIdMap }> {
  if (types.length === 0) return { created: 0, updated: 0, codeIdMap: {} };
  
  const validTypes = types.filter(t => t.isValid);
  const codeIdMap: CodeIdMap = {};
  let created = 0;
  let updated = 0;
  
  for (const type of validTypes) {
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
  mode: ImportMode
): Promise<{ created: number; updated: number; codeIdMap: CodeIdMap }> {
  if (subtypes.length === 0) return { created: 0, updated: 0, codeIdMap: {} };
  
  const validSubtypes = subtypes.filter(s => s.isValid);
  const codeIdMap: CodeIdMap = {};
  let created = 0;
  let updated = 0;
  
  for (const subtype of validSubtypes) {
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
  mode: ImportMode
): Promise<{ created: number; updated: number }> {
  if (parts.length === 0) return { created: 0, updated: 0 };
  
  const validParts = parts.filter(p => p.isValid);
  let created = 0;
  let updated = 0;
  
  for (const part of validParts) {
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

async function performBulkImport(options: ImportOptions): Promise<ImportResult> {
  const { parseResult, mode } = options;
  const errors: string[] = [];
  
  try {
    const tenantId = await getTenantId();
    
    // Import in order: Categories → Types → Subtypes → Parts
    const { created: categoriesCreated, updated: categoriesUpdated, codeIdMap: categoryMap } = 
      await importCategories(parseResult.categories, tenantId, mode);
    
    const { created: typesCreated, updated: typesUpdated, codeIdMap: typeMap } = 
      await importTypes(parseResult.types, tenantId, categoryMap, mode);
    
    const { created: subtypesCreated, updated: subtypesUpdated, codeIdMap: subtypeMap } = 
      await importSubtypes(parseResult.subtypes, tenantId, typeMap, mode);
    
    const { created: partsCreated, updated: partsUpdated } = 
      await importParts(parseResult.parts, tenantId, typeMap, subtypeMap, mode);
    
    const totalCreated = categoriesCreated + typesCreated + subtypesCreated + partsCreated;
    const totalUpdated = categoriesUpdated + typesUpdated + subtypesUpdated + partsUpdated;
    const processed = totalCreated + totalUpdated;
    const skippedCount = parseResult.validCount - processed;
    
    return {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    errors.push(message);
    return {
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
  }
}

export function useBulkImportAssetHierarchy() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: performBulkImport,
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
      } else {
        toast.error(t('assetCategories.bulkImport.failed', 'Import Failed'), {
          description: result.errors.join(', '),
        });
      }
    },
    onError: (error) => {
      toast.error(t('assetCategories.bulkImport.failed', 'Import Failed'), {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}
