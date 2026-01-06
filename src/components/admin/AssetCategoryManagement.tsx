import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Loader2, Layers, Tag, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAllAssetCategories,
  useAllAssetTypes,
  useAllAssetSubtypes,
  useToggleAssetCategory,
  useToggleAssetType,
  useToggleAssetSubtype,
  useDeleteAssetCategory,
  useDeleteAssetType,
  useDeleteAssetSubtype,
  useCategoryAssetCounts,
  useTypeAssetCounts,
} from '@/hooks/use-asset-category-management';
import { AddAssetCategoryDialog } from './AddAssetCategoryDialog';
import { EditAssetCategoryDialog } from './EditAssetCategoryDialog';
import { AddAssetTypeDialog } from './AddAssetTypeDialog';
import { EditAssetTypeDialog } from './EditAssetTypeDialog';
import { AddAssetSubtypeDialog } from './AddAssetSubtypeDialog';
import { EditAssetSubtypeDialog } from './EditAssetSubtypeDialog';

type DeleteTarget = {
  type: 'category' | 'type' | 'subtype';
  id: string;
  name: string;
} | null;

export default function AssetCategoryManagement() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const { data: categories, isLoading: loadingCategories } = useAllAssetCategories();
  const { data: types } = useAllAssetTypes();
  const { data: subtypes } = useAllAssetSubtypes();
  const { data: categoryCounts = {} } = useCategoryAssetCounts();
  const { data: typeCounts = {} } = useTypeAssetCounts();

  const toggleCategory = useToggleAssetCategory();
  const toggleType = useToggleAssetType();
  const toggleSubtype = useToggleAssetSubtype();
  const deleteCategory = useDeleteAssetCategory();
  const deleteType = useDeleteAssetType();
  const deleteSubtype = useDeleteAssetSubtype();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  // Dialog states
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<typeof categories extends (infer T)[] ? T : never | null>(null);
  const [addTypeOpen, setAddTypeOpen] = useState<string | null>(null);
  const [editType, setEditType] = useState<typeof types extends (infer T)[] ? T : never | null>(null);
  const [addSubtypeOpen, setAddSubtypeOpen] = useState<string | null>(null);
  const [editSubtype, setEditSubtype] = useState<typeof subtypes extends (infer T)[] ? T : never | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const toggleCategoryExpand = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleTypeExpand = (id: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getTypesForCategory = (categoryId: string) => {
    return types?.filter((type) => type.category_id === categoryId) || [];
  };

  const getSubtypesForType = (typeId: string) => {
    return subtypes?.filter((subtype) => subtype.type_id === typeId) || [];
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === 'category') {
      deleteCategory.mutate(deleteTarget.id);
    } else if (deleteTarget.type === 'type') {
      deleteType.mutate(deleteTarget.id);
    } else {
      deleteSubtype.mutate(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  if (loadingCategories) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-primary" />
                {t('assetCategories.title')}
              </CardTitle>
              <CardDescription>{t('assetCategories.description')}</CardDescription>
            </div>
            <Button onClick={() => setAddCategoryOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('assetCategories.addCategory')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!categories?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('assetCategories.noCategories')}
            </div>
          ) : (
            categories.map((category) => {
              const categoryTypes = getTypesForCategory(category.id);
              const isExpanded = expandedCategories.has(category.id);
              const assetCount = categoryCounts[category.id] || 0;

              return (
                <Collapsible key={category.id} open={isExpanded}>
                  <div className="rounded-lg border bg-card">
                    {/* Category Row */}
                    <div className="flex items-center gap-3 p-4">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleCategoryExpand(category.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Layers className="h-4 w-4 text-primary" />
                          <span className="font-medium">
                            {isArabic && category.name_ar ? category.name_ar : category.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {category.code}
                          </Badge>
                          {!category.is_active && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {t('common.inactive')}
                            </Badge>
                          )}
                          {category.is_system && (
                            <Badge variant="outline" className="text-xs">
                              {t('assetCategories.system')}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {t('assetCategories.typesCount', { count: categoryTypes.length })} •{' '}
                          {t('assetCategories.assetsCount', { count: assetCount })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={category.is_active ?? true}
                          onCheckedChange={(checked) =>
                            toggleCategory.mutate({ id: category.id, is_active: checked })
                          }
                          disabled={category.is_system || toggleCategory.isPending}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditCategory(category)}
                          disabled={category.is_system}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDeleteTarget({
                              type: 'category',
                              id: category.id,
                              name: isArabic && category.name_ar ? category.name_ar : category.name,
                            })
                          }
                          disabled={category.is_system || assetCount > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Types Section */}
                    <CollapsibleContent>
                      <div className="border-t bg-muted/30 p-4 ps-12 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            {t('assetCategories.types')}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAddTypeOpen(category.id)}
                            className="gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            {t('assetCategories.addType')}
                          </Button>
                        </div>

                        {!categoryTypes.length ? (
                          <div className="text-sm text-muted-foreground py-2">
                            {t('assetCategories.noTypes')}
                          </div>
                        ) : (
                          categoryTypes.map((type) => {
                            const typeSubtypes = getSubtypesForType(type.id);
                            const isTypeExpanded = expandedTypes.has(type.id);
                            const typeAssetCount = typeCounts[type.id] || 0;

                            return (
                              <Collapsible key={type.id} open={isTypeExpanded}>
                                <div className="rounded-md border bg-background">
                                  {/* Type Row */}
                                  <div className="flex items-center gap-3 p-3">
                                    <CollapsibleTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => toggleTypeExpand(type.id)}
                                      >
                                        {isTypeExpanded ? (
                                          <ChevronUp className="h-3 w-3" />
                                        ) : (
                                          <ChevronDown className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </CollapsibleTrigger>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Tag className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-sm font-medium">
                                          {isArabic && type.name_ar ? type.name_ar : type.name}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          {type.code}
                                        </Badge>
                                        {!type.is_active && (
                                          <Badge variant="outline" className="text-xs text-muted-foreground">
                                            {t('common.inactive')}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {t('assetCategories.subtypesCount', { count: typeSubtypes.length })} •{' '}
                                        {t('assetCategories.assetsCount', { count: typeAssetCount })}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <Switch
                                        checked={type.is_active ?? true}
                                        onCheckedChange={(checked) =>
                                          toggleType.mutate({ id: type.id, is_active: checked })
                                        }
                                        disabled={toggleType.isPending}
                                        className="scale-75"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => setEditType(type)}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() =>
                                          setDeleteTarget({
                                            type: 'type',
                                            id: type.id,
                                            name: isArabic && type.name_ar ? type.name_ar : type.name,
                                          })
                                        }
                                        disabled={typeAssetCount > 0}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Subtypes Section */}
                                  <CollapsibleContent>
                                    <div className="border-t bg-muted/20 p-3 ps-10 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">
                                          {t('assetCategories.subtypes')}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setAddSubtypeOpen(type.id)}
                                          className="h-6 text-xs gap-1"
                                        >
                                          <Plus className="h-3 w-3" />
                                          {t('assetCategories.addSubtype')}
                                        </Button>
                                      </div>

                                      {!typeSubtypes.length ? (
                                        <div className="text-xs text-muted-foreground py-1">
                                          {t('assetCategories.noSubtypes')}
                                        </div>
                                      ) : (
                                        typeSubtypes.map((subtype) => (
                                          <div
                                            key={subtype.id}
                                            className="flex items-center gap-2 p-2 rounded bg-background"
                                          >
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm">
                                                  {isArabic && subtype.name_ar
                                                    ? subtype.name_ar
                                                    : subtype.name}
                                                </span>
                                                <Badge variant="outline" className="text-xs">
                                                  {subtype.code}
                                                </Badge>
                                                {!subtype.is_active && (
                                                  <Badge
                                                    variant="outline"
                                                    className="text-xs text-muted-foreground"
                                                  >
                                                    {t('common.inactive')}
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Switch
                                                checked={subtype.is_active ?? true}
                                                onCheckedChange={(checked) =>
                                                  toggleSubtype.mutate({
                                                    id: subtype.id,
                                                    is_active: checked,
                                                  })
                                                }
                                                disabled={toggleSubtype.isPending}
                                                className="scale-75"
                                              />
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => setEditSubtype(subtype)}
                                              >
                                                <Pencil className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() =>
                                                  setDeleteTarget({
                                                    type: 'subtype',
                                                    id: subtype.id,
                                                    name: isArabic && subtype.name_ar
                                                      ? subtype.name_ar
                                                      : subtype.name,
                                                  })
                                                }
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            );
                          })
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddAssetCategoryDialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen} />
      
      {editCategory && (
        <EditAssetCategoryDialog
          open={!!editCategory}
          onOpenChange={(open) => !open && setEditCategory(null)}
          category={editCategory}
        />
      )}

      {addTypeOpen && (
        <AddAssetTypeDialog
          open={!!addTypeOpen}
          onOpenChange={(open) => !open && setAddTypeOpen(null)}
          categoryId={addTypeOpen}
        />
      )}

      {editType && (
        <EditAssetTypeDialog
          open={!!editType}
          onOpenChange={(open) => !open && setEditType(null)}
          assetType={editType}
        />
      )}

      {addSubtypeOpen && (
        <AddAssetSubtypeDialog
          open={!!addSubtypeOpen}
          onOpenChange={(open) => !open && setAddSubtypeOpen(null)}
          typeId={addSubtypeOpen}
        />
      )}

      {editSubtype && (
        <EditAssetSubtypeDialog
          open={!!editSubtype}
          onOpenChange={(open) => !open && setEditSubtype(null)}
          subtype={editSubtype}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('assetCategories.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('assetCategories.deleteConfirmDescription', { name: deleteTarget?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategory.isPending || deleteType.isPending || deleteSubtype.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : null}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
