import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateStockTransaction } from '@/hooks/use-parts-inventory';

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partId: string | null;
}

export function StockAdjustmentDialog({ open, onOpenChange, partId }: StockAdjustmentDialogProps) {
  const { t } = useTranslation();
  const [transactionType, setTransactionType] = useState<'receipt' | 'issue' | 'adjustment' | 'return'>('receipt');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');

  const createTransaction = useCreateStockTransaction();

  const handleSubmit = () => {
    if (!partId || !quantity) return;

    createTransaction.mutate(
      {
        part_id: partId,
        transaction_type: transactionType,
        quantity: parseInt(quantity, 10),
        unit_cost: unitCost ? parseFloat(unitCost) : null,
        notes: notes || null,
        reference_type: null,
        reference_id: null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setQuantity('');
          setUnitCost('');
          setNotes('');
          setTransactionType('receipt');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('parts.stockAdjustment.title', 'Stock Adjustment')}</DialogTitle>
          <DialogDescription>
            {t('parts.stockAdjustment.description', 'Record a stock transaction for this part')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('parts.stockAdjustment.type', 'Transaction Type')}</Label>
            <Select value={transactionType} onValueChange={(v) => setTransactionType(v as typeof transactionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receipt">{t('parts.stockAdjustment.types.receipt', 'Receipt')}</SelectItem>
                <SelectItem value="issue">{t('parts.stockAdjustment.types.issue', 'Issue')}</SelectItem>
                <SelectItem value="adjustment">{t('parts.stockAdjustment.types.adjustment', 'Adjustment')}</SelectItem>
                <SelectItem value="return">{t('parts.stockAdjustment.types.return', 'Return')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('parts.stockAdjustment.quantity', 'Quantity')}</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={transactionType === 'adjustment' ? t('parts.stockAdjustment.newQuantity', 'New quantity') : '0'}
            />
            {transactionType === 'adjustment' && (
              <p className="text-xs text-muted-foreground">
                {t('parts.stockAdjustment.adjustmentHint', 'Enter the new absolute quantity')}
              </p>
            )}
          </div>

          {(transactionType === 'receipt' || transactionType === 'return') && (
            <div className="space-y-2">
              <Label>{t('parts.stockAdjustment.unitCost', 'Unit Cost (SAR)')}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('parts.stockAdjustment.notes', 'Notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('parts.stockAdjustment.notesPlaceholder', 'Optional notes...')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!quantity || createTransaction.isPending}>
            {createTransaction.isPending
              ? t('common.saving', 'Saving...')
              : t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
