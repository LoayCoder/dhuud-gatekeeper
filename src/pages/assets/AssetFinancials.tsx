import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, DollarSign, TrendingDown, PieChart, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ModuleGate } from '@/components/ModuleGate';
import { AssetCostTransactionList } from '@/components/assets/AssetCostTransactionList';
import { AssetTCOAnalysisCard } from '@/components/assets/AssetTCOAnalysisCard';
import { useAsset } from '@/hooks/use-assets';
import { useAssetCostTransactions, type TransactionType, type CreateTransactionInput } from '@/hooks/use-asset-cost-transactions';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const TRANSACTION_TYPES: { value: TransactionType; labelKey: string }[] = [
  { value: 'maintenance', labelKey: 'assets.transactions.maintenance' },
  { value: 'repair', labelKey: 'assets.transactions.repair' },
  { value: 'upgrade', labelKey: 'assets.transactions.upgrade' },
  { value: 'energy', labelKey: 'assets.transactions.energy' },
  { value: 'insurance', labelKey: 'assets.transactions.insurance' },
  { value: 'other', labelKey: 'assets.transactions.other' },
];

function AssetFinancialsContent() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();

  const { data: asset, isLoading: assetLoading } = useAsset(id);
  const { transactions, isLoading: txLoading, totals, createTransaction, isCreating } = useAssetCostTransactions(id);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateTransactionInput>>({
    transaction_type: 'maintenance',
    currency: 'SAR',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const handleSubmit = () => {
    if (!id || !formData.amount || !formData.transaction_type || !formData.transaction_date) {
      toast({
        title: t('common.error'),
        description: t('assets.fillRequiredFields', 'Please fill all required fields'),
        variant: 'destructive',
      });
      return;
    }

    createTransaction({
      asset_id: id,
      transaction_type: formData.transaction_type as TransactionType,
      amount: Number(formData.amount),
      currency: formData.currency || 'SAR',
      transaction_date: formData.transaction_date,
      description: formData.description,
      vendor_name: formData.vendor_name,
      invoice_number: formData.invoice_number,
    });
    setAddDialogOpen(false);
    setFormData({
      transaction_type: 'maintenance',
      currency: 'SAR',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  if (assetLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">{t('assets.notFound')}</h3>
            <Button variant="link" onClick={() => navigate('/assets')}>
              {t('common.backToList')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assetData = asset as any;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/assets/${id}`)}>
            <ArrowLeft className={cn("h-5 w-5", direction === 'rtl' && "rotate-180")} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              {String(t('assets.financials', 'Asset Financials'))}
            </h1>
            <p className="text-muted-foreground">
              {assetData.name} ({asset.asset_code})
            </p>
          </div>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 me-2" />
              {String(t('assets.addTransaction', 'Add Transaction'))}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{String(t('assets.addCostTransaction', 'Add Cost Transaction'))}</DialogTitle>
              <DialogDescription>
                {String(t('assets.addCostTransactionDesc', 'Record a new cost associated with this asset'))}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{String(t('assets.transactionType', 'Transaction Type'))} *</Label>
                <Select
                  value={formData.transaction_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, transaction_type: v as TransactionType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {String(t(type.labelKey, type.value))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{String(t('assets.amount', 'Amount'))} *</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{String(t('assets.currency', 'Currency'))}</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{String(t('assets.transactionDate', 'Date'))} *</Label>
                <Input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{String(t('assets.vendorName', 'Vendor Name'))}</Label>
                <Input
                  value={formData.vendor_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{String(t('assets.description', 'Description'))}</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                {String(t('common.cancel'))}
              </Button>
              <Button onClick={handleSubmit} disabled={isCreating}>
                {isCreating ? String(t('common.saving')) : String(t('common.save'))}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{String(t('assets.purchaseCost', 'Purchase Cost'))}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {assetData.purchase_cost ? `${assetData.purchase_cost.toLocaleString()} SAR` : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{String(t('assets.currentBookValue', 'Current Book Value'))}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {assetData.current_book_value ? `${assetData.current_book_value.toLocaleString()} SAR` : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{String(t('assets.totalCosts', 'Total Lifecycle Costs'))}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {totals.total?.toLocaleString() || 0} SAR
            </p>
            <p className="text-sm text-muted-foreground">
              {transactions?.length || 0} {String(t('assets.transactions', 'transactions'))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {String(t('assets.transactions', 'Transactions'))}
          </TabsTrigger>
          <TabsTrigger value="tco" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            {String(t('assets.tcoAnalysis', 'TCO Analysis'))}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <AssetCostTransactionList assetId={id!} />
        </TabsContent>

        <TabsContent value="tco">
          <AssetTCOAnalysisCard assetId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AssetFinancials() {
  return (
    <ModuleGate module="asset_management" showUpgradePrompt>
      <AssetFinancialsContent />
    </ModuleGate>
  );
}
