import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { 
  Send, Clock, CheckCircle2, XCircle, AlertCircle, 
  FileText, History 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { UserLimitIndicator } from "@/components/UserLimitIndicator";
import { useModuleAccess } from "@/hooks/use-module-access";
import { PlanComparisonModal } from "@/components/PlanComparisonModal";
import { usePriceCalculator, formatPrice } from "@/hooks/use-price-calculator";
import { 
  PlanSelector, 
  UserCountSlider, 
  ModuleSelector, 
  PriceBreakdown,
  BillingPeriodToggle 
} from "@/components/subscription";

export default function SubscriptionManagement() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { subscription, isTrialActive, getTrialDaysRemaining } = useModuleAccess();
  
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [tenantNotes, setTenantNotes] = useState("");
  
  const {
    plans,
    modules,
    isLoading,
    selectedPlanId,
    selectedUserCount,
    selectedModuleIds,
    billingPeriod,
    setSelectedPlanId,
    setSelectedUserCount,
    toggleModule,
    setBillingPeriod,
    priceBreakdown,
    isCalculating,
  } = usePriceCalculator(subscription?.planId, subscription?.maxUsers || 5);

  // Fetch pending requests
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['subscription-requests', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from('subscription_requests')
        .select(`
          *,
          requested_plan:plans!subscription_requests_requested_plan_id_fkey(display_name),
          approved_plan:plans!subscription_requests_approved_plan_id_fkey(display_name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Submit request mutation
  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !selectedPlanId || !priceBreakdown) {
        throw new Error('Missing required data');
      }

      // Determine request type
      let requestType: 'new' | 'upgrade' | 'downgrade' | 'modify' = 'new';
      if (subscription?.planId) {
        const currentPlan = plans.find(p => p.id === subscription.planId);
        const newPlan = plans.find(p => p.id === selectedPlanId);
        if (currentPlan && newPlan) {
          if (newPlan.base_price_monthly > currentPlan.base_price_monthly) {
            requestType = 'upgrade';
          } else if (newPlan.base_price_monthly < currentPlan.base_price_monthly) {
            requestType = 'downgrade';
          } else {
            requestType = 'modify';
          }
        }
      }

      const { error } = await supabase
        .from('subscription_requests')
        .insert({
          tenant_id: profile.tenant_id,
          request_type: requestType,
          requested_plan_id: selectedPlanId,
          requested_user_limit: selectedUserCount,
          requested_modules: selectedModuleIds,
          calculated_base_price: priceBreakdown.basePrice,
          calculated_user_price: priceBreakdown.userPrice,
          calculated_module_price: priceBreakdown.modulePrice,
          calculated_total_monthly: priceBreakdown.totalMonthly,
          tenant_notes: tenantNotes || null,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t('subscription.requestSubmitted'),
        description: t('subscription.requestSubmittedDesc'),
      });
      setShowRequestDialog(false);
      setTenantNotes("");
      queryClient.invalidateQueries({ queryKey: ['subscription-requests'] });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const hasPendingRequest = pendingRequests.some(r => r.status === 'pending' || r.status === 'under_review');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'under_review': return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'declined': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'modified': return <FileText className="h-4 w-4 text-purple-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      under_review: 'default',
      approved: 'default',
      declined: 'destructive',
      modified: 'default',
      canceled: 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'}>{t(`subscription.status.${status}`, status)}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('subscription.title')}</h1>
          <p className="text-muted-foreground">{t('subscription.description')}</p>
        </div>
        <PlanComparisonModal />
      </div>

      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t('subscription.currentPlan')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">
                {subscription?.planName || t('subscription.noPlan')}
              </p>
              <p className="text-sm text-muted-foreground">
                {subscription?.subscriptionStatus === 'trialing' 
                  ? t('subscription.trialStatus', { days: getTrialDaysRemaining() })
                  : subscription?.subscriptionStatus === 'active'
                    ? t('subscription.activeStatus')
                    : t('subscription.inactiveStatus')
                }
              </p>
            </div>
            <Badge variant={subscription?.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
              {subscription?.subscriptionStatus || 'inactive'}
            </Badge>
          </div>
          <UserLimitIndicator />
        </CardContent>
      </Card>

      <Tabs defaultValue="configure" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="configure" className="gap-2">
            <FileText className="h-4 w-4" />
            {t('subscription.configurePlan')}
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <History className="h-4 w-4" />
            {t('subscription.myRequests')}
            {hasPendingRequest && (
              <Badge variant="secondary" className="ms-1 h-5 w-5 rounded-full p-0 text-xs">
                !
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Configure Plan Tab */}
        <TabsContent value="configure" className="space-y-6">
          {hasPendingRequest && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardContent className="flex items-center gap-3 py-4">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">{t('subscription.pendingRequestWarning')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('subscription.pendingRequestWarningDesc')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Plan Selection */}
              <PlanSelector
                plans={plans}
                selectedPlanId={selectedPlanId}
                onSelect={setSelectedPlanId}
                isLoading={isLoading}
                currentPlanId={subscription?.planId}
                disabled={hasPendingRequest}
              />

              {/* User Count */}
              <UserCountSlider
                value={selectedUserCount}
                onChange={setSelectedUserCount}
                min={1}
                max={selectedPlan?.max_users || 100}
                includedUsers={selectedPlan?.included_users || 1}
                pricePerUser={selectedPlan?.price_per_user || 0}
                disabled={!selectedPlanId || hasPendingRequest}
              />

              {/* Module Selection */}
              <ModuleSelector
                modules={modules}
                selectedModuleIds={selectedModuleIds}
                onToggle={toggleModule}
                isLoading={isLoading}
                disabled={!selectedPlanId || hasPendingRequest}
              />
            </div>

            {/* Price Breakdown Sidebar */}
            <div className="space-y-4">
              <PriceBreakdown
                breakdown={priceBreakdown}
                isLoading={isCalculating}
                planName={selectedPlan?.display_name}
                className="sticky top-4"
              />

              <Button
                className="w-full"
                size="lg"
                onClick={() => setShowRequestDialog(true)}
                disabled={!selectedPlanId || !priceBreakdown || hasPendingRequest}
              >
                <Send className="h-4 w-4 me-2" />
                {t('subscription.requestPlan')}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* My Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold">{t('subscription.noRequests')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('subscription.noRequestsDesc')}
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <Card key={request.id} className={request.status === 'pending' ? 'border-yellow-500/30' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      <CardTitle className="text-lg">
                        {t(`subscription.requestType.${request.request_type}`, request.request_type)}
                      </CardTitle>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <CardDescription>
                    {new Date(request.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('subscription.requestedPlan')}</p>
                      <p className="font-medium">{request.requested_plan?.display_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('subscription.requestedUsers')}</p>
                      <p className="font-medium">{request.requested_user_limit} {t('subscription.users')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('subscription.requestedModules')}</p>
                      <p className="font-medium">{request.requested_modules?.length || 0} {t('subscription.modulesSelected')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('subscription.estimatedPrice')}</p>
                      <p className="font-medium text-primary">{formatPrice(request.calculated_total_monthly)}/{t('subscription.month')}</p>
                    </div>
                  </div>

                  {request.tenant_notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t('subscription.yourNotes')}</p>
                        <p className="text-sm">{request.tenant_notes}</p>
                      </div>
                    </>
                  )}

                  {request.admin_notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t('subscription.adminNotes')}</p>
                        <p className="text-sm">{request.admin_notes}</p>
                      </div>
                    </>
                  )}

                  {request.status === 'approved' && request.approved_total_monthly && (
                    <>
                      <Separator />
                      <div className="rounded-lg bg-green-500/10 p-3">
                        <p className="text-sm font-medium text-green-600">
                          {t('subscription.approvedPrice')}: {formatPrice(request.approved_total_monthly)}/{t('subscription.month')}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Request Confirmation Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('subscription.confirmRequest')}</DialogTitle>
            <DialogDescription>
              {t('subscription.confirmRequestDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('subscription.plan')}:</span>
                <span className="font-medium">{selectedPlan?.display_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('subscription.users')}:</span>
                <span className="font-medium">{selectedUserCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('subscription.modules')}:</span>
                <span className="font-medium">{selectedModuleIds.length}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="font-medium">{t('subscription.total')}:</span>
                <span className="font-bold text-primary">
                  {priceBreakdown ? formatPrice(priceBreakdown.totalMonthly) : '-'}/{t('subscription.month')}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('subscription.additionalNotes')}</label>
              <Textarea
                placeholder={t('subscription.notesPlaceholder')}
                value={tenantNotes}
                onChange={(e) => setTenantNotes(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-end">{tenantNotes.length}/500</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => submitRequest.mutate()} disabled={submitRequest.isPending}>
              {submitRequest.isPending ? t('common.submitting') : t('subscription.submitRequest')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
