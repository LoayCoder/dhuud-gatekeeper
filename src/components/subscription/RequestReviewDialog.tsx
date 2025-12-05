import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { formatPrice } from '@/hooks/use-price-calculator';
import { formatDate } from '@/lib/date-utils';
import {
  CheckCircle2, XCircle, Edit3, Clock, Building2, Users,
  Package, DollarSign, FileText, MessageSquare
} from 'lucide-react';

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

interface RequestReviewDialogProps {
  request: SubscriptionRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestReviewDialog({ request, open, onOpenChange }: RequestReviewDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [adminNotes, setAdminNotes] = useState('');
  const [modifiedUserLimit, setModifiedUserLimit] = useState<number>(0);
  const [modifiedPlanId, setModifiedPlanId] = useState<string>('');
  const [modifiedTotal, setModifiedTotal] = useState<number>(0);

  // Fetch plans for modification
  const { data: plans = [] } = useQuery({
    queryKey: ['plans-for-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('id, display_name, base_price_monthly')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch modules for display
  const { data: modules = [] } = useQuery({
    queryKey: ['modules-for-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('id, name, code')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (request) {
      setAdminNotes(request.admin_notes || '');
      setModifiedUserLimit(request.requested_user_limit);
      setModifiedPlanId(request.requested_plan_id || '');
      setModifiedTotal(request.calculated_total_monthly);
    }
  }, [request]);

  const updateRequest = useMutation({
    mutationFn: async ({ status, withModifications }: { status: string; withModifications?: boolean }) => {
      if (!request) return;

      const updateData: Record<string, unknown> = {
        status,
        admin_notes: adminNotes || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };

      if (withModifications) {
        updateData.approved_plan_id = modifiedPlanId;
        updateData.approved_user_limit = modifiedUserLimit;
        updateData.approved_total_monthly = modifiedTotal;
        updateData.status = 'modified';
      }

      const { error } = await supabase
        .from('subscription_requests')
        .update(updateData)
        .eq('id', request.id);

      if (error) throw error;

      // If approved or modified, update the tenant's subscription
      if (status === 'approved' || withModifications) {
        const planId = withModifications ? modifiedPlanId : request.requested_plan_id;
        const userLimit = withModifications ? modifiedUserLimit : request.requested_user_limit;

        const { error: tenantError } = await supabase
          .from('tenants')
          .update({
            plan_id: planId,
            max_users_override: userLimit,
            subscription_status: 'active',
          })
          .eq('id', request.tenant_id);

        if (tenantError) throw tenantError;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: t('adminSubscription.requestUpdated'),
        description: t(`adminSubscription.status${variables.status.charAt(0).toUpperCase() + variables.status.slice(1)}`),
      });
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tenants-subscriptions'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (!request) return null;

  const isReviewable = request.status === 'pending' || request.status === 'under_review';
  const requestedModuleNames = request.requested_modules
    ?.map(id => modules.find(m => m.id === id)?.name)
    .filter(Boolean) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader className="text-start">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('adminSubscription.reviewRequest')}
          </DialogTitle>
          <DialogDescription>
            {t(`subscription.requestType.${request.request_type}`)} - {request.tenant?.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4" dir={direction}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">{t('adminSubscription.requestDetails')}</TabsTrigger>
            {isReviewable && (
              <TabsTrigger value="modify">{t('adminSubscription.modifyApprove')}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Request Info */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div className="text-start">
                      <p className="text-sm text-muted-foreground">{t('adminSubscription.tenant')}</p>
                      <p className="font-medium">{request.tenant?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div className="text-start">
                      <p className="text-sm text-muted-foreground">{t('adminSubscription.submitted')}</p>
                      <p className="font-medium">{formatDate(request.created_at, 'PPp')}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div className="text-start">
                      <p className="text-sm text-muted-foreground">{t('subscription.requestedPlan')}</p>
                      <p className="font-medium">{request.requested_plan?.display_name || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div className="text-start">
                      <p className="text-sm text-muted-foreground">{t('subscription.requestedUsers')}</p>
                      <p className="font-medium">{request.requested_user_limit} {t('subscription.users')}</p>
                    </div>
                  </div>
                </div>

                {requestedModuleNames.length > 0 && (
                  <>
                    <Separator />
                    <div className="text-start">
                      <p className="text-sm text-muted-foreground mb-2">{t('subscription.requestedModules')}</p>
                      <div className="flex flex-wrap gap-2">
                        {requestedModuleNames.map((name, i) => (
                          <Badge key={i} variant="secondary">{name}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Price Breakdown */}
                <div className="text-start">
                  <p className="text-sm text-muted-foreground mb-2">{t('subscription.priceBreakdown')}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>{t('subscription.basePlan')}</span>
                      <span>{formatPrice(request.calculated_base_price)}</span>
                    </div>
                    {request.calculated_user_price > 0 && (
                      <div className="flex justify-between">
                        <span>{t('subscription.additionalUsers')}</span>
                        <span>{formatPrice(request.calculated_user_price)}</span>
                      </div>
                    )}
                    {request.calculated_module_price > 0 && (
                      <div className="flex justify-between">
                        <span>{t('subscription.additionalModules')}</span>
                        <span>{formatPrice(request.calculated_module_price)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>{t('subscription.totalMonthly')}</span>
                      <span className="text-primary">{formatPrice(request.calculated_total_monthly)}</span>
                    </div>
                  </div>
                </div>

                {request.tenant_notes && (
                  <>
                    <Separator />
                    <div className="text-start">
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {t('subscription.yourNotes')}
                      </p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{request.tenant_notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Admin Response */}
            {isReviewable && (
              <div className="space-y-2 text-start">
                <Label>{t('adminSubscription.adminResponse')}</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t('adminSubscription.adminNotesPlaceholder')}
                  rows={3}
                />
              </div>
            )}

            {request.admin_notes && !isReviewable && (
              <div className="text-start">
                <p className="text-sm text-muted-foreground mb-1">{t('subscription.adminNotes')}</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{request.admin_notes}</p>
              </div>
            )}
          </TabsContent>

          {isReviewable && (
            <TabsContent value="modify" className="space-y-4 mt-4">
              <Card>
                <CardContent className="pt-4 space-y-4 text-start">
                  <p className="text-sm text-muted-foreground">
                    {t('adminSubscription.modifyDescription')}
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('subscription.plan')}</Label>
                      <Select value={modifiedPlanId} onValueChange={setModifiedPlanId} dir={direction}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('subscription.selectPlan')} />
                        </SelectTrigger>
                        <SelectContent dir={direction}>
                          {plans.map(plan => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.display_name} - {formatPrice(plan.base_price_monthly)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('subscription.numberOfUsers')}</Label>
                      <Input
                        type="number"
                        value={modifiedUserLimit}
                        onChange={(e) => setModifiedUserLimit(parseInt(e.target.value) || 1)}
                        min={1}
                        max={1000}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('adminSubscription.approvedPrice')}</Label>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          value={modifiedTotal / 100}
                          onChange={(e) => setModifiedTotal(parseFloat(e.target.value) * 100 || 0)}
                          step="0.01"
                          min={0}
                        />
                        <span className="text-sm text-muted-foreground">/{t('subscription.month')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2 text-start">
                <Label>{t('adminSubscription.adminResponse')}</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t('adminSubscription.modifyNotesPlaceholder')}
                  rows={3}
                />
              </div>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          {isReviewable ? (
            <>
              <Button
                variant="destructive"
                onClick={() => updateRequest.mutate({ status: 'declined' })}
                disabled={updateRequest.isPending}
              >
                <XCircle className="h-4 w-4 me-1" />
                {t('adminSubscription.decline')}
              </Button>
              <Button
                variant="outline"
                onClick={() => updateRequest.mutate({ status: 'approved', withModifications: true })}
                disabled={updateRequest.isPending}
              >
                <Edit3 className="h-4 w-4 me-1" />
                {t('adminSubscription.approveWithChanges')}
              </Button>
              <Button
                onClick={() => updateRequest.mutate({ status: 'approved' })}
                disabled={updateRequest.isPending}
              >
                <CheckCircle2 className="h-4 w-4 me-1" />
                {t('adminSubscription.approve')}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
