import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays } from 'date-fns';
import { ModuleGate } from '@/components/ModuleGate';
import {
  useAssetsWithActiveWarranty,
  useAssetsWithExpiringWarranty,
  useAssetsWithExpiredWarranty,
} from '@/hooks/use-warranty-claims';
import { WarrantyExpiryBadge } from '@/components/assets/warranty';
import { cn } from '@/lib/utils';

function AssetWarrantiesContent() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === 'ar';
  const [searchQuery, setSearchQuery] = useState('');

  const { data: activeAssets, isLoading: loadingActive } = useAssetsWithActiveWarranty();
  const { data: expiringAssets, isLoading: loadingExpiring } = useAssetsWithExpiringWarranty(60);
  const { data: expiredAssets, isLoading: loadingExpired } = useAssetsWithExpiredWarranty();

  const isLoading = loadingActive || loadingExpiring || loadingExpired;

  const filterAssets = (assets: Array<{ id: string; name: string; asset_code: string; warranty_expiry_date: string | null; warranty_provider: string | null }> | undefined) => {
    if (!assets || !searchQuery) return assets;
    const query = searchQuery.toLowerCase();
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.asset_code.toLowerCase().includes(query) ||
        a.warranty_provider?.toLowerCase().includes(query)
    );
  };

  const renderAssetList = (assets: Array<{ id: string; name: string; asset_code: string; warranty_expiry_date: string | null; warranty_provider: string | null }> | undefined, emptyMessage: string) => {
    const filtered = filterAssets(assets);

    if (!filtered?.length) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Shield className="h-12 w-12 mb-4 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filtered.map((asset) => {
          const daysUntilExpiry = asset.warranty_expiry_date
            ? differenceInDays(new Date(asset.warranty_expiry_date), new Date())
            : null;

          return (
            <div
              key={asset.id}
              className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 cursor-pointer transition-colors"
              onClick={() => navigate(`/assets/${asset.id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{asset.name}</span>
                  <WarrantyExpiryBadge expiryDate={asset.warranty_expiry_date} />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span>{asset.asset_code}</span>
                  {asset.warranty_provider && (
                    <>
                      <span>•</span>
                      <span>{asset.warranty_provider}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-end shrink-0 ms-4">
                {asset.warranty_expiry_date && (
                  <>
                    <p className={cn(
                      'text-sm font-medium',
                      daysUntilExpiry !== null && daysUntilExpiry < 0 && 'text-red-600 dark:text-red-400',
                      daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30 && 'text-yellow-600 dark:text-yellow-400'
                    )}>
                      {format(new Date(asset.warranty_expiry_date), 'MMM d, yyyy')}
                    </p>
                    {daysUntilExpiry !== null && (
                      <p className="text-xs text-muted-foreground">
                        {daysUntilExpiry < 0
                          ? t('assets.warranty.expiredDaysAgo', { days: Math.abs(daysUntilExpiry) })
                          : t('assets.warranty.daysLeft', { count: daysUntilExpiry })}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('assets.warranty.pageTitle')}</h1>
          <p className="text-muted-foreground">{t('assets.warranty.pageDescription')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('assets.warranty.activeWarranties')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{activeAssets?.length || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('assets.warranty.expiringSoon')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {expiringAssets?.length || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t('assets.warranty.within60Days')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('assets.warranty.expiredTitle')}</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {expiredAssets?.length || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('assets.warranty.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="expiring" dir={i18n.dir()}>
        <TabsList>
          <TabsTrigger value="expiring" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t('assets.warranty.expiringSoon')}
            {expiringAssets?.length ? (
              <Badge variant="secondary" className="ms-1">{expiringAssets.length}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            {t('assets.warranty.active')}
          </TabsTrigger>
          <TabsTrigger value="expired" className="gap-2">
            <XCircle className="h-4 w-4" />
            {t('assets.warranty.expired')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expiring" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('assets.warranty.expiringSoonTitle')}</CardTitle>
              <CardDescription>{t('assets.warranty.expiringSoonDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingExpiring ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                renderAssetList(expiringAssets, t('assets.warranty.noExpiringWarranties'))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('assets.warranty.activeWarrantiesTitle')}</CardTitle>
              <CardDescription>{t('assets.warranty.activeWarrantiesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActive ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                renderAssetList(activeAssets, t('assets.warranty.noActiveWarranties'))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expired" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('assets.warranty.expiredWarrantiesTitle')}</CardTitle>
              <CardDescription>{t('assets.warranty.expiredWarrantiesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingExpired ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                renderAssetList(expiredAssets, t('assets.warranty.noExpiredWarranties'))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AssetWarranties() {
  return (
    <ModuleGate module="asset_management">
      <AssetWarrantiesContent />
    </ModuleGate>
  );
}
