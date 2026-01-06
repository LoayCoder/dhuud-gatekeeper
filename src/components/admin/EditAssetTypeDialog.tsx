import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useUpdateAssetType } from '@/hooks/use-asset-category-management';
import type { Database } from '@/integrations/supabase/types';

type AssetType = Database['public']['Tables']['asset_types']['Row'];

const typeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  name_ar: z.string().optional(),
  inspection_interval_days: z.coerce.number().int().min(0).optional(),
  requires_certification: z.boolean().optional(),
});

type TypeFormValues = z.infer<typeof typeSchema>;

interface EditAssetTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetType: AssetType;
}

export function EditAssetTypeDialog({ open, onOpenChange, assetType }: EditAssetTypeDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const updateType = useUpdateAssetType();

  const form = useForm<TypeFormValues>({
    resolver: zodResolver(typeSchema),
    defaultValues: {
      name: assetType.name,
      name_ar: assetType.name_ar || '',
      inspection_interval_days: assetType.inspection_interval_days || 0,
      requires_certification: assetType.requires_certification || false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: assetType.name,
        name_ar: assetType.name_ar || '',
        inspection_interval_days: assetType.inspection_interval_days || 0,
        requires_certification: assetType.requires_certification || false,
      });
    }
  }, [open, assetType, form]);

  const onSubmit = async (values: TypeFormValues) => {
    try {
      await updateType.mutateAsync({
        id: assetType.id,
        name: values.name,
        name_ar: values.name_ar || null,
        inspection_interval_days: values.inspection_interval_days || null,
        requires_certification: values.requires_certification || false,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('assetCategories.editTypeTitle')}</DialogTitle>
          <DialogDescription>
            {t('assetCategories.editTypeDescription', { code: assetType.code })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assetCategories.fields.nameEn')} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Fire Extinguisher" />
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
                      <Input {...field} dir="rtl" placeholder="طفاية حريق" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="inspection_interval_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assetCategories.fields.inspectionInterval')}</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" placeholder="90" />
                  </FormControl>
                  <FormDescription>{t('assetCategories.fields.inspectionIntervalHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requires_certification"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t('assetCategories.fields.requiresCertification')}</FormLabel>
                    <FormDescription>{t('assetCategories.fields.requiresCertificationHint')}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateType.isPending}>
                {updateType.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
