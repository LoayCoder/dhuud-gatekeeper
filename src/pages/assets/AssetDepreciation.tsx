import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calculator, Trash2, FileDown, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
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
  const purchasePrice = assetData.purchase_price || assetData.purchase_cost || 0;
  const salvageValue = assetData.salvage_value || 0;
  const usefulLifeYears = assetData.expected_lifespan_years || 5;
  const depreciationMethod = assetData.depreciation_method || 'straight_line';
  const startDate = assetData.installation_date || assetData.purchase_date;

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
              purchasePrice,
              salvageValue,
              usefulLifeYears,
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
        purchasePrice={purchasePrice}
        salvageValue={salvageValue}
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
