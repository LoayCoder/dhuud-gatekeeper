/**
 * Hook for bulk importing asset hierarchy with real-time progress tracking
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { ImportResult, ImportProgress, ImportOptions, SkippedItem, ProgressCallback } from './types';
import { loadExistingParentMaps, getTenantId, importCategories, importTypes } from './import-utils';
import { importSubtypes, importParts, logImportHistory } from './import-operations';

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
