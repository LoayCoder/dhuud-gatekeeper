import { ArrowLeft, Package, MapPin, Settings, Calendar, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleGate, HSSERoute } from '@/components';
import { AssetCreationStatusCard } from '@/features/assets';
import { useAssetRegisterState } from './hooks/useAssetRegisterState';
import { ClassificationTab } from './components/ClassificationTab';
import { LocationTab } from './components/LocationTab';
import { StatusTab } from './components/StatusTab';
import { LifecycleTab } from './components/LifecycleTab';

function AssetRegisterContent() {
  const state = useAssetRegisterState();
  const {
    t, navigate, editId, direction, activeTab, setActiveTab,
    creationStatus, createdAssetIds, createdAssetCodes, creationError,
    loadingAsset, form, onSubmit, handleRetry, handleCreateAnother,
    isSubmitting, bulkQuantity
  } = state;

  if (loadingAsset && editId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/assets')}>
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {editId ? t('assets.editAsset') : t('assets.registerAsset')}
          </h1>
          <p className="text-muted-foreground">{t('assets.registerDescription')}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="classification" className="gap-2">
                <Package className="h-4 w-4 hidden sm:block" />
                {t('assets.steps.classification')}
              </TabsTrigger>
              <TabsTrigger value="location" className="gap-2">
                <MapPin className="h-4 w-4 hidden sm:block" />
                {t('assets.steps.location')}
              </TabsTrigger>
              <TabsTrigger value="status" className="gap-2">
                <Settings className="h-4 w-4 hidden sm:block" />
                {t('assets.steps.status')}
              </TabsTrigger>
              <TabsTrigger value="lifecycle" className="gap-2">
                <Calendar className="h-4 w-4 hidden sm:block" />
                {t('assets.steps.lifecycle')}
              </TabsTrigger>
            </TabsList>

            <ClassificationTab state={state} />
            <LocationTab state={state} />
            <StatusTab state={state} />
            <LifecycleTab state={state} />
          </Tabs>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="outline" onClick={() => navigate('/assets')}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editId 
                ? t('common.saveChanges') 
                : bulkQuantity > 1 
                  ? t('assets.createBulkAssets', { count: bulkQuantity })
                  : t('assets.registerAsset')
              }
            </Button>
          </div>
        </form>
      </Form>

      {/* Creation Status Card */}
      {creationStatus !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <AssetCreationStatusCard
            status={creationStatus}
            assetCodes={createdAssetCodes}
            assetIds={createdAssetIds}
            errorMessage={creationError}
            onRetry={handleRetry}
            onCreateAnother={handleCreateAnother}
            redirectSeconds={5}
          />
        </div>
      )}
    </div>
  );
}

export default function AssetRegister() {
  return (
    <ModuleGate module="asset_management">
      <HSSERoute>
        <AssetRegisterContent />
      </HSSERoute>
    </ModuleGate>
  );
}

