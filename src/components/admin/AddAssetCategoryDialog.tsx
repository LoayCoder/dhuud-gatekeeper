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
import { useCreateAssetCategory } from '@/hooks/use-asset-category-management';
import { generateCodeFromName } from '@/lib/utils/generate-code';

// HSSE Classification options
const HSSE_CATEGORIES = [
  { value: 'fire_safety', labelEn: 'Fire Safety', labelAr: 'السلامة من الحرائق' },
  { value: 'ppe', labelEn: 'Personal Protective Equipment', labelAr: 'معدات الحماية الشخصية' },
  { value: 'emergency_equipment', labelEn: 'Emergency Equipment', labelAr: 'معدات الطوارئ' },
  { value: 'first_aid', labelEn: 'First Aid', labelAr: 'الإسعافات الأولية' },
  { value: 'environmental', labelEn: 'Environmental', labelAr: 'البيئة' },
  { value: 'security', labelEn: 'Security', labelAr: 'الأمن' },
  { value: 'industrial_hygiene', labelEn: 'Industrial Hygiene', labelAr: 'النظافة الصناعية' },
  { value: 'fall_protection', labelEn: 'Fall Protection', labelAr: 'الحماية من السقوط' },
  { value: 'electrical_safety', labelEn: 'Electrical Safety', labelAr: 'السلامة الكهربائية' },
  { value: 'other', labelEn: 'Other', labelAr: 'أخرى' },
];

const HSSE_TYPES = [
  { value: 'critical', labelEn: 'Critical', labelAr: 'حرج' },
  { value: 'standard', labelEn: 'Standard', labelAr: 'قياسي' },
  { value: 'auxiliary', labelEn: 'Auxiliary', labelAr: 'مساعد' },
];

const categorySchema = z.object({
  code: z.string().min(1, 'Code is required').max(20),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  name_ar: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sort_order: z.coerce.number().int().optional(),
  hsse_category: z.string().optional(),
  hsse_type: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface AddAssetCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAssetCategoryDialog({ open, onOpenChange }: AddAssetCategoryDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const isRtl = direction === 'rtl';
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
      hsse_category: '',
      hsse_type: '',
    },
  });

  // Auto-generate code from name
  const watchedName = form.watch('name');
  useEffect(() => {
    if (watchedName) {
      const generatedCode = generateCodeFromName(watchedName);
      form.setValue('code', generatedCode, { shouldValidate: true });
    }
  }, [watchedName, form]);

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
        hsse_category: values.hsse_category || null,
        hsse_type: values.hsse_type || null,
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

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assetCategories.fields.code')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled
                      className="bg-muted text-muted-foreground"
                      placeholder={t('assetCategories.fields.codeAutoGenerated', 'Auto-generated from name')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
