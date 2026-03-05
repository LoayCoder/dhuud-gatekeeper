import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Package,
  Table,
  ListChecks
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  generateAssetImportTemplate, 
  parseAssetExcelFile, 
  validateAssetImportData, 
  mapAssetToIds,
  generateAssetCode,
  type ImportAsset,
  type AssetImportValidationResult,
  type AssetLookupMaps,
  type AssetTemplateLookupData
} from '@/lib/asset-import-utils';
import { toast } from 'sonner';
import { ImportPreviewTable, ImportErrorSummary } from './import';

interface AssetImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

type ImportStep = 'upload' | 'validate' | 'import';

export function AssetImportDialog({ open, onOpenChange, onImportComplete }: AssetImportDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { user, profile } = useAuth();
  
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<AssetImportValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);
  
  // Lookup data for validation
  const [lookup, setLookup] = useState<AssetLookupMaps | null>(null);
  
  // Lookup data for template dropdowns
  const [templateLookupData, setTemplateLookupData] = useState<AssetTemplateLookupData | null>(null);
  
  const [existingSerialNumbers, setExistingSerialNumbers] = useState<Set<string>>(new Set());
  
  // Load hierarchy data when dialog opens
  useEffect(() => {
    if (open && profile?.tenant_id) {
      loadHierarchyData();
    }
  }, [open, profile?.tenant_id]);
  
  const loadHierarchyData = async () => {
    if (!profile?.tenant_id) return;
    
    const [
      categoriesRes, 
      typesRes, 
      subtypesRes, 
      branchesRes, 
      sitesRes, 
      buildingsRes, 
      floorsZonesRes,
      existingAssetsRes
    ] = await Promise.all([
      supabase.from('asset_categories').select('id, name, code').is('deleted_at', null).eq('is_active', true),
      supabase.from('asset_types').select('id, name, code, category_id').is('deleted_at', null).eq('is_active', true),
      supabase.from('asset_subtypes').select('id, name, code, type_id').is('deleted_at', null).eq('is_active', true),
      supabase.from('branches').select('id, name').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
      supabase.from('sites').select('id, name, branch_id').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
      supabase.from('buildings').select('id, name, site_id').eq('tenant_id', profile.tenant_id).is('deleted_at', null).eq('is_active', true),
      supabase.from('floors_zones').select('id, name, building_id').eq('tenant_id', profile.tenant_id).is('deleted_at', null).eq('is_active', true),
      supabase.from('hsse_assets').select('serial_number').eq('tenant_id', profile.tenant_id).is('deleted_at', null).not('serial_number', 'is', null),
    ]);
    
    // Store lookup maps for validation (lowercase keys)
    setLookup({
      categories: new Map((categoriesRes.data || []).map(c => [c.name.toLowerCase(), c.id])),
      types: new Map((typesRes.data || []).map(t => [t.name.toLowerCase(), { id: t.id, category_id: t.category_id }])),
      subtypes: new Map((subtypesRes.data || []).map(s => [s.name.toLowerCase(), { id: s.id, type_id: s.type_id }])),
      branches: new Map((branchesRes.data || []).map(b => [b.name.toLowerCase(), b.id])),
      sites: new Map((sitesRes.data || []).map(s => [s.name.toLowerCase(), { id: s.id, branch_id: s.branch_id }])),
      buildings: new Map((buildingsRes.data || []).map(b => [b.name.toLowerCase(), { id: b.id, site_id: b.site_id }])),
      floorsZones: new Map((floorsZonesRes.data || []).map(f => [f.name.toLowerCase(), { id: f.id, building_id: f.building_id }])),
    });
    
    // Store hierarchy data for template dropdowns (original names)
    setTemplateLookupData({
      categories: (categoriesRes.data || []).map(c => c.name),
      types: (typesRes.data || []).map(t => t.name),
      subtypes: (subtypesRes.data || []).map(s => s.name),
      branches: (branchesRes.data || []).map(b => b.name),
      sites: (sitesRes.data || []).map(s => s.name),
      buildings: (buildingsRes.data || []).map(b => b.name),
      floorsZones: (floorsZonesRes.data || []).map(f => f.name),
    });
    
    // Store existing serial numbers for duplicate check
    setExistingSerialNumbers(
      new Set((existingAssetsRes.data || []).map(a => a.serial_number!.toLowerCase()))
    );
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Check file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error(t('assets.import.fileTooLarge'));
      return;
    }
    
    setFile(selectedFile);
    setIsValidating(true);
    
    try {
      const assets = await parseAssetExcelFile(selectedFile);
      
      if (assets.length === 0) {
        toast.error(t('assets.import.noDataFound'));
        setIsValidating(false);
        return;
      }
      
      if (lookup) {
        const result = validateAssetImportData(assets, lookup, existingSerialNumbers);
        setValidationResult(result);
        setStep('validate');
      }
    } catch (error) {
      toast.error(t('assets.import.parseError'));
    } finally {
      setIsValidating(false);
    }
  };
  
  const handleImport = async () => {
    if (!validationResult || !profile?.tenant_id || !lookup) return;
    
    const assetsToImport = validationResult.validAssets;
    
    setIsImporting(true);
    setStep('import');
    setImportProgress(0);
    
    let success = 0;
    let failed = 0;
    
    // Get current sequence for asset code generation
    const { count } = await supabase
      .from('hsse_assets')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id);
    
    let currentSequence = (count || 0) + 1;
    
    for (let i = 0; i < assetsToImport.length; i++) {
      const importAsset = assetsToImport[i];
      const ids = mapAssetToIds(importAsset, lookup);
      
      try {
        // Get category code for asset code generation
        const categoryCode = ids.category_id 
          ? (await supabase
              .from('asset_categories')
              .select('code')
              .eq('id', ids.category_id)
              .single()
            ).data?.code || 'AST'
          : 'AST';
        
        const assetCode = generateAssetCode(categoryCode, currentSequence);
        
        // Calculate next inspection due date if interval is provided
        let nextInspectionDue: string | undefined;
        if (importAsset.inspection_interval_days) {
          const installDate = importAsset.installation_date 
            ? new Date(importAsset.installation_date) 
            : new Date();
          nextInspectionDue = new Date(
            installDate.getTime() + importAsset.inspection_interval_days * 24 * 60 * 60 * 1000
          ).toISOString().split('T')[0];
        }
        
        // Parse tags to array
        const tags = importAsset.tags 
          ? importAsset.tags.split(',').map(t => t.trim()).filter(Boolean)
          : undefined;
        
        const { error: assetError } = await supabase
          .from('hsse_assets')
          .insert({
            tenant_id: profile.tenant_id,
            asset_code: assetCode,
            name: importAsset.name,
            description: importAsset.description,
            category_id: ids.category_id!,
            type_id: ids.type_id!,
            subtype_id: ids.subtype_id,
            serial_number: importAsset.serial_number,
            manufacturer: importAsset.manufacturer,
            model: importAsset.model,
            branch_id: ids.branch_id,
            site_id: ids.site_id,
            building_id: ids.building_id,
            floor_zone_id: ids.floor_zone_id,
            status: (importAsset.status as 'active' | 'out_of_service' | 'under_maintenance' | 'retired' | 'missing') || 'active',
            condition_rating: importAsset.condition_rating as 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | undefined,
            criticality_level: importAsset.criticality_level as 'low' | 'medium' | 'high' | 'critical' | undefined,
            installation_date: importAsset.installation_date,
            commissioning_date: importAsset.commissioning_date,
            warranty_expiry_date: importAsset.warranty_expiry_date,
            inspection_interval_days: importAsset.inspection_interval_days,
            next_inspection_due: nextInspectionDue,
            tags,
            created_by: user?.id,
          });
        
        if (assetError) throw assetError;
        
        success++;
        currentSequence++;
      } catch (error) {
        console.error('Failed to import asset:', importAsset.name, error);
        failed++;
      }
      
      setImportProgress(Math.round(((i + 1) / assetsToImport.length) * 100));
    }
    
    setImportResults({ success, failed });
    setIsImporting(false);
    
    if (success > 0) {
      toast.success(t('assets.import.success', { count: success }));
    }
  };
  
  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setValidationResult(null);
    setImportProgress(0);
    setImportResults(null);
    onOpenChange(false);
    
    if (importResults && importResults.success > 0) {
      onImportComplete();
    }
  };
  
  const getErrorMessage = (message: string): string => {
    return t(`assets.import.${message}`);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('assets.import.title')}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && t('assets.import.step1Description')}
            {step === 'validate' && t('assets.import.step2Description')}
            {step === 'import' && t('assets.import.step3Description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  {t('assets.import.instructions')}
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => generateAssetImportTemplate({ 
                    includeSamples: false, 
                    lookupData: templateLookupData || undefined 
                  })}
                  className="flex-1"
                  disabled={!templateLookupData}
                >
                  <Download className="h-4 w-4 me-2" />
                  {t('assets.import.downloadTemplate')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => generateAssetImportTemplate({ 
                    includeSamples: true, 
                    lookupData: templateLookupData || undefined 
                  })}
                  className="flex-1"
                  disabled={!templateLookupData}
                >
                  <Download className="h-4 w-4 me-2" />
                  {t('assets.import.downloadWithSamples')}
                </Button>
              </div>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="asset-file-upload"
                  disabled={isValidating || !lookup}
                />
                <label
                  htmlFor="asset-file-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  {isValidating ? (
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="h-10 w-10 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{t('assets.import.dropzone')}</p>
                    <p className="text-sm text-muted-foreground">{t('assets.import.fileTypes')}</p>
                  </div>
                </label>
              </div>
            </div>
          )}
          
          {/* Step 2: Validate */}
          {step === 'validate' && validationResult && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 me-1" />
                  {t('assets.import.validAssets', { count: validationResult.validAssets.length })}
                </Badge>
                {validationResult.errors.length > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 me-1" />
                    {t('assets.import.invalidRows', { count: validationResult.errors.length })}
                  </Badge>
                )}
                {validationResult.warnings.length > 0 && (
                  <Badge variant="secondary">
                    <AlertTriangle className="h-3 w-3 me-1" />
                    {t('assets.import.warningRows', { count: validationResult.warnings.length })}
                  </Badge>
                )}
              </div>
              
              <ScrollArea className="h-[300px] border rounded-md">
                <div className="p-4 space-y-2">
                  {validationResult.assets.map((asset, index) => {
                    const rowErrors = validationResult.errors.filter(e => e.row === index + 3);
                    const rowWarnings = validationResult.warnings.filter(w => w.row === index + 3);
                    const isValid = rowErrors.length === 0;
                    
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-md border ${isValid ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isValid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium">{asset.name || t('assets.import.unnamed')}</span>
                            <Badge variant="outline" className="text-xs">{asset.category_name}</Badge>
                            <Badge variant="outline" className="text-xs">{asset.type_name}</Badge>
                          </div>
                        </div>
                        {rowErrors.length > 0 && (
                          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {rowErrors.map((err, i) => (
                              <div key={i}>• {err.field}: {getErrorMessage(err.message)}</div>
                            ))}
                          </div>
                        )}
                        {rowWarnings.length > 0 && (
                          <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                            {rowWarnings.map((warn, i) => (
                              <div key={i}>⚠ {getErrorMessage(warn.message)}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
          
          {/* Step 3: Import */}
          {step === 'import' && (
            <div className="space-y-6">
              {isImporting ? (
                <>
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                    <p className="mt-4 font-medium">{t('assets.import.importing')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('assets.import.progress', { progress: importProgress })}
                    </p>
                  </div>
                  <Progress value={importProgress} />
                </>
              ) : importResults && (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                  <div>
                    <p className="text-lg font-medium">{t('assets.import.complete')}</p>
                    <p className="text-muted-foreground">
                      {t('assets.import.results', {
                        success: importResults.success,
                        failed: importResults.failed
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
          )}
          
          {step === 'validate' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                {t('common.back')}
              </Button>
              <Button 
                onClick={handleImport}
                disabled={!validationResult || validationResult.validAssets.length === 0}
              >
                {t('assets.import.importButton', { count: validationResult?.validAssets.length || 0 })}
              </Button>
            </>
          )}
          
          {step === 'import' && !isImporting && (
            <Button onClick={handleClose}>
              {t('common.close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
