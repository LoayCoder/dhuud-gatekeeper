import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TenantBillingTable } from '@/components/billing/TenantBillingTable';
import { useAllTenantsUsage } from '@/hooks/use-profile-usage';
import { useAllTenantsBilling, useGenerateBillingRecord } from '@/hooks/use-profile-billing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Receipt, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  DollarSign,
  Building2
} from 'lucide-react';
import { formatSAR } from '@/lib/pricing-engine';
import { toast } from 'sonner';

const RTL_LANGUAGES = ['ar', 'ur'];

export default function BillingOverview() {
  const { t, i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);
  const { tenantsUsage, isLoading: usageLoading, refetch: refetchUsage } = useAllTenantsUsage();
  const { allBilling, isLoading: billingLoading, refetch: refetchBilling } = useAllTenantsBilling();
  const generateBilling = useGenerateBillingRecord();
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  // Calculate summary stats
  const totalProfiles = tenantsUsage?.reduce((acc, t) => acc + (t.usage?.total_profiles || 0), 0) || 0;
  const totalCharges = allBilling?.reduce((acc, t) => acc + (t.currentBilling?.profile_charges || 0), 0) || 0;
  const tenantsOverQuota = tenantsUsage?.filter((t) => {
    const usage = t.usage;
    if (!usage) return false;
    return usage.total_profiles > usage.free_quota;
  }).length || 0;

  const handleExport = () => {
    const data = allBilling?.map((t) => ({
      tenant: t.name,
      plan: t.plans?.name || 'starter',
      currentProfiles: t.currentBilling?.total_profiles || 0,
      currentCharges: t.currentBilling?.profile_charges || 0,
      lastProfiles: t.lastBilling?.total_profiles || 0,
      lastCharges: t.lastBilling?.profile_charges || 0,
      status: t.currentBilling?.status || 'pending',
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billing-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('profileBilling.exported'));
  };

  const handleGenerateAllBilling = async () => {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    for (const tenant of tenantsUsage || []) {
      await generateBilling.mutateAsync({ tenantId: tenant.id, billingMonth: currentMonth });
    }
    refetchBilling();
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold">{t('adminBilling.title')}</h1>
          <p className="text-muted-foreground">{t('adminBilling.description')}</p>
        </div>
        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button variant="outline" onClick={() => { refetchUsage(); refetchBilling(); }}>
            <RefreshCw className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
            {t('common.refresh')}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-2xl font-bold">{tenantsUsage?.length || 0}</p>
                <p className="text-xs text-muted-foreground">{t('adminBilling.totalTenants')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Users className="h-8 w-8 text-muted-foreground" />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-2xl font-bold">{totalProfiles}</p>
                <p className="text-xs text-muted-foreground">{t('adminBilling.totalProfiles')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-2xl font-bold">{formatSAR(totalCharges)}</p>
                <p className="text-xs text-muted-foreground">{t('adminBilling.totalCharges')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <TrendingUp className="h-8 w-8 text-warning" />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-2xl font-bold">{tenantsOverQuota}</p>
                <p className="text-xs text-muted-foreground">{t('adminBilling.overQuota')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Usage vs Billing */}
      <Tabs defaultValue="billing" className="space-y-4">
        <TabsList className={isRTL ? 'flex-row-reverse' : ''}>
          <TabsTrigger value="billing">{t('adminBilling.billingRecords')}</TabsTrigger>
          <TabsTrigger value="usage">{t('adminBilling.currentUsage')}</TabsTrigger>
        </TabsList>

        <TabsContent value="billing">
          <Card>
            <CardHeader className={`flex flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle>{t('adminBilling.billingRecords')}</CardTitle>
                <CardDescription>{t('adminBilling.billingRecordsDesc')}</CardDescription>
              </div>
              <Button 
                onClick={handleGenerateAllBilling} 
                disabled={generateBilling.isPending}
              >
                <Receipt className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                {t('adminBilling.generateBilling')}
              </Button>
            </CardHeader>
            <CardContent>
              <TenantBillingTable
                tenants={allBilling}
                isLoading={billingLoading}
                onViewDetails={(id) => {
                  const tenant = allBilling?.find((t) => t.id === id);
                  setSelectedTenant(tenant);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
              <CardTitle>{t('adminBilling.currentUsage')}</CardTitle>
              <CardDescription>{t('adminBilling.currentUsageDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {tenantsUsage?.map((tenant) => (
                    <div 
                      key={tenant.id} 
                      className={`flex items-center justify-between p-4 border rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {tenant.plans?.name || 'Starter'}
                        </p>
                      </div>
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-start' : 'text-end'}>
                          <p className="text-sm">
                            {tenant.usage?.total_profiles || 0} / {tenant.usage?.free_quota || 50}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('profileBilling.profiles')}
                          </p>
                        </div>
                        {tenant.usage && tenant.usage.total_profiles > tenant.usage.free_quota && (
                          <Badge variant="destructive">
                            {t('adminBilling.overQuota')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tenant Details Dialog */}
      <Dialog open={!!selectedTenant} onOpenChange={() => setSelectedTenant(null)}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
            <DialogTitle>{selectedTenant?.name}</DialogTitle>
            <DialogDescription>
              {t('adminBilling.tenantDetails')}
            </DialogDescription>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 border rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="text-sm text-muted-foreground">{t('profileBilling.thisMonth')}</p>
                  <p className="text-2xl font-bold">
                    {selectedTenant.currentBilling?.total_profiles || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatSAR(selectedTenant.currentBilling?.profile_charges || 0)}
                  </p>
                </div>
                <div className={`p-4 border rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="text-sm text-muted-foreground">{t('profileBilling.lastMonth')}</p>
                  <p className="text-2xl font-bold">
                    {selectedTenant.lastBilling?.total_profiles || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatSAR(selectedTenant.lastBilling?.profile_charges || 0)}
                  </p>
                </div>
              </div>
              <div className={`p-4 border rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-sm text-muted-foreground mb-2">{t('subscription.plan')}</p>
                <Badge>{selectedTenant.plans?.display_name || 'Starter'}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}