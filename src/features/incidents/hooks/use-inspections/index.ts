// Barrel file — re-exports all inspection hooks and types
export type {
    InspectionTemplate,
    TemplateItem,
    AssetInspection,
    InspectionResponse,
} from './types';

export {
    useInspectionTemplates,
    useInspectionTemplate,
    useTemplateItems,
    useTemplatesForAsset,
    useCreateTemplate,
    useUpdateTemplate,
    useDeleteTemplate,
    useBulkUpdateTemplateStatus,
    useBulkDeleteTemplates,
    useCreateTemplateItem,
    useUpdateTemplateItem,
    useDeleteTemplateItem,
} from './use-inspection-template-hooks';

export {
    useAssetInspections,
    useInspection,
    useInspectionResponses,
    useStartInspection,
    useSaveInspectionResponse,
    useCompleteInspection,
    useCancelInspection,
    useRecentInspections,
    useInspectionStats,
} from './use-inspection-hooks';
