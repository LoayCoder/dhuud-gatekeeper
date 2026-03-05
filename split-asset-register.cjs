const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/pages/assets/AssetRegister.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/pages/assets/AssetRegister');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const hooksDir = path.join(targetDir, 'hooks');
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

const componentsDir = path.join(targetDir, 'components');
if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });

function extractBetween(str, startStr, endStr) {
    const startIdx = str.indexOf(startStr);
    if (startIdx === -1) return '';
    const restStr = str.substring(startIdx + startStr.length);
    const endIdx = restStr.indexOf(endStr);
    if (endIdx === -1) return '';
    return restStr.substring(0, endIdx);
}

// 1. Types & Schema
const schemaStr = extractBetween(content, 'const assetSchema = z.object({', 'type AssetFormValues = z.infer<typeof assetSchema>;');
const typesContent = `import { z } from 'zod';

export const assetSchema = z.object({${schemaStr}
export type AssetFormValues = z.infer<typeof assetSchema>;
`;
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesContent);

// 2. Main Hook for State
const stateTop = `import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAsset, useAssetCategories, useAssetTypes, useAssetSubtypes, useCreateAsset, useUpdateAsset, useCreateBulkAssets, generateAssetCode, generateSequentialCodes, getNextAssetSequence } from '@/hooks/use-assets';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { CreationStatus } from '@/components/assets';
import { assetSchema, AssetFormValues } from '../types';

export function useAssetRegisterState() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const direction = i18n.dir();
  const isArabic = i18n.language === 'ar';
`;

const stateBody = extractBetween(content, '  const { profile } = useAuth();', '  const isSubmitting = createAsset.isPending || updateAsset.isPending || createBulkAssets.isPending;');
const stateBottom = `  const isSubmitting = createAsset.isPending || updateAsset.isPending || createBulkAssets.isPending;

  const filteredSites = selectedBranchId 
    ? sites?.filter(s => s.branch_id === selectedBranchId) 
    : sites;

  const previewCodes = bulkQuantity > 1 && form.watch('asset_code')
    ? generateSequentialCodes(form.watch('asset_code') as string, Math.min(bulkQuantity, 5))
    : [];

  return {
    t, i18n, navigate, searchParams, editId, direction, isArabic,
    profile, tenantId, activeTab, setActiveTab,
    selectedCategoryId, setSelectedCategoryId,
    selectedTypeId, setSelectedTypeId,
    selectedBranchId, setSelectedBranchId,
    selectedSiteId, setSelectedSiteId,
    selectedBuildingId, setSelectedBuildingId,
    bulkQuantity, setBulkQuantity,
    creationStatus, setCreationStatus,
    createdAssetIds, setCreatedAssetIds,
    createdAssetCodes, setCreatedAssetCodes,
    creationError, setCreationError,
    existingAsset, loadingAsset,
    categories, types, subtypes,
    createAsset, updateAsset, createBulkAssets,
    branches, sites, buildings, floorsZones,
    form, onSubmit, handleRetry, handleCreateAnother,
    isSubmitting, filteredSites, previewCodes, generateSequentialCodes
  };
}
`;

fs.writeFileSync(path.join(hooksDir, 'useAssetRegisterState.ts'), stateTop + "  const { profile } = useAuth();" + stateBody + stateBottom);

// 3. Tab Components
const tabImportsStr = `import { useTranslation } from 'react-i18next';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Info } from 'lucide-react';
import { AssetFormValues } from '../types';

`;

// Classification Tab
const classTabContent = extractBetween(content, '{/* Classification Tab */}', '{/* Location Tab */}');
fs.writeFileSync(path.join(componentsDir, 'ClassificationTab.tsx'),
    `${tabImportsStr}export function ClassificationTab({ state }: { state: any }) {
  const { t, direction, isArabic, editId, categories, types, subtypes, bulkQuantity, form, selectedCategoryId, setSelectedCategoryId, setSelectedTypeId, previewCodes, generateSequentialCodes, setBulkQuantity } = state;
  return (\n    ${classTabContent.trim()}\n  );\n}\n`);

// Location Tab
const locTabContent = extractBetween(content, '{/* Location Tab */}', '{/* Status Tab */}');
fs.writeFileSync(path.join(componentsDir, 'LocationTab.tsx'),
    `${tabImportsStr}export function LocationTab({ state }: { state: any }) {
  const { t, direction, isArabic, form, branches, filteredSites, buildings, floorsZones, selectedBranchId, setSelectedBranchId, selectedSiteId, setSelectedSiteId, selectedBuildingId, setSelectedBuildingId } = state;
  return (\n    ${locTabContent.trim()}\n  );\n}\n`);

// Status Tab
const statTabContent = extractBetween(content, '{/* Status Tab */}', '{/* Lifecycle Tab */}');
fs.writeFileSync(path.join(componentsDir, 'StatusTab.tsx'),
    `${tabImportsStr}export function StatusTab({ state }: { state: any }) {
  const { t, direction, form } = state;
  return (\n    ${statTabContent.trim()}\n  );\n}\n`);

// Lifecycle Tab
const lifeTabContent = extractBetween(content, '{/* Lifecycle Tab */}', '</Tabs>');
fs.writeFileSync(path.join(componentsDir, 'LifecycleTab.tsx'),
    `${tabImportsStr}export function LifecycleTab({ state }: { state: any }) {
  const { t, form } = state;
  return (\n    ${lifeTabContent.trim()}\n  );\n}\n`);

// 4. Main Component
const shellContent = `import { ArrowLeft, Package, MapPin, Settings, Calendar, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleGate, HSSERoute } from '@/components';
import { AssetCreationStatusCard } from '@/components/assets';
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
`;

fs.writeFileSync(path.join(targetDir, 'AssetRegister.tsx'), shellContent);
fs.writeFileSync(path.join(targetDir, 'index.tsx'), "export { default } from './AssetRegister';\n");

console.log('Extraction complete!');
