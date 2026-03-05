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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateAssetCategory } from '@/features/assets';
import type { Database } from '@/integrations/supabase/types';

type AssetCategory = Database['public']['Tables']['asset_categories']['Row'];

// HSSE Classification options
const HSSE_CATEGORIES = [
  { value: 'fire_safety', labelEn: 'Fire Safety', labelAr: 'Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ù…Ù† Ø§Ù„Ø­Ø±Ø§Ø¦Ù‚' },
  { value: 'ppe', labelEn: 'Personal Protective Equipment', labelAr: 'Ù…Ø¹Ø¯Ø§Øª Ø§Ù„Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø´Ø®ØµÙŠØ©' },
  { value: 'emergency_equipment', labelEn: 'Emergency Equipment', labelAr: 'Ù…Ø¹Ø¯Ø§Øª Ø§Ù„Ø·ÙˆØ§Ø±Ø¦' },
  { value: 'first_aid', labelEn: 'First Aid', labelAr: 'Ø§Ù„Ø¥Ø³Ø¹Ø§ÙØ§Øª Ø§Ù„Ø£ÙˆÙ„ÙŠØ©' },
  { value: 'environmental', labelEn: 'Environmental', labelAr: 'Ø§Ù„Ø¨ÙŠØ¦Ø©' },
  { value: 'security', labelEn: 'Security', labelAr: 'Ø§Ù„Ø£Ù…Ù†' },
  { value: 'industrial_hygiene', labelEn: 'Industrial Hygiene', labelAr: 'Ø§Ù„Ù†Ø¸Ø§ÙØ© Ø§Ù„ØµÙ†Ø§Ø¹ÙŠØ©' },
  { value: 'fall_protection', labelEn: 'Fall Protection', labelAr: 'Ø§Ù„Ø­Ù…Ø§ÙŠØ© Ù…Ù† Ø§Ù„Ø³Ù‚ÙˆØ·' },
  { value: 'electrical_safety', labelEn: 'Electrical Safety', labelAr: 'Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„ÙƒÙ‡Ø±Ø¨Ø§Ø¦ÙŠØ©' },
  { value: 'other', labelEn: 'Other', labelAr: 'Ø£Ø®Ø±Ù‰' },
];

const HSSE_TYPES = [
  { value: 'critical', labelEn: 'Critical', labelAr: 'Ø­Ø±Ø¬' },
  { value: 'standard', labelEn: 'Standard', labelAr: 'Ù‚ÙŠØ§Ø³ÙŠ' },
  { value: 'auxiliary', labelEn: 'Auxiliary', labelAr: 'Ù…Ø³Ø§Ø¹Ø¯' },
];

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  name_ar: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sort_order: z.coerce.number().int().optional(),
  hsse_category: z.string().optional(),
  hsse_type: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface EditAssetCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: AssetCategory;
}

export function EditAssetCategoryDialog({ open, onOpenChange, category }: EditAssetCategoryDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const isRtl = direction === 'rtl';
  const updateCategory = useUpdateAssetCategory();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category.name,
      name_ar: category.name_ar || '',
      icon: category.icon || '',
      color: category.color || '',
      sort_order: category.sort_order || 0,
      hsse_category: (category as unknown).hsse_category || '',
      hsse_type: (category as unknown).hsse_type || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: category.name,
        name_ar: category.name_ar || '',
        icon: category.icon || '',
        color: category.color || '',
        sort_order: category.sort_order || 0,
        hsse_category: (category as unknown).hsse_category || '',
        hsse_type: (category as unknown).hsse_type || '',
      });
    }
  }, [open, category, form]);

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        name: values.name,
        name_ar: values.name_ar || null,
        icon: values.icon || null,
        color: values.color || null,
        sort_order: values.sort_order || 0,
        hsse_category: values.hsse_category || null,
        hsse_type: values.hsse_type || null,
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
          <DialogTitle>{t('assetCategories.editCategoryTitle')}</DialogTitle>
          <DialogDescription>
            {t('assetCategories.editCategoryDescription', { code: category.code })}
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
                      <Input {...field} dir="rtl" placeholder="Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ù…Ù† Ø§Ù„Ø­Ø±Ø§Ø¦Ù‚" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* HSSE Classification Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hsse_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assetCategories.fields.hsseCategory', 'HSSE Category')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('assetCategories.fields.selectHsseCategory', 'Select HSSE Category')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HSSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {isRtl ? cat.labelAr : cat.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hsse_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assetCategories.fields.hsseType', 'HSSE Type')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('assetCategories.fields.selectHsseType', 'Select HSSE Type')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HSSE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {isRtl ? type.labelAr : type.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              <Button type="submit" disabled={updateCategory.isPending}>
                {updateCategory.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

