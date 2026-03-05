/**
 * Utility functions for bulk asset hierarchy import:
 * - loadExistingParentMaps: Pre-load existing DB records for parent lookups
 * - findParentId: Find parent by code, fallback to name
 * - getTenantId: Get tenant ID for current user
 * - importCategories: Import category rows
 * - importTypes: Import type rows with parent category lookups
 * - importSubtypes: Import subtype rows with parent type lookups
 * - importParts: Import part rows with parent type/subtype lookups
 * - logImportHistory: Log import results to DB
 */

import { supabase } from '@/integrations/supabase/client';
import type { ParsedHierarchyRow, ImportMode } from '@/lib/asset-hierarchy-import-utils';
import type {
    CodeIdMap,
    NameIdMap,
    ParentMaps,
    SkippedItem,
    ImportResult,
    ProgressCallback,
} from './types';

/**
 * Pre-load existing categories, types, and subtypes from the database
 * to allow parent lookups against pre-existing records
 */
export async function loadExistingParentMaps(tenantId: string): Promise<ParentMaps> {
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
export function findParentId(
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

export async function getTenantId(): Promise<string> {
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

export async function importCategories(
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

export async function importTypes(
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
