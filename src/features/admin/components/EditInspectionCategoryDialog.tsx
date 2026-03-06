import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editInspectionCategorySchema, EditInspectionCategoryValues } from './EditInspectionCategorySchema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateInspectionCategory, type InspectionTemplateCategory } from '@/features/incidents';

interface EditInspectionCategoryDialogProps {
  category: InspectionTemplateCategory;
}

export function EditInspectionCategoryDialog({ category }: EditInspectionCategoryDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const form = useForm<EditInspectionCategoryValues>({
    resolver: zodResolver(editInspectionCategorySchema),
    defaultValues: {
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      color: category.color || '#3b82f6',
      sortOrder: category.sort_order,
    }
  });

  const updateCategory = useUpdateInspectionCategory();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: category.name,
        description: category.description || '',
        icon: category.icon || '',
        color: category.color || '#3b82f6',
        sortOrder: category.sort_order,
      });
    }
  }, [open, category, form]);

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        name: data.name.trim(),
        name_ar: category.name_ar || null, // Preserve existing value
        description: data.description.trim() || null,
        description_ar: category.description_ar || null, // Preserve existing value
        icon: data.icon.trim() || null,
        color: data.color || null,
        sort_order: data.sortOrder,
      });

      setOpen(false);
    } catch (error) {
      toast.error(t('common.error'));
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{t('settings.inspectionCategories.editCategory')}</DialogTitle>
            <DialogDescription>
              {t('settings.inspectionCategories.editCategoryDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('common.code')}</Label>
                <Input
                  value={category.code}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sortOrder">{t('common.sortOrder')}</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  {...form.register('sortOrder', { valueAsNumber: true })}
                  min={1}
                />
                {form.formState.errors.sortOrder && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.sortOrder.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">{t('common.nameEn')} *</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Category Name (English)"
              />
              {form.formState.errors.name && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t('common.description')}</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder={t('common.descriptionPlaceholder', 'Description')}
                rows={2}
              />
              {form.formState.errors.description && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="icon">{t('common.icon')}</Label>
                <Input
                  id="icon"
                  {...form.register('icon')}
                  placeholder="e.g., Flame, Shield"
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.inspectionCategories.iconHelp')}
                </p>
                {form.formState.errors.icon && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.icon.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color">{t('common.color')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    {...form.register('color')}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    {...form.register('color')}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
                {form.formState.errors.color && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.color.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateCategory.isPending}>
              {updateCategory.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

