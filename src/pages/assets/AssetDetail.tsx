import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Package, Edit, Trash2, MapPin, Calendar, AlertTriangle, FileText, Wrench, History, ShieldAlert, ImageIcon, ArrowRightLeft, ClipboardCheck, QrCode, Barcode, Activity, DollarSign, ExternalLink, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ModuleGate } from '@/components/ModuleGate';
import { AssetQRCode, AssetBarcodeLabel, MaintenanceScheduleList, AssetIncidentHistory, AssetPhotoUpload, AssetDocumentUpload, TransferHistoryTab, AssetTransferDialog, LabelSettingsDialog, LabelSettings, loadLabelSettings } from '@/components/assets';
import { Tabs as LabelTabs, TabsContent as LabelTabsContent, TabsList as LabelTabsList, TabsTrigger as LabelTabsTrigger } from '@/components/ui/tabs';
import { InspectionHistoryTab } from '@/components/inspections';
import { WarrantyClaimsTab, WarrantyExpiryBadge } from '@/components/assets/warranty';
import { useAsset, useAssetPhotos, useAssetDocuments, useAssetAuditLogs, useDeleteAsset } from '@/hooks/use-assets';
import { useUserRoles } from '@/hooks/use-user-roles';
import { format, isPast, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  inactive: 'bg-muted text-muted-foreground',
  under_maintenance: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  out_of_service: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  disposed: 'bg-muted text-muted-foreground line-through',
};

const CONDITION_COLORS: Record<string, string> = {
  excellent: 'bg-green-500/10 text-green-700 dark:text-green-400',
  good: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  fair: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  poor: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  critical: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

const CRITICALITY_COLORS: Record<string, string> = {
  low: 'bg-green-500/10 text-green-700',
  medium: 'bg-yellow-500/10 text-yellow-700',
  high: 'bg-orange-500/10 text-orange-700',
  critical: 'bg-red-500/10 text-red-700',
};

function AssetDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();
  const isArabic = i18n.language === 'ar';

  const { data: asset, isLoading } = useAsset(id);
  const { data: photos } = useAssetPhotos(id);
  const { data: documents } = useAssetDocuments(id);
  const { data: auditLogs } = useAssetAuditLogs(id);
  const deleteAsset = useDeleteAsset();

  const { hasModuleAccess } = useUserRoles();
  const canManage = hasModuleAccess('asset_management');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [labelSettings, setLabelSettings] = useState<LabelSettings>(() => loadLabelSettings());

  const handleDelete = async () => {
    if (!id) return;
    await deleteAsset.mutateAsync(id);
    navigate('/assets');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!asset) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">{t('assets.notFound')}</h3>
          <Button variant="link" onClick={() => navigate('/assets')}>
            {t('common.backToList')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const inspectionDue = asset.next_inspection_due ? new Date(asset.next_inspection_due) : null;
  const isOverdue = inspectionDue && isPast(inspectionDue);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/assets')}>
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
              <Badge variant="outline" className={cn(STATUS_COLORS[asset.status || 'active'])}>
                {t(`assets.status.${asset.status || 'active'}`)}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono">{asset.asset_code}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/assets/register?edit=${id}`)} className="gap-2">
              <Edit className="h-4 w-4" />
              {t('common.edit')}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  {t('common.delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir={direction}>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('assets.deleteConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('assets.deleteConfirmDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t('common.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Inspection Warning */}
      {isOverdue && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">{t('assets.inspectionOverdue')}</p>
              <p className="text-sm text-muted-foreground">
                {t('assets.lastDue')}: {format(inspectionDue!, 'PPP')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate(`/assets/${id}/health`)} className="gap-2">
          <Activity className="h-4 w-4" />
          {t('assets.tabs.health', 'Health & Predictions')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/assets/${id}/financials`)} className="gap-2">
          <DollarSign className="h-4 w-4" />
          {t('assets.tabs.financials', 'TCO & Financials')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" dir={direction}>
        <TabsList className="flex w-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className="gap-2 flex-shrink-0">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assets.tabs.overview')}</span>
          </TabsTrigger>
          <TabsTrigger value="inspections" className="gap-2 flex-shrink-0">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assets.tabs.inspections')}</span>
          </TabsTrigger>
          <TabsTrigger value="photos" className="gap-2 flex-shrink-0">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assets.tabs.photos')}</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2 flex-shrink-0">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assets.tabs.documents')}</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2 flex-shrink-0">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assets.tabs.maintenance')}</span>
          </TabsTrigger>
          <TabsTrigger value="incidents" className="gap-2 flex-shrink-0">
            <ShieldAlert className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assets.tabs.incidents')}</span>
          </TabsTrigger>
          <TabsTrigger value="transfers" className="gap-2 flex-shrink-0">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assets.tabs.transfers')}</span>
          </TabsTrigger>
          <TabsTrigger value="warranty" className="gap-2 flex-shrink-0">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assets.tabs.warranty', 'Warranty')}</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 flex-shrink-0">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assets.tabs.audit')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Label Card - QR/Barcode toggle */}
            <div className="lg:col-start-3 lg:row-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t('assets.assetLabel')}</span>
                    <LabelSettingsDialog 
                      settings={labelSettings} 
                      onSettingsChange={setLabelSettings} 
                    />
                  </div>
                  <LabelTabs defaultValue="qrcode">
                    <LabelTabsList className="grid w-full grid-cols-2">
                      <LabelTabsTrigger value="qrcode" className="gap-1.5 text-xs">
                        <QrCode className="h-4 w-4" />
                        {t('assets.qrCode')}
                      </LabelTabsTrigger>
                      <LabelTabsTrigger value="barcode" className="gap-1.5 text-xs">
                        <Barcode className="h-4 w-4" />
                        {t('assets.barcodeLabel')}
                      </LabelTabsTrigger>
                    </LabelTabsList>
                    <LabelTabsContent value="qrcode" className="mt-4">
                      <AssetQRCode 
                        assetId={asset.id} 
                        assetCode={asset.asset_code} 
                        assetName={asset.name}
                        siteName={asset.site?.name}
                        zoneName={asset.floor_zone?.name}
                        categoryName={isArabic && asset.category?.name_ar ? asset.category.name_ar : asset.category?.name}
                        serialNumber={asset.serial_number || undefined}
                        size={160}
                        settings={labelSettings}
                      />
                    </LabelTabsContent>
                    <LabelTabsContent value="barcode" className="mt-4">
                      <AssetBarcodeLabel
                        assetId={asset.id}
                        assetCode={asset.asset_code}
                        assetName={asset.name}
                        siteName={asset.site?.name}
                        zoneName={asset.floor_zone?.name}
                        categoryName={isArabic && asset.category?.name_ar ? asset.category.name_ar : asset.category?.name}
                        serialNumber={asset.serial_number || undefined}
                        settings={labelSettings}
                      />
                    </LabelTabsContent>
                  </LabelTabs>
                </CardHeader>
              </Card>
            </div>
            {/* Classification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('assets.classification')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('assets.category')}</span>
                  <span className="font-medium">
                    {isArabic && asset.category?.name_ar ? asset.category.name_ar : asset.category?.name}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('assets.type')}</span>
                  <span className="font-medium">
                    {isArabic && asset.type?.name_ar ? asset.type.name_ar : asset.type?.name}
                  </span>
                </div>
                {asset.subtype && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('assets.subtype')}</span>
                      <span className="font-medium">
                        {isArabic && asset.subtype?.name_ar ? asset.subtype.name_ar : asset.subtype?.name}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Identification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('assets.identification')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {asset.serial_number && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('assets.serialNumber')}</span>
                      <span className="font-mono">{asset.serial_number}</span>
                    </div>
                    <Separator />
                  </>
                )}
                {asset.manufacturer && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('assets.manufacturer')}</span>
                      <span className="font-medium">{asset.manufacturer}</span>
                    </div>
                    <Separator />
                  </>
                )}
                {asset.model && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('assets.model')}</span>
                    <span className="font-medium">{asset.model}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('assets.location')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {asset.branch && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('orgStructure.branch')}</span>
                      <span className="font-medium">{asset.branch.name}</span>
                    </div>
                    <Separator />
                  </>
                )}
                {asset.site && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('orgStructure.site')}</span>
                      <span className="font-medium">{asset.site.name}</span>
                    </div>
                    <Separator />
                  </>
                )}
                {asset.building && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('assets.building')}</span>
                      <span className="font-medium">
                        {isArabic && asset.building?.name_ar ? asset.building.name_ar : asset.building?.name}
                      </span>
                    </div>
                    <Separator />
                  </>
                )}
                {asset.floor_zone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('assets.floorZone')}</span>
                    <span className="font-medium">
                      {isArabic && asset.floor_zone?.name_ar ? asset.floor_zone.name_ar : asset.floor_zone?.name}
                    </span>
                  </div>
                )}
                {asset.location_details && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-muted-foreground text-sm">{t('assets.locationDetails')}</span>
                      <p className="mt-1">{asset.location_details}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Status & Condition */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('assets.statusCondition')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {asset.condition_rating && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t('assets.condition')}</span>
                      <Badge variant="outline" className={CONDITION_COLORS[asset.condition_rating]}>
                        {t(`assets.conditions.${asset.condition_rating}`)}
                      </Badge>
                    </div>
                    <Separator />
                  </>
                )}
                {asset.criticality_level && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t('assets.criticality.label')}</span>
                      <Badge variant="outline" className={CRITICALITY_COLORS[asset.criticality_level]}>
                        {t(`assets.criticality.${asset.criticality_level}`)}
                      </Badge>
                    </div>
                    <Separator />
                  </>
                )}
                {asset.ownership && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('assets.ownership.label')}</span>
                    <span className="font-medium">{t(`assets.ownership.${asset.ownership}`)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lifecycle Dates */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('assets.lifecycle')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {asset.installation_date && (
                    <div>
                      <span className="text-muted-foreground text-sm">{t('assets.installationDate')}</span>
                      <p className="font-medium">{format(new Date(asset.installation_date), 'PPP')}</p>
                    </div>
                  )}
                  {asset.commissioning_date && (
                    <div>
                      <span className="text-muted-foreground text-sm">{t('assets.commissioningDate')}</span>
                      <p className="font-medium">{format(new Date(asset.commissioning_date), 'PPP')}</p>
                    </div>
                  )}
                  {asset.warranty_expiry_date && (
                    <div>
                      <span className="text-muted-foreground text-sm">{t('assets.warrantyExpiry')}</span>
                      <p className={cn(
                        'font-medium',
                        isPast(new Date(asset.warranty_expiry_date)) && 'text-destructive'
                      )}>
                        {format(new Date(asset.warranty_expiry_date), 'PPP')}
                      </p>
                    </div>
                  )}
                  {asset.next_inspection_due && (
                    <div>
                      <span className="text-muted-foreground text-sm">{t('assets.nextInspection')}</span>
                      <p className={cn(
                        'font-medium',
                        isOverdue && 'text-destructive'
                      )}>
                        {format(new Date(asset.next_inspection_due), 'PPP')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inspections Tab */}
        <TabsContent value="inspections">
          <Card>
            <CardHeader>
              <CardTitle>{t('assets.tabs.inspections')}</CardTitle>
            <CardDescription>{t('inspections.historyDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <InspectionHistoryTab assetId={id!} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos">
          <Card>
            <CardHeader>
              <CardTitle>{t('assets.tabs.photos')}</CardTitle>
              <CardDescription>{t('assets.photosDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <AssetPhotoUpload 
                assetId={id!} 
                photos={photos || []} 
                canManage={canManage} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>{t('assets.tabs.documents')}</CardTitle>
              <CardDescription>{t('assets.documentsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <AssetDocumentUpload 
                assetId={id!} 
                documents={documents || []} 
                canManage={canManage} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>{t('assets.tabs.maintenance')}</CardTitle>
              <CardDescription>{t('assets.maintenanceDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <MaintenanceScheduleList assetId={id!} canManage={canManage} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle>{t('assets.tabs.incidents')}</CardTitle>
              <CardDescription>{t('assets.incidentHistoryDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <AssetIncidentHistory assetId={id!} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('assets.tabs.transfers')}</CardTitle>
                <CardDescription>{t('assets.transfer.noTransfers')}</CardDescription>
              </div>
              {canManage && (
                <Button onClick={() => setTransferDialogOpen(true)} className="gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  {t('assets.transfer.requestTransfer')}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <TransferHistoryTab assetId={id!} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warranty Tab */}
        <TabsContent value="warranty">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('assets.tabs.warranty', 'Warranty')}</CardTitle>
                  <CardDescription>{t('assets.warranty.description', 'Warranty information and claims')}</CardDescription>
                </div>
                <WarrantyExpiryBadge expiryDate={asset.warranty_expiry_date} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Warranty Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="text-sm text-muted-foreground">{t('assets.warranty.provider', 'Provider')}</span>
                  <p className="font-medium">{asset.warranty_provider || t('common.notProvided', 'Not provided')}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t('assets.warranty.expiryDate', 'Expiry Date')}</span>
                  <p className="font-medium">
                    {asset.warranty_expiry_date 
                      ? format(new Date(asset.warranty_expiry_date), 'PPP')
                      : t('common.notProvided', 'Not provided')}
                  </p>
                </div>
                {asset.warranty_terms && (
                  <div className="md:col-span-2">
                    <span className="text-sm text-muted-foreground">{t('assets.warranty.terms', 'Terms & Conditions')}</span>
                    <p className="text-sm mt-1">{asset.warranty_terms}</p>
                  </div>
                )}
              </div>
              <Separator />
              {/* Claims */}
              <WarrantyClaimsTab assetId={id!} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>{t('assets.tabs.audit')}</CardTitle>
              <CardDescription>{t('assets.auditDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('assets.noAuditLogs')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {auditLogs?.map((log) => (
                    <div key={log.id} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.action}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {t('common.by')} {log.actor?.full_name || t('common.system')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(log.created_at!), 'PPpp')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfer Dialog */}
      {asset && (
        <AssetTransferDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          asset={asset}
        />
      )}
    </div>
  );
}

export default function AssetDetail() {
  return (
    <ModuleGate module="asset_management">
      <AssetDetailContent />
    </ModuleGate>
  );
}
