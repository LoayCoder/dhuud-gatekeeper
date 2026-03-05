import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Minus } from 'lucide-react';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useUpdateMaintenancePart, type MaintenancePart } from '@/hooks/use-maintenance-parts';

const adjustmentSchema = z.object({
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  direction: z.enum(['add', 'subtract']),
  usage_type: z.string().min(1, 'Reason is required'),
  reason: z.string().optional(),
});

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: MaintenancePart | null;
}

const USAGE_TYPES = [
  { value: 'restock', labelKey: 'parts.usageTypes.restock', direction: 'add' },
  { value: 'usage', labelKey: 'parts.usageTypes.usage', direction: 'subtract' },
  { value: 'maintenance', labelKey: 'parts.usageTypes.maintenance', direction: 'subtract' },
  { value: 'damaged', labelKey: 'parts.usageTypes.damaged', direction: 'subtract' },
  { value: 'audit_adjustment', labelKey: 'parts.usageTypes.auditAdjustment', direction: 'both' },
  { value: 'return', labelKey: 'parts.usageTypes.return', direction: 'add' },
];

export function StockAdjustmentDialog({ open, onOpenChange, part }: StockAdjustmentDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const updatePart = useUpdateMaintenancePart();

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      quantity: 1,
      direction: 'subtract',
      usage_type: 'usage',
      reason: '',
    },
  });

  const watchDirection = form.watch('direction');

  const onSubmit = async (values: AdjustmentFormValues) => {
    if (!part) return;

    const quantityChange = values.direction === 'add' ? values.quantity : -values.quantity;
    const newStock = (part.quantity_in_stock ?? 0) + quantityChange;

    if (newStock < 0) {
      return;
    }

    try {
      await updatePart.mutateAsync({
        id: part.id,
        quantity_in_stock: newStock,
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled in hook
    }
  };

  const newQuantity = part 
    ? (part.quantity_in_stock ?? 0) + (watchDirection === 'add' ? form.watch('quantity') : -form.watch('quantity'))
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('parts.adjustStock', 'Adjust Stock')}</DialogTitle>
          <DialogDescription>
            {part?.name} ({part?.part_number})
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-sm text-muted-foreground">{t('parts.currentStock', 'Current Stock')}</p>
              <p className="text-3xl font-bold">{part?.quantity_in_stock ?? 0}</p>
              <p className="text-xs text-muted-foreground">{part?.unit_of_measure}</p>
            </div>

            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('parts.adjustmentType', 'Adjustment Type')}</FormLabel>
                  <FormControl>
                    <ToggleGroup
                      type="single"
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="add" className="gap-2">
                        <Plus className="h-4 w-4" />
                        {t('parts.add', 'Add')}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="subtract" className="gap-2">
                        <Minus className="h-4 w-4" />
                        {t('parts.subtract', 'Subtract')}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('parts.quantity', 'Quantity')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
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
              name="usage_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('parts.reason', 'Reason')} *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {USAGE_TYPES.filter(
                        (type) => type.direction === 'both' || type.direction === watchDirection
                      ).map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {t(type.labelKey, type.value)}
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('parts.notes', 'Notes')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder={t('parts.notesPlaceholder', 'Optional notes about this adjustment...')} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="p-4 rounded-lg border bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">{t('parts.newStock', 'New Stock Level')}</p>
              <p className={`text-3xl font-bold ${newQuantity < 0 ? 'text-destructive' : ''}`}>
                {newQuantity}
              </p>
              {newQuantity < (part?.min_stock_level ?? 0) && newQuantity >= 0 && (
                <p className="text-xs text-warning">{t('parts.belowMinimum', 'Below minimum level')}</p>
              )}
              {newQuantity < 0 && (
                <p className="text-xs text-destructive">{t('parts.insufficientStock', 'Insufficient stock')}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={updatePart.isPending || newQuantity < 0}>
                {updatePart.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('parts.confirmAdjustment', 'Confirm Adjustment')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
