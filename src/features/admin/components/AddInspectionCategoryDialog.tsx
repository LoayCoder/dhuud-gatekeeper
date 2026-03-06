import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addInspectionCategorySchema, AddInspectionCategoryValues } from './AddInspectionCategorySchema';
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
import { useCreateInspectionCategory } from '@/features/incidents';

export function AddInspectionCategoryDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const form = useForm<AddInspectionCategoryValues>({
    resolver: zodResolver(addInspectionCategorySchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      icon: '',
      color: '#3b82f6',
      sortOrder: 100,
    }
  });

  const createCategory = useCreateInspectionCategory();

  const onSubmit = form.handleSubmit(async (data) => {

    try {
      await createCategory.mutateAsync({
        code: data.code.trim().toUpperCase().replace(/\s+/g, '-'),
        name: data.name.trim(),
        name_ar: null,
        description: data.description.trim() || null,
        description_ar: null,
        icon: data.icon.trim() || null,
        color: data.color || null,
        sort_order: data.sortOrder,
        is_active: true,
        tenant_id: null, // Will be set by the hook
      });

      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error(t('common.error'));
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          {t('settings.inspectionCategories.addCategory')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{t('settings.inspectionCategories.addCategory')}</DialogTitle>
            <DialogDescription>
              {t('settings.inspectionCategories.addCategoryDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">{t('common.code')} *</Label>
                <Input
                  id="code"
                  {...form.register('code')}
                  placeholder="e.g., FIRE-SAFETY"
                />
                {form.formState.errors.code && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.code.message}
                  </p>
                )}
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
            <Button type="submit" disabled={createCategory.isPending}>
              {createCategory.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

