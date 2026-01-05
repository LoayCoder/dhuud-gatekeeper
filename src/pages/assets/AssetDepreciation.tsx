import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calculator, Trash2, FileDown, Table2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ModuleGate } from '@/components/ModuleGate';
import { 
  DepreciationScheduleTable, 
  DepreciationChart, 
  GenerateScheduleDialog,
  DepreciationSummaryCard 
} from '@/components/assets/depreciation';
import { useAsset } from '@/hooks/use-assets';
import { useDepreciationSchedules } from '@/hooks/use-depreciation-schedules';
import { cn } from '@/lib/utils';

function AssetDepreciationContent() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();

  const { data: asset, isLoading: assetLoading } = useAsset(id);
  const { 
    schedules, 
    isLoading: schedulesLoading, 
    generateSchedule, 
    isGenerating,
    deleteSchedule,
    isDeleting,
    clearAllSchedules,
    isClearing,
  } = useDepreciationSchedules({ assetId: id });

  if (assetLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="h-12 w-12 text-muted-foreground/50 mb-4" />
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
  const purchasePrice = assetData.purchase_price || assetData.purchase_cost;
  const salvageValue = assetData.salvage_value;
  const usefulLifeYears = assetData.expected_lifespan_years;
  const depreciationMethod = assetData.depreciation_method || 'straight_line';
  const startDate = assetData.installation_date || assetData.purchase_date;

  // Validate financial data completeness
  const hasPurchasePrice = purchasePrice !== null && purchasePrice !== undefined && purchasePrice > 0;
  const hasUsefulLife = usefulLifeYears !== null && usefulLifeYears !== undefined && usefulLifeYears > 0;
  const hasValidFinancials = hasPurchasePrice && hasUsefulLife;
  
  const missingFields: string[] = [];
  if (!hasPurchasePrice) missingFields.push(t('assets.fields.purchase_price', 'Purchase Price'));
  if (!hasUsefulLife) missingFields.push(t('assets.fields.expected_lifespan_years', 'Useful Life'));
  if (!startDate) missingFields.push(t('assets.fields.installation_date', 'Start Date'));
  
  // Use validated values or show warning
  const validatedPurchasePrice = hasPurchasePrice ? purchasePrice : 0;
  const validatedSalvageValue = salvageValue ?? 0;
  const validatedUsefulLife = hasUsefulLife ? usefulLifeYears : 5;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Missing Financial Data Warning */}
      {!hasValidFinancials && (
        <Alert variant="destructive" className="border-warning bg-warning/10">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <AlertTitle className="text-warning">
            {t('assets.depreciation.missingFinancials', 'Incomplete Financial Data')}
          </AlertTitle>
          <AlertDescription>
            {t('assets.depreciation.missingFinancialsDesc', 
              'The following required fields are missing: {{fields}}. Depreciation calculations may be inaccurate. Please update the asset record.',
              { fields: missingFields.join(', ') }
            )}
            <Button 
              variant="link" 
              className="h-auto p-0 ms-2 text-warning underline"
              onClick={() => navigate(`/assets/${id}/edit`)}
            >
              {t('assets.editAsset', 'Edit Asset')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/assets/${id}`)}>
            <ArrowLeft className={cn("h-5 w-5", direction === 'rtl' && "rotate-180")} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              {t('assets.depreciation.title', 'Depreciation Schedule')}
            </h1>
            <p className="text-muted-foreground">
              {assetData.name} ({asset.asset_code})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {schedules.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive">
                  <Trash2 className="h-4 w-4 me-2" />
                  {t('assets.depreciation.clearAll', 'Clear All')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('assets.depreciation.confirmClear', 'Clear All Schedules?')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('assets.depreciation.confirmClearDesc', 'This will remove all depreciation schedule records for this asset. This action cannot be undone.')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => id && clearAllSchedules(id)}
                    disabled={isClearing}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isClearing ? t('common.clearing', 'Clearing...') : t('common.clear', 'Clear')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <GenerateScheduleDialog
            assetId={id!}
            defaultValues={{
              purchasePrice: validatedPurchasePrice,
              salvageValue: validatedSalvageValue,
              usefulLifeYears: validatedUsefulLife,
              depreciationMethod,
              startDate,
            }}
            onGenerate={generateSchedule}
            isGenerating={isGenerating}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <DepreciationSummaryCard
        schedules={schedules}
        purchasePrice={validatedPurchasePrice}
        salvageValue={validatedSalvageValue}
        currency={assetData.currency || 'SAR'}
        isLoading={schedulesLoading}
      />

      {/* Tabs */}
      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart" className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            {t('assets.depreciation.chartView', 'Chart View')}
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            {t('assets.depreciation.tableView', 'Table View')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <DepreciationChart
            schedules={schedules}
            currency={assetData.currency || 'SAR'}
            salvageValue={salvageValue}
          />
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>{t('assets.depreciation.scheduleDetails', 'Schedule Details')}</CardTitle>
              <CardDescription>
                {t('assets.depreciation.scheduleDetailsDesc', 'Period-by-period depreciation breakdown')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DepreciationScheduleTable
                schedules={schedules}
                isLoading={schedulesLoading}
                currency={assetData.currency || 'SAR'}
                onDelete={deleteSchedule}
                isDeleting={isDeleting}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AssetDepreciation() {
  return (
    <ModuleGate module="asset_management" showUpgradePrompt>
      <AssetDepreciationContent />
    </ModuleGate>
  );
}
