import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Play, StopCircle, RefreshCcw } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

interface TenantTrialControlProps {
  tenant: Tables<'tenants'>;
}

export function TenantTrialControl({ tenant }: TenantTrialControlProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [trialDays, setTrialDays] = useState('14');
  const [customEndDate, setCustomEndDate] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState(tenant.subscription_status || 'inactive');

  const isTrialing = tenant.subscription_status === 'trialing';
  const trialEndDate = tenant.trial_end_date ? new Date(tenant.trial_end_date) : null;
  const daysRemaining = trialEndDate ? differenceInDays(trialEndDate, new Date()) : 0;

  // Send email notification
  const sendEmailNotification = async (type: string, trialEndDate?: string, daysAdded?: number) => {
    try {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      
      await supabase.functions.invoke('send-subscription-email', {
        body: {
          type,
          tenant_name: tenant.name,
          tenant_email: tenant.contact_email || tenant.billing_email,
          trial_end_date: trialEndDate,
          days_added: daysAdded,
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  };

  // Update trial mutation
  const updateTrialMutation = useMutation({
    mutationFn: async ({ updates, emailType, daysAdded }: { 
      updates: Partial<Tables<'tenants'>>;
      emailType?: 'trial_started' | 'trial_extended' | 'trial_ended';
      daysAdded?: number;
    }) => {
      const { error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenant.id);
      if (error) throw error;
      
      // Send email notification if type is provided and tenant has email
      if (emailType && (tenant.contact_email || tenant.billing_email)) {
        await sendEmailNotification(emailType, updates.trial_end_date || undefined, daysAdded);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tenants-subscriptions'] });
      toast({
        title: t('tenantManagement.trial.updated'),
        description: t('tenantManagement.trial.updatedDesc'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleStartTrial = () => {
    const days = parseInt(trialDays) || 14;
    const startDate = new Date();
    const endDate = addDays(startDate, days);
    
    updateTrialMutation.mutate({
      updates: {
        subscription_status: 'trialing',
        trial_start_date: startDate.toISOString(),
        trial_end_date: endDate.toISOString(),
      },
      emailType: 'trial_started',
    });
  };

  const handleExtendTrial = () => {
    if (!trialEndDate) return;
    const days = parseInt(trialDays) || 7;
    const newEndDate = addDays(trialEndDate, days);
    
    updateTrialMutation.mutate({
      updates: {
        trial_end_date: newEndDate.toISOString(),
      },
      emailType: 'trial_extended',
      daysAdded: days,
    });
  };

  const handleSetCustomEndDate = () => {
    if (!customEndDate) return;
    
    updateTrialMutation.mutate({
      updates: {
        trial_end_date: new Date(customEndDate).toISOString(),
      },
      emailType: 'trial_extended',
    });
  };

  const handleEndTrial = () => {
    updateTrialMutation.mutate({
      updates: {
        subscription_status: 'inactive',
        trial_end_date: new Date().toISOString(),
      },
      emailType: 'trial_ended',
    });
  };

  const handleUpdateStatus = () => {
    updateTrialMutation.mutate({
      updates: {
        subscription_status: subscriptionStatus,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('tenantManagement.trial.currentStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('tenantManagement.trial.status')}</span>
            <Badge variant={isTrialing ? 'default' : tenant.subscription_status === 'active' ? 'secondary' : 'outline'}>
              {tenant.subscription_status || 'inactive'}
            </Badge>
          </div>
          
          {tenant.trial_start_date && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('tenantManagement.trial.startDate')}</span>
              <span>{format(new Date(tenant.trial_start_date), 'PPP')}</span>
            </div>
          )}
          
          {trialEndDate && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('tenantManagement.trial.endDate')}</span>
              <span className={daysRemaining <= 3 ? 'text-destructive font-medium' : ''}>
                {format(trialEndDate, 'PPP')}
              </span>
            </div>
          )}
          
          {isTrialing && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('tenantManagement.trial.daysRemaining')}</span>
              <span className={daysRemaining <= 3 ? 'text-destructive font-medium' : 'text-primary font-medium'}>
                {daysRemaining > 0 ? daysRemaining : 0} {t('tenantManagement.trial.days')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trial Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('tenantManagement.trial.actions')}
          </CardTitle>
          <CardDescription>{t('tenantManagement.trial.actionsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Start/Extend Trial */}
          <div className="space-y-2">
            <Label>{isTrialing ? t('tenantManagement.trial.extendBy') : t('tenantManagement.trial.duration')}</Label>
            <div className="flex gap-2">
              <Select value={trialDays} onValueChange={setTrialDays}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 {t('tenantManagement.trial.days')}</SelectItem>
                  <SelectItem value="14">14 {t('tenantManagement.trial.days')}</SelectItem>
                  <SelectItem value="30">30 {t('tenantManagement.trial.days')}</SelectItem>
                  <SelectItem value="60">60 {t('tenantManagement.trial.days')}</SelectItem>
                  <SelectItem value="90">90 {t('tenantManagement.trial.days')}</SelectItem>
                </SelectContent>
              </Select>
              
              {isTrialing ? (
                <Button onClick={handleExtendTrial} disabled={updateTrialMutation.isPending}>
                  <RefreshCcw className="h-4 w-4 me-2" />
                  {t('tenantManagement.trial.extend')}
                </Button>
              ) : (
                <Button onClick={handleStartTrial} disabled={updateTrialMutation.isPending}>
                  <Play className="h-4 w-4 me-2" />
                  {t('tenantManagement.trial.start')}
                </Button>
              )}
            </div>
          </div>

          {/* Custom End Date */}
          {isTrialing && (
            <div className="space-y-2">
              <Label>{t('tenantManagement.trial.customEndDate')}</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
                <Button 
                  variant="outline" 
                  onClick={handleSetCustomEndDate}
                  disabled={!customEndDate || updateTrialMutation.isPending}
                >
                  {t('tenantManagement.trial.setDate')}
                </Button>
              </div>
            </div>
          )}

          {/* End Trial */}
          {isTrialing && (
            <div className="pt-4 border-t">
              <Button 
                variant="destructive" 
                onClick={handleEndTrial}
                disabled={updateTrialMutation.isPending}
              >
                <StopCircle className="h-4 w-4 me-2" />
                {t('tenantManagement.trial.end')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('tenantManagement.trial.subscriptionStatus')}</CardTitle>
          <CardDescription>{t('tenantManagement.trial.subscriptionStatusDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Select value={subscriptionStatus} onValueChange={setSubscriptionStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inactive">{t('subscription.inactiveStatus')}</SelectItem>
                <SelectItem value="trialing">{t('subscription.trialStatus', { days: '' }).replace(' - ', '')}</SelectItem>
                <SelectItem value="active">{t('subscription.activeStatus')}</SelectItem>
                <SelectItem value="canceled">{t('subscription.canceledStatus')}</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleUpdateStatus}
              disabled={updateTrialMutation.isPending || subscriptionStatus === tenant.subscription_status}
            >
              {t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
