import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Search, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { toast } from 'sonner';
import { 
  useInspectionTemplateCategories, 
  useUpdateInspectionCategory, 
  useDeleteInspectionCategory,
  type InspectionTemplateCategory
} from '@/hooks/use-inspection-categories';
import AddInspectionCategoryDialog from '@/components/admin/AddInspectionCategoryDialog';
import EditInspectionCategoryDialog from '@/components/admin/EditInspectionCategoryDialog';


const InspectionCategorySettings = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [search, setSearch] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<InspectionTemplateCategory | null>(null);
  
  const { data: categories, isLoading } = useInspectionTemplateCategories();
  const updateCategory = useUpdateInspectionCategory();
  const deleteCategory = useDeleteInspectionCategory();

  const filteredCategories = categories?.filter((cat) => {
    const searchLower = search.toLowerCase();
    return (
      cat.code.toLowerCase().includes(searchLower) ||
      cat.name.toLowerCase().includes(searchLower) ||
      (cat.name_ar && cat.name_ar.includes(search))
    );
  });

  const handleToggleActive = async (category: InspectionTemplateCategory) => {
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        is_active: !category.is_active,
      });
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory.mutateAsync(categoryToDelete.id);
      setCategoryToDelete(null);
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const getDisplayName = (category: InspectionTemplateCategory) => {
    if (isRTL && category.name_ar) return category.name_ar;
    return category.name;
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            {t('settings.inspectionCategories.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('settings.inspectionCategories.description')}
          </p>
        </div>
        <AddInspectionCategoryDialog />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">{t('common.icon')}</TableHead>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('common.code')}</TableHead>
                    <TableHead className="text-center">{t('common.color')}</TableHead>
                    <TableHead className="text-center">{t('common.status')}</TableHead>
                    <TableHead className="text-center">{t('common.type')}</TableHead>
                    <TableHead className="text-end">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t('common.noResults')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCategories?.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div 
                            className="p-2 rounded-md w-fit"
                            style={{ backgroundColor: category.color ? `${category.color}20` : undefined }}
                          >
                            <Layers className="h-4 w-4" style={{ color: category.color || undefined }} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{getDisplayName(category)}</span>
                            {isRTL && category.name && (
                              <span className="text-xs text-muted-foreground">{category.name}</span>
                            )}
                            {!isRTL && category.name_ar && (
                              <span className="text-xs text-muted-foreground" dir="rtl">{category.name_ar}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{category.code}</code>
                        </TableCell>
                        <TableCell className="text-center">
                          {category.color ? (
                            <div 
                              className="w-6 h-6 rounded-full border mx-auto"
                              style={{ backgroundColor: category.color }}
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={category.is_active ? 'default' : 'secondary'}>
                            {category.is_active ? t('common.active') : t('common.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={category.is_system ? 'outline' : 'secondary'}>
                            {category.is_system ? t('common.system') : t('common.custom')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(category)}
                              title={category.is_active ? t('common.deactivate') : t('common.activate')}
                            >
                              {category.is_active ? (
                                <ToggleRight className="h-4 w-4 text-primary" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <EditInspectionCategoryDialog category={category} />
                            {!category.is_system && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setCategoryToDelete(category)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.inspectionCategories.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.inspectionCategories.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InspectionCategorySettings;
