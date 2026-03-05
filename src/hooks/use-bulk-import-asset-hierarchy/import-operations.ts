/**
 * Import functions for subtypes, parts, and import history logging
 */

import { supabase } from '@/integrations/supabase/client';
import type { ParsedHierarchyRow, ImportMode } from '@/lib/asset-hierarchy-import-utils';
import type {
    CodeIdMap,
    NameIdMap,
    SkippedItem,
    ImportResult,
    ProgressCallback,
} from './types';
import { findParentId } from './import-utils';

export async function importSubtypes(
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

export async function importParts(
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

export async function logImportHistory(
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
