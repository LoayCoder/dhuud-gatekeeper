import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package, Filter, Grid, List, AlertTriangle, Calendar, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { ModuleGate } from '@/components/ModuleGate';
import { AssetImportDialog } from '@/components/assets';
import { useAssets, useAssetCategories, type AssetFilters, type AssetWithRelations } from '@/hooks/use-assets';
import { useUserRoles } from '@/hooks/use-user-roles';
import { useAuth } from '@/contexts/AuthContext';
import { format, isPast, isFuture, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { exportToExcel, type ExportColumn } from '@/lib/export-utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 dark:text-green-400',
  inactive: 'bg-muted text-muted-foreground',
  under_maintenance: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  out_of_service: 'bg-red-500/10 text-red-700 dark:text-red-400',
  disposed: 'bg-muted text-muted-foreground line-through',
};

const CONDITION_COLORS: Record<string, string> = {
  excellent: 'bg-green-500/10 text-green-700 dark:text-green-400',
  good: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  fair: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  poor: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  critical: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

function AssetCard({ asset, onClick }: { asset: AssetWithRelations; onClick: () => void }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const inspectionDue = asset.next_inspection_due ? new Date(asset.next_inspection_due) : null;
  const isOverdue = inspectionDue && isPast(inspectionDue);
  const isDueSoon = inspectionDue && !isOverdue && isFuture(inspectionDue) && inspectionDue <= addDays(new Date(), 7);

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium line-clamp-1">{asset.name}</CardTitle>
              <CardDescription className="text-xs">{asset.asset_code}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[asset.status || 'active'])}>
            {t(`assets.status.${asset.status || 'active'}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t('assets.category')}</span>
            <span className="font-medium text-foreground">
              {isArabic && asset.category?.name_ar ? asset.category.name_ar : asset.category?.name}
            </span>
          </div>
          {asset.condition_rating && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{t('assets.condition')}</span>
              <Badge variant="outline" className={cn('text-xs', CONDITION_COLORS[asset.condition_rating])}>
                {t(`assets.conditions.${asset.condition_rating}`)}
              </Badge>
            </div>
          )}
          {inspectionDue && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t('assets.nextInspection')}
              </span>
              <span className={cn(
                'font-medium',
                isOverdue && 'text-destructive',
                isDueSoon && 'text-yellow-600 dark:text-yellow-400'
              )}>
                {format(inspectionDue, 'MMM d, yyyy')}
                {isOverdue && <AlertTriangle className="inline-block h-3 w-3 ms-1" />}
              </span>
            </div>
          )}
          {asset.site && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{t('assets.location')}</span>
              <span className="font-medium text-foreground truncate max-w-[120px]">
                {asset.site.name}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AssetListContent() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<AssetFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { hasModuleAccess } = useUserRoles();
  const canManage = hasModuleAccess('asset_management');

  const { data: categories, refetch: refetchCategories } = useAssetCategories();
  const { 
    data, 
    isLoading,
    refetch: refetchAssets,
    page, 
    goToPage, 
    goToNextPage, 
    goToPreviousPage 
  } = useAssets(filters);

  const handleSearch = (value: string) => {
    setSearchInput(value);
    // Debounce search
    const timeout = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value || undefined }));
    }, 300);
    return () => clearTimeout(timeout);
  };
  
  const handleImportComplete = () => {
    refetchAssets();
  };

  const handleFilterChange = (key: keyof AssetFilters, value: string | null) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const handleExportToExcel = async () => {
    if (!profile?.tenant_id) {
      toast.error(t('common.error'));
      return;
    }

    setIsExporting(true);
    
    try {
      // Fetch all assets with branch and site info
      const allAssets: Array<{
        asset_code: string;
        name: string;
        branch_name: string;
        site_name: string;
      }> = [];
      
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('hsse_assets')
          .select(`
            asset_code,
            name,
            branch:branches(name),
            site:sites(name)
          `)
          .eq('tenant_id', profile.tenant_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);

        // Apply filters if present
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,asset_code.ilike.%${filters.search}%`);
        }
        if (filters.categoryId) {
          query = query.eq('category_id', filters.categoryId);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }

        const { data: assets, error } = await query;

        if (error) throw error;

        if (assets && assets.length > 0) {
          // Flatten the data for export
          const flattenedAssets = assets.map((asset: {
            asset_code: string | null;
            name: string | null;
            branch: { name: string } | null;
            site: { name: string } | null;
          }) => ({
            asset_code: asset.asset_code || '',
            name: asset.name || '',
            branch_name: asset.branch?.name || '',
            site_name: asset.site?.name || '',
          }));
          allAssets.push(...flattenedAssets);
        }

        hasMore = assets?.length === pageSize;
        from += pageSize;
      }

      if (allAssets.length === 0) {
        toast.error(t('assets.noAssetsToExport'));
        return;
      }

      // Define export columns
      const exportColumns: ExportColumn[] = [
        { key: 'asset_code', label: t('assets.assetCode') },
        { key: 'name', label: t('assets.name') },
        { key: 'branch_name', label: t('assets.branch') },
        { key: 'site_name', label: t('assets.site') },
      ];

      // Export to Excel
      exportToExcel(allAssets, `assets-${format(new Date(), 'yyyy-MM-dd')}.xlsx`, exportColumns);
      toast.success(t('assets.exportSuccess'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('common.error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('assets.title')}</h1>
          <p className="text-muted-foreground">{t('assets.description')}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportToExcel} 
              disabled={isExporting}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? t('common.loading') : t('assets.exportToExcel')}
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              {t('assets.import.title')}
            </Button>
            <Button onClick={() => navigate('/assets/register')} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('assets.registerAsset')}
            </Button>
          </div>
        )}
      </div>
      
      {/* Import Dialog */}
      <AssetImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={handleImportComplete}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('assets.searchPlaceholder')}
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={filters.categoryId || 'all'}
                onValueChange={(v) => handleFilterChange('categoryId', v === 'all' ? null : v)}
                dir={direction}
              >
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 me-2" />
                  <SelectValue placeholder={t('assets.category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {i18n.language === 'ar' && cat.name_ar ? cat.name_ar : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.status || 'all'}
                onValueChange={(v) => handleFilterChange('status', v === 'all' ? null : v)}
                dir={direction}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('assets.status.label')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="active">{t('assets.status.active')}</SelectItem>
                  <SelectItem value="inactive">{t('assets.status.inactive')}</SelectItem>
                  <SelectItem value="under_maintenance">{t('assets.status.under_maintenance')}</SelectItem>
                  <SelectItem value="out_of_service">{t('assets.status.out_of_service')}</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="rounded-e-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="rounded-s-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset Grid/List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-4 w-3/4 mt-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent className="pt-2 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.data?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">{t('assets.noAssets')}</h3>
            <p className="text-muted-foreground text-sm mb-4">{t('assets.noAssetsDescription')}</p>
            {canManage && (
              <Button onClick={() => navigate('/assets/register')} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('assets.registerFirst')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data?.data?.map((asset) => (
            <AssetCard 
              key={asset.id} 
              asset={asset} 
              onClick={() => navigate(`/assets/${asset.id}`)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {data?.data?.map((asset) => (
                <div 
                  key={asset.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/assets/${asset.id}`)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{asset.name}</div>
                    <div className="text-sm text-muted-foreground">{asset.asset_code}</div>
                  </div>
                  <div className="hidden sm:block text-sm text-muted-foreground">
                    {i18n.language === 'ar' && asset.category?.name_ar ? asset.category.name_ar : asset.category?.name}
                  </div>
                  <Badge variant="outline" className={cn('text-xs shrink-0', STATUS_COLORS[asset.status || 'active'])}>
                    {t(`assets.status.${asset.status || 'active'}`)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data && data.count > 0 && (
        <PaginationControls
          page={page}
          totalPages={data.totalPages}
          totalCount={data.count}
          pageSize={20}
          onFirstPage={() => goToPage(1)}
          onNextPage={goToNextPage}
          onPreviousPage={goToPreviousPage}
          hasNextPage={data.hasNextPage}
          hasPreviousPage={data.hasPreviousPage}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default function AssetList() {
  return (
    <ModuleGate module="asset_management">
      <AssetListContent />
    </ModuleGate>
  );
}
