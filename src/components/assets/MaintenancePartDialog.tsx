import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useCreateMaintenancePart,
  useUpdateMaintenancePart,
  usePartCategories,
  type MaintenancePart,
} from '@/hooks/use-maintenance-parts';

const partSchema = z.object({
  part_number: z.string().min(1, 'Part number is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.string().optional(),
  unit_of_measure: z.string().min(1, 'Unit is required'),
  quantity_in_stock: z.number().min(0).default(0),
  min_stock_level: z.number().min(0).default(0),
  reorder_point: z.number().min(0).default(0),
  unit_cost: z.number().min(0).optional(),
  manufacturer: z.string().optional(),
  storage_location: z.string().optional(),
  is_active: z.boolean().default(true),
});

type PartFormValues = z.infer<typeof partSchema>;

interface MaintenancePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part?: MaintenancePart | null;
}

const UNITS_OF_MEASURE = [
  { value: 'each', labelKey: 'parts.units.each' },
  { value: 'kg', labelKey: 'parts.units.kg' },
  { value: 'liters', labelKey: 'parts.units.liters' },
  { value: 'meters', labelKey: 'parts.units.meters' },
  { value: 'box', labelKey: 'parts.units.box' },
  { value: 'pair', labelKey: 'parts.units.pair' },
  { value: 'set', labelKey: 'parts.units.set' },
];

export function MaintenancePartDialog({ open, onOpenChange, part }: MaintenancePartDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const { data: categories = [] } = usePartCategories();
  const createPart = useCreateMaintenancePart();
  const updatePart = useUpdateMaintenancePart();

  const isEditing = !!part;

  const form = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      part_number: '',
      name: '',
      description: '',
      category: '',
      unit_of_measure: 'each',
      quantity_in_stock: 0,
      min_stock_level: 0,
      reorder_point: 5,
      unit_cost: undefined,
      manufacturer: '',
      storage_location: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (part) {
      form.reset({
        part_number: part.part_number,
        name: part.name,
        description: part.description || '',
        category: part.category || '',
        unit_of_measure: part.unit_of_measure || 'each',
        quantity_in_stock: part.quantity_in_stock ?? 0,
        min_stock_level: part.min_stock_level ?? 0,
        reorder_point: part.reorder_point ?? 0,
        unit_cost: part.unit_cost ?? undefined,
        manufacturer: part.manufacturer || '',
        storage_location: part.storage_location || '',
        is_active: part.is_active ?? true,
      });
    } else {
      form.reset({
        part_number: `PT-${Date.now().toString(36).toUpperCase()}`,
        name: '',
        unit_of_measure: 'each',
        quantity_in_stock: 0,
        min_stock_level: 0,
        reorder_point: 5,
        is_active: true,
      });
    }
  }, [part, form]);

  const onSubmit = async (values: PartFormValues) => {
    try {
      if (isEditing && part) {
        await updatePart.mutateAsync({ id: part.id, ...values });
      } else {
        // Ensure required fields are present
        await createPart.mutateAsync({
          part_number: values.part_number,
          name: values.name,
          name_ar: null,
          description: values.description || null,
          category: values.category || null,
          unit_of_measure: values.unit_of_measure || null,
          quantity_in_stock: values.quantity_in_stock ?? 0,
          min_stock_level: values.min_stock_level ?? 0,
          reorder_point: values.reorder_point ?? 0,
          unit_cost: values.unit_cost ?? null,
          manufacturer: values.manufacturer || null,
          storage_location: values.storage_location || null,
          is_active: values.is_active ?? true,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const isSubmitting = createPart.isPending || updatePart.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('parts.editPart', 'Edit Part') : t('parts.addPart', 'Add New Part')}
          </DialogTitle>
          <DialogDescription>
            {t('parts.dialogDescription', 'Enter the details for the maintenance part')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="part_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('parts.partNumber', 'Part Number')} *</FormLabel>
                    <FormControl>
                      <Input {...field} className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('parts.category', 'Category')}</FormLabel>
                    <Select value={field.value || ''} onValueChange={field.onChange} dir={direction}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('parts.selectCategory', 'Select or type new')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('parts.name', 'Name')} *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('parts.description', 'Description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="unit_of_measure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('parts.unitOfMeasure', 'Unit')} *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNITS_OF_MEASURE.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {t(unit.labelKey, unit.value)}
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
                name="quantity_in_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('parts.quantityOnHand', 'Current Qty')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('parts.unitCost', 'Unit Cost (SAR)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="min_stock_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('parts.minimumQuantity', 'Minimum Qty')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>{t('parts.minimumQuantityHint', 'Alert when below this level')}</FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reorder_point"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('parts.reorderLevel', 'Reorder Level')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>{t('parts.reorderLevelHint', 'Suggested reorder point')}</FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('parts.manufacturer', 'Manufacturer')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storage_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('parts.storageLocation', 'Storage Location')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('parts.storageLocationPlaceholder', 'e.g., Warehouse A, Shelf 3')} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>{t('parts.isActive', 'Active')}</FormLabel>
                    <FormDescription>{t('parts.isActiveHint', 'Inactive parts will not appear in selection lists')}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isEditing ? t('common.save', 'Save') : t('parts.create', 'Create Part')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
