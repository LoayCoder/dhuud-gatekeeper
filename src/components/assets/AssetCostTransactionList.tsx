import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Plus, Trash2, DollarSign, Wrench, Zap, Shield, TrendingUp, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  useAssetCostTransactions, 
  TransactionType, 
  CreateTransactionInput 
} from '@/hooks/use-asset-cost-transactions';
import { cn } from '@/lib/utils';

interface AssetCostTransactionListProps {
  assetId: string;
  currency?: string;
}

const TRANSACTION_TYPES: { value: TransactionType; labelKey: string; icon: React.ElementType; color: string }[] = [
  { value: 'purchase', labelKey: 'assets.costs.purchase', icon: Package, color: 'bg-blue-500/10 text-blue-700' },
  { value: 'maintenance', labelKey: 'assets.costs.maintenance', icon: Wrench, color: 'bg-green-500/10 text-green-700' },
  { value: 'repair', labelKey: 'assets.costs.repair', icon: Wrench, color: 'bg-orange-500/10 text-orange-700' },
  { value: 'upgrade', labelKey: 'assets.costs.upgrade', icon: TrendingUp, color: 'bg-purple-500/10 text-purple-700' },
  { value: 'energy', labelKey: 'assets.costs.energy', icon: Zap, color: 'bg-yellow-500/10 text-yellow-700' },
  { value: 'insurance', labelKey: 'assets.costs.insurance', icon: Shield, color: 'bg-cyan-500/10 text-cyan-700' },
  { value: 'disposal', labelKey: 'assets.costs.disposal', icon: Trash2, color: 'bg-red-500/10 text-red-700' },
  { value: 'other', labelKey: 'assets.costs.other', icon: DollarSign, color: 'bg-gray-500/10 text-gray-700' },
];

const formSchema = z.object({
  transaction_type: z.string().min(1, 'Required'),
  amount: z.coerce.number().positive('Must be positive'),
  transaction_date: z.string().min(1, 'Required'),
  description: z.string().optional(),
  vendor_name: z.string().optional(),
  invoice_number: z.string().optional(),
});

export function AssetCostTransactionList({ assetId, currency = 'SAR' }: AssetCostTransactionListProps) {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { 
    transactions, 
    isLoading, 
    totals, 
    createTransaction, 
    deleteTransaction,
    isCreating,
  } = useAssetCostTransactions(assetId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transaction_type: 'maintenance',
      amount: 0,
      transaction_date: new Date().toISOString().split('T')[0],
      description: '',
      vendor_name: '',
      invoice_number: '',
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createTransaction({
      asset_id: assetId,
      transaction_type: values.transaction_type as TransactionType,
      amount: values.amount,
      currency: currency,
      transaction_date: values.transaction_date,
      description: values.description,
      vendor_name: values.vendor_name,
      invoice_number: values.invoice_number,
    });
    setIsDialogOpen(false);
    form.reset();
  };

  const getTypeConfig = (type: TransactionType) => {
    return TRANSACTION_TYPES.find(t => t.value === type) || TRANSACTION_TYPES[7];
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-green-600" />
          {t('assets.costs.title', 'Cost Transactions')}
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 me-2" />
              {t('assets.costs.addTransaction', 'Add Transaction')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('assets.costs.newTransaction', 'New Cost Transaction')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="transaction_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('assets.costs.type', 'Type')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TRANSACTION_TYPES.map((type) => (
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('assets.costs.amount', 'Amount')} ({currency})</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transaction_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('assets.costs.date', 'Date')}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="vendor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('assets.costs.vendor', 'Vendor')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoice_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('assets.costs.invoiceNumber', 'Invoice Number')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.description', 'Description')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isCreating}>
                  {t('common.save', 'Save')}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex flex-wrap gap-2">
          {TRANSACTION_TYPES.map((type) => {
            const total = totals[type.value] || 0;
            if (total === 0) return null;
            return (
              <Badge key={type.value} variant="outline" className={cn(type.color)}>
                {t(type.labelKey, type.value)}: {formatCurrency(total)}
              </Badge>
            );
          })}
          {totals.total > 0 && (
            <Badge variant="default">
              {t('assets.costs.total', 'Total')}: {formatCurrency(totals.total)}
            </Badge>
          )}
        </div>

        {/* Transactions Table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('common.loading', 'Loading...')}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('assets.costs.noTransactions', 'No cost transactions recorded yet')}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('assets.costs.date', 'Date')}</TableHead>
                  <TableHead>{t('assets.costs.type', 'Type')}</TableHead>
                  <TableHead>{t('assets.costs.amount', 'Amount')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('assets.costs.vendor', 'Vendor')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('common.description', 'Description')}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const typeConfig = getTypeConfig(tx.transaction_type as TransactionType);
                  const TypeIcon = typeConfig.icon;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(tx.transaction_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(typeConfig.color, 'gap-1')}>
                          <TypeIcon className="h-3 w-3" />
                          {t(typeConfig.labelKey, tx.transaction_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {tx.vendor_name || '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                        {tx.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTransaction(tx.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
