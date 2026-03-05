// Barrel file — re-exports all asset category management hooks and types
export type {
    AssetCategory,
    AssetCategoryInsert,
    AssetCategoryUpdate,
    AssetType,
    AssetTypeInsert,
    AssetTypeUpdate,
    AssetSubtype,
    AssetSubtypeInsert,
    AssetSubtypeUpdate,
} from './types';

export {
    useAllAssetCategories,
    useAllAssetTypes,
    useAllAssetSubtypes,
    useCategoryAssetCounts,
    useTypeAssetCounts,
} from './use-category-queries';

export {
    useCreateAssetCategory,
    useUpdateAssetCategory,
    useToggleAssetCategory,
    useDeleteAssetCategory,
    useCreateAssetType,
    useUpdateAssetType,
    useToggleAssetType,
    useDeleteAssetType,
    useCreateAssetSubtype,
    useUpdateAssetSubtype,
    useToggleAssetSubtype,
    useDeleteAssetSubtype,
} from './use-category-mutations';
