import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, CreditCard, TrendingUp, Clock, AlertTriangle, FileText, Inbox } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { PlanComparisonModal } from "@/components/PlanComparisonModal";
import { SubscriptionAuditLog } from "@/components/SubscriptionAuditLog";
import { SubscriptionRequestsTable } from "@/components/subscription/SubscriptionRequestsTable";
import { RequestReviewDialog } from "@/components/subscription/RequestReviewDialog";

interface SubscriptionRequest {
  id: string;
  tenant_id: string;
  request_type: string;
  requested_plan_id: string | null;
  requested_user_limit: number;
  requested_modules: string[] | null;
  calculated_base_price: number;
  calculated_user_price: number;
  calculated_module_price: number;
  calculated_total_monthly: number;
  status: string;
  tenant_notes: string | null;
  admin_notes: string | null;
  approved_plan_id: string | null;
  approved_user_limit: number | null;
  approved_modules: string[] | null;
  approved_total_monthly: number | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  tenant: { name: string } | null;
  requested_plan: { display_name: string } | null;
}

const RTL_LANGUAGES = ['ar', 'ur'];

export default function SubscriptionOverview() {
  const { t, i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);
  const direction = isRTL ? 'rtl' : 'ltr';
  const [selectedRequest, setSelectedRequest] = useState<SubscriptionRequest | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch pending requests count for badge
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-requests-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('subscription_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'under_review']);
      if (error) throw error;
      return count || 0;
    },
  });

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

  const handleReviewRequest = (request: SubscriptionRequest) => {
    setSelectedRequest(request);
    setReviewDialogOpen(true);
  };

  return (
    <div className="space-y-6" dir={direction}>
      <div className="flex items-center justify-between">
        <div className="text-start">
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
          <CardContent className="text-start">
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('subscriptionOverview.activeSubscriptions')}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-2xl font-bold">{stats.activeSubs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('subscriptionOverview.inTrial')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-2xl font-bold">{stats.trialingSubs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('subscriptionOverview.monthlyRevenue')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-2xl font-bold">${stats.totalMRR}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="justify-start">
          <TabsTrigger value="requests" className="gap-2">
            <Inbox className="h-4 w-4" />
            {t('adminSubscription.requests')}
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ms-1 h-5 min-w-5 rounded-full p-0 text-xs flex items-center justify-center">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tenants" className="gap-2">
            <Building2 className="h-4 w-4" />
            {t('subscriptionOverview.allTenants')}
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <FileText className="h-4 w-4" />
            {t('adminSubscription.activity')}
          </TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter} dir={direction}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('adminSubscription.filterByStatus')} />
              </SelectTrigger>
              <SelectContent dir={direction}>
                <SelectItem value="all">{t('adminSubscription.allRequests')}</SelectItem>
                <SelectItem value="pending">{t('subscription.status.pending')}</SelectItem>
                <SelectItem value="under_review">{t('subscription.status.under_review')}</SelectItem>
                <SelectItem value="approved">{t('subscription.status.approved')}</SelectItem>
                <SelectItem value="declined">{t('subscription.status.declined')}</SelectItem>
                <SelectItem value="modified">{t('subscription.status.modified')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SubscriptionRequestsTable 
            onReviewRequest={handleReviewRequest}
            statusFilter={statusFilter}
          />
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants">
          <Card>
            <CardHeader className="text-start">
              <CardTitle>{t('subscriptionOverview.allTenants')}</CardTitle>
              <CardDescription>{t('subscriptionOverview.allTenantsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t('tenantManagement.columns.name')}</TableHead>
                    <TableHead className="text-start">{t('subscription.currentPlan')}</TableHead>
                    <TableHead className="text-start">{t('common.status')}</TableHead>
                    <TableHead className="text-start">{t('subscriptionOverview.userUsage')}</TableHead>
                    <TableHead className="text-start">{t('subscriptionOverview.trialEnds')}</TableHead>
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
                          <TableCell className="font-medium text-start">{tenant.name}</TableCell>
                          <TableCell className="text-start">
                            <Badge variant="outline">{tenant.planName}</Badge>
                          </TableCell>
                          <TableCell className="text-start">{getStatusBadge(tenant.subscription_status)}</TableCell>
                          <TableCell className="text-start">
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
                          <TableCell className="text-start">
                            {tenant.subscription_status === 'trialing' && tenant.trial_end_date ? (
                              <div className="text-sm">
                                <span className={trialDays && trialDays <= 3 ? 'text-destructive font-medium' : ''}>
                                  {trialDays} {t('subscriptionOverview.daysLeft')}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(tenant.trial_end_date)}
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
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <SubscriptionAuditLog />
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <RequestReviewDialog
        request={selectedRequest}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
      />
    </div>
  );
}
