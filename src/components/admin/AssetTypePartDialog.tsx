/**
 * Asset Type Part Dialog
 * 
 * Dialog for adding or editing an asset type part.
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { AssetTypePart, CreateAssetTypePartInput, UpdateAssetTypePartInput } from '@/hooks/use-asset-type-parts';

const formSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(100),
  name_ar: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  description_ar: z.string().max(500).optional(),
  is_critical: z.boolean().default(false),
  default_response_type: z.enum(['pass_fail', 'condition_rating', 'numeric']).default('pass_fail'),
  sort_order: z.number().min(0).default(0),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface AssetTypePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeId: string;
  typeName: string;
  part?: AssetTypePart | null;
  onSubmit: (data: CreateAssetTypePartInput | UpdateAssetTypePartInput) => void;
  isLoading?: boolean;
}

export function AssetTypePartDialog({
  open,
  onOpenChange,
  typeId,
  typeName,
  part,
  onSubmit,
  isLoading,
}: AssetTypePartDialogProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const isEditing = !!part;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      name: '',
      name_ar: '',
      description: '',
      description_ar: '',
      is_critical: false,
      default_response_type: 'pass_fail',
      sort_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (part) {
      form.reset({
        code: part.code,
        name: part.name,
        name_ar: part.name_ar || '',
        description: part.description || '',
        description_ar: part.description_ar || '',
        is_critical: part.is_critical,
        default_response_type: part.default_response_type,
        sort_order: part.sort_order,
        is_active: part.is_active,
      });
    } else {
      form.reset({
        code: '',
        name: '',
        name_ar: '',
        description: '',
        description_ar: '',
        is_critical: false,
        default_response_type: 'pass_fail',
        sort_order: 0,
        is_active: true,
      });
    }
  }, [part, form]);

  const handleSubmit = (values: FormValues) => {
    if (isEditing && part) {
      onSubmit({
        id: part.id,
        ...values,
        name_ar: values.name_ar || undefined,
        description: values.description || undefined,
        description_ar: values.description_ar || undefined,
      } as UpdateAssetTypePartInput);
    } else {
      onSubmit({
        type_id: typeId,
        ...values,
        name_ar: values.name_ar || undefined,
        description: values.description || undefined,
        description_ar: values.description_ar || undefined,
      } as CreateAssetTypePartInput);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>
            {isEditing 
              ? t('assetParts.editPart', 'Edit Part')
              : t('assetParts.addPart', 'Add Part')
            }
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('assetParts.forAssetType', 'For asset type')}: {typeName}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Code */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assetParts.code', 'Code')}</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., HOSE, GAUGE, LABEL"
                      disabled={isEditing && part?.is_system}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Names (EN/AR) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assetParts.nameEn', 'Name (English)')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Hose" />
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
                    <FormLabel>{t('assetParts.nameAr', 'Name (Arabic)')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., خرطوم" dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descriptions (EN/AR) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assetParts.descriptionEn', 'Description (English)')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder="Optional description..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assetParts.descriptionAr', 'Description (Arabic)')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder="وصف اختياري..." dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Response Type */}
            <FormField
              control={form.control}
              name="default_response_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assetParts.responseType', 'Response Type')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pass_fail">
                        {t('assetParts.passFail', 'Pass / Fail / N/A')}
                      </SelectItem>
                      <SelectItem value="condition_rating">
                        {t('assetParts.conditionRating', 'Condition Rating (1-5)')}
                      </SelectItem>
                      <SelectItem value="numeric">
                        {t('assetParts.numeric', 'Numeric Value')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sort Order */}
            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assetParts.sortOrder', 'Sort Order')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('assetParts.sortOrderHint', 'Lower numbers appear first')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Switches */}
            <div className="flex flex-col gap-4 pt-2">
              <FormField
                control={form.control}
                name="is_critical"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        {t('assetParts.isCritical', 'Critical Part')}
                      </FormLabel>
                      <FormDescription>
                        {t('assetParts.isCriticalHint', 'If failed, marks the entire asset as failed')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {isEditing && (
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          {t('assetParts.isActive', 'Active')}
                        </FormLabel>
                        <FormDescription>
                          {t('assetParts.isActiveHint', 'Inactive parts are hidden from inspections')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isEditing ? t('common.save', 'Save') : t('common.add', 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
