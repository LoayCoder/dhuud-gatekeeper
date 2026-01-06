import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUpdateAssetSubtype } from '@/hooks/use-asset-category-management';
import type { Database } from '@/integrations/supabase/types';

type AssetSubtype = Database['public']['Tables']['asset_subtypes']['Row'];

const subtypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  name_ar: z.string().optional(),
});

type SubtypeFormValues = z.infer<typeof subtypeSchema>;

interface EditAssetSubtypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtype: AssetSubtype;
}

export function EditAssetSubtypeDialog({ open, onOpenChange, subtype }: EditAssetSubtypeDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const updateSubtype = useUpdateAssetSubtype();

  const form = useForm<SubtypeFormValues>({
    resolver: zodResolver(subtypeSchema),
    defaultValues: {
      name: subtype.name,
      name_ar: subtype.name_ar || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: subtype.name,
        name_ar: subtype.name_ar || '',
      });
    }
  }, [open, subtype, form]);

  const onSubmit = async (values: SubtypeFormValues) => {
    try {
      await updateSubtype.mutateAsync({
        id: subtype.id,
        name: values.name,
        name_ar: values.name_ar || null,
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
          <DialogTitle>{t('assetCategories.editSubtypeTitle')}</DialogTitle>
          <DialogDescription>
            {t('assetCategories.editSubtypeDescription', { code: subtype.code })}
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
                      <Input {...field} placeholder="CO2 6kg" />
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
                      <Input {...field} dir="rtl" placeholder="ثاني أكسيد الكربون 6 كجم" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateSubtype.isPending}>
                {updateSubtype.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
