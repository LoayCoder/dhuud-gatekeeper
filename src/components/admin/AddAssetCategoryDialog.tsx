import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateAssetCategory } from '@/hooks/use-asset-category-management';

const categorySchema = z.object({
  code: z.string().min(1, 'Code is required').max(20).regex(/^[A-Z_]+$/, 'Code must be uppercase letters and underscores'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  name_ar: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sort_order: z.coerce.number().int().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface AddAssetCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAssetCategoryDialog({ open, onOpenChange }: AddAssetCategoryDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const createCategory = useCreateAssetCategory();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: '',
      name: '',
      name_ar: '',
      icon: '',
      color: '',
      sort_order: 0,
    },
  });

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      await createCategory.mutateAsync({
        code: values.code,
        name: values.name,
        name_ar: values.name_ar || null,
        icon: values.icon || null,
        color: values.color || null,
        sort_order: values.sort_order || 0,
        is_active: true,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('assetCategories.addCategoryTitle')}</DialogTitle>
          <DialogDescription>{t('assetCategories.addCategoryDescription')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assetCategories.fields.code')} *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="FIRE_SAFETY"
                      onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/[^A-Z_]/g, ''))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assetCategories.fields.nameEn')} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Fire Safety" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assetCategories.fields.nameAr')}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="rtl" placeholder="السلامة من الحرائق" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assetCategories.fields.icon')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="flame" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assetCategories.fields.color')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="color" className="h-10 p-1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assetCategories.fields.sortOrder')}</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createCategory.isPending}>
                {createCategory.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
