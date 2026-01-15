/**
 * Asset Type Parts Section
 * 
 * A collapsible section to manage inspectable parts for an asset type OR subtype.
 * Supports dynamic linking based on whether it's attached to a type or subtype.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Cog, 
  Plus, 
  Pencil, 
  Trash2, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AssetTypePartDialog } from './AssetTypePartDialog';
import {
  useAssetTypeParts,
  useSubtypeParts,
  useCreateAssetTypePart,
  useUpdateAssetTypePart,
  useDeleteAssetTypePart,
  type AssetTypePart,
  type CreateAssetTypePartInput,
  type UpdateAssetTypePartInput,
} from '@/hooks/use-asset-type-parts';

interface AssetTypePartsSectionProps {
  typeId?: string;
  subtypeId?: string;
  parentName: string;
  parentNameAr?: string | null;
}

export function AssetTypePartsSection({ 
  typeId, 
  subtypeId, 
  parentName, 
  parentNameAr 
}: AssetTypePartsSectionProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<AssetTypePart | null>(null);
  const [deletingPart, setDeletingPart] = useState<AssetTypePart | null>(null);

  // Use appropriate hook based on whether this is for type or subtype
  const isSubtype = !!subtypeId;
  const typePartsQuery = useAssetTypeParts(isSubtype ? undefined : typeId);
  const subtypePartsQuery = useSubtypeParts(isSubtype ? subtypeId : undefined);
  
  const { data: parts, isLoading } = isSubtype ? subtypePartsQuery : typePartsQuery;

  const createMutation = useCreateAssetTypePart();
  const updateMutation = useUpdateAssetTypePart();
  const deleteMutation = useDeleteAssetTypePart();

  const displayParentName = isRTL && parentNameAr ? parentNameAr : parentName;

  const handleAddClick = () => {
    setEditingPart(null);
    setDialogOpen(true);
  };

  const handleEditClick = (part: AssetTypePart) => {
    setEditingPart(part);
    setDialogOpen(true);
  };

  const handleDialogSubmit = (data: CreateAssetTypePartInput | UpdateAssetTypePartInput) => {
    if ('id' in data) {
      updateMutation.mutate(data, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingPart) {
      deleteMutation.mutate(
        { 
          id: deletingPart.id, 
          typeId: deletingPart.type_id || undefined,
          subtypeId: deletingPart.subtype_id || undefined,
        },
        { onSuccess: () => setDeletingPart(null) }
      );
    }
  };

  const getPartDisplayName = (part: AssetTypePart) => {
    return isRTL && part.name_ar ? part.name_ar : part.name;
  };

  const getContentCountDisplay = (part: AssetTypePart) => {
    if (!part.content_count) return null;
    const label = part.content_count_label || t('assetParts.items', 'items');
    return `${part.content_count} ${label}`;
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-md">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Cog className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {t('assetParts.title', 'Inspectable Parts')}
              </span>
              {parts && parts.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {parts.length}
                </Badge>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 space-y-2">
            {/* Add Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddClick}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('assetParts.addPart', 'Add Part')}
            </Button>

            {/* Parts List */}
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : parts && parts.length > 0 ? (
              <div className="space-y-1">
                {parts.map((part) => (
                  <div
                    key={part.id}
                    className={`flex items-center justify-between p-2 rounded-md border bg-background ${
                      !part.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">
                            {getPartDisplayName(part)}
                          </span>
                          {part.is_critical && (
                            <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                          )}
                          {part.content_count && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Package className="h-3 w-3" />
                              {getContentCountDisplay(part)}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {part.code}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditClick(part)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingPart(part)}
                        disabled={part.is_system}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('assetParts.noParts', 'No parts defined yet')}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Add/Edit Dialog */}
      <AssetTypePartDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        typeId={typeId}
        subtypeId={subtypeId}
        parentName={displayParentName}
        part={editingPart}
        onSubmit={handleDialogSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPart} onOpenChange={() => setDeletingPart(null)}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('assetParts.deleteConfirmTitle', 'Delete Part?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'assetParts.deleteConfirmMessage',
                'This will remove "{{name}}" from the inspectable parts. Existing inspection records will be preserved.',
                { name: deletingPart ? getPartDisplayName(deletingPart) : '' }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
