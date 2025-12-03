import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Building2, Users, CreditCard, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { PlanComparisonModal } from "@/components/PlanComparisonModal";

export default function SubscriptionOverview() {
  const { t } = useTranslation();

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['admin-tenants-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id,
          name,
          subscription_status,
          trial_start_date,
          trial_end_date,
          max_users_override,
          plan_id,
          plans (
            name,
            display_name,
            max_users,
            price_monthly
          )
        `)
        .order('name');
      
      if (error) throw error;

      // Get user counts for each tenant
      const tenantsWithCounts = await Promise.all(
        data.map(async (tenant) => {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          const plan = tenant.plans as { name: string; display_name: string; max_users: number; price_monthly: number } | null;
          const maxUsers = tenant.max_users_override || plan?.max_users || 5;
          
          return {
            ...tenant,
            userCount: count || 0,
            maxUsers,
            planName: plan?.display_name || t('subscription.noPlan'),
            planPrice: plan?.price_monthly || 0,
          };
        })
      );

      return tenantsWithCounts;
    },
  });

  // Calculate stats
  const stats = {
    totalTenants: tenants.length,
    activeSubs: tenants.filter(t => t.subscription_status === 'active').length,
    trialingSubs: tenants.filter(t => t.subscription_status === 'trialing').length,
    totalMRR: tenants.reduce((sum, t) => sum + (t.subscription_status === 'active' ? t.planPrice : 0), 0),
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{t('subscription.activeStatus')}</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">{t('subscription.trialStatus', { days: '' }).replace(' - ', '')}</Badge>;
      case 'canceled':
        return <Badge variant="destructive">{t('subscription.canceledStatus')}</Badge>;
      default:
        return <Badge variant="secondary">{t('subscription.inactiveStatus')}</Badge>;
    }
  };

  const getTrialDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('subscriptionOverview.title')}</h1>
          <p className="text-muted-foreground">{t('subscriptionOverview.description')}</p>
        </div>
        <PlanComparisonModal />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('subscriptionOverview.totalTenants')}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('subscriptionOverview.activeSubscriptions')}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('subscriptionOverview.inTrial')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trialingSubs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('subscriptionOverview.monthlyRevenue')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalMRR}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('subscriptionOverview.allTenants')}</CardTitle>
          <CardDescription>{t('subscriptionOverview.allTenantsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tenantManagement.name')}</TableHead>
                <TableHead>{t('subscription.currentPlan')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('subscriptionOverview.userUsage')}</TableHead>
                <TableHead>{t('subscriptionOverview.trialEnds')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t('subscriptionOverview.noTenants')}
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => {
                  const usagePercent = (tenant.userCount / tenant.maxUsers) * 100;
                  const trialDays = getTrialDaysRemaining(tenant.trial_end_date);
                  
                  return (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tenant.planName}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(tenant.subscription_status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex justify-between text-xs">
                            <span>{tenant.userCount}/{tenant.maxUsers}</span>
                            {usagePercent >= 90 && (
                              <AlertTriangle className="h-3 w-3 text-destructive" />
                            )}
                          </div>
                          <Progress 
                            value={usagePercent} 
                            className={`h-1.5 ${usagePercent >= 90 ? '[&>div]:bg-destructive' : ''}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {tenant.subscription_status === 'trialing' && tenant.trial_end_date ? (
                          <div className="text-sm">
                            <span className={trialDays && trialDays <= 3 ? 'text-destructive font-medium' : ''}>
                              {trialDays} {t('subscriptionOverview.daysLeft')}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(tenant.trial_end_date), 'MMM d, yyyy')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
