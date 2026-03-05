import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, RefreshCw, CornerUpLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useStockTransactions } from '@/hooks/use-parts-inventory';

interface StockHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partId: string | null;
}

const typeIcons = {
  receipt: <ArrowDown className="h-4 w-4 text-emerald-500" />,
  issue: <ArrowUp className="h-4 w-4 text-destructive" />,
  adjustment: <RefreshCw className="h-4 w-4 text-amber-500" />,
  return: <CornerUpLeft className="h-4 w-4 text-blue-500" />,
};

const typeVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  receipt: 'default',
  issue: 'destructive',
  adjustment: 'secondary',
  return: 'outline',
};

export function StockHistoryDialog({ open, onOpenChange, partId }: StockHistoryDialogProps) {
  const { t } = useTranslation();
  const { data: transactions, isLoading } = useStockTransactions(partId || undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('parts.stockHistory.title', 'Stock History')}</DialogTitle>
          <DialogDescription>
            {t('parts.stockHistory.description', 'View all stock transactions for this part')}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('parts.stockHistory.date', 'Date')}</TableHead>
                <TableHead>{t('parts.stockHistory.type', 'Type')}</TableHead>
                <TableHead className="text-end">{t('parts.stockHistory.quantity', 'Qty')}</TableHead>
                <TableHead className="text-end">{t('parts.stockHistory.before', 'Before')}</TableHead>
                <TableHead className="text-end">{t('parts.stockHistory.after', 'After')}</TableHead>
                <TableHead>{t('parts.stockHistory.notes', 'Notes')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (transactions || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('parts.stockHistory.empty', 'No transactions recorded')}
                  </TableCell>
                </TableRow>
              ) : (
                (transactions || []).map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {typeIcons[tx.transaction_type]}
                        <Badge variant={typeVariants[tx.transaction_type]}>
                          {t(`parts.stockAdjustment.types.${tx.transaction_type}`, tx.transaction_type)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-end font-mono">
                      {tx.transaction_type === 'issue' ? '-' : '+'}
                      {tx.quantity}
                    </TableCell>
                    <TableCell className="text-end font-mono text-muted-foreground">
                      {tx.previous_quantity ?? '-'}
                    </TableCell>
                    <TableCell className="text-end font-mono font-medium">
                      {tx.new_quantity ?? '-'}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={tx.notes || ''}>
                      {tx.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
