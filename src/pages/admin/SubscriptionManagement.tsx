import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { UserLimitIndicator } from "@/components/UserLimitIndicator";
import { useModuleAccess } from "@/hooks/use-module-access";
import { PlanComparisonModal } from "@/components/PlanComparisonModal";

export default function SubscriptionManagement() {
  const { t } = useTranslation();
  const { subscription, isTrialActive, getTrialDaysRemaining } = useModuleAccess();

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data;
    },
  });

  const getPlanIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'starter': return <Zap className="h-6 w-6" />;
      case 'pro': return <Sparkles className="h-6 w-6" />;
      case 'enterprise': return <Crown className="h-6 w-6" />;
      default: return <Zap className="h-6 w-6" />;
    }
  };

  const getFeatures = (plan: typeof plans[0]) => {
    const features = plan.features as string[] | null;
    return features || [];
  };

  return (
    <div className="space-y-6">
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

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('subscription.availablePlans')}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${subscription?.planId === plan.id ? 'border-primary ring-2 ring-primary' : ''}`}
            >
              {subscription?.planId === plan.id && (
                <Badge className="absolute -top-3 start-4">
                  {t('subscription.currentPlanBadge')}
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  {getPlanIcon(plan.name)}
                  <CardTitle>{plan.display_name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">
                    ${plan.price_monthly}
                    <span className="text-sm font-normal text-muted-foreground">/{t('subscription.perMonth')}</span>
                  </p>
                  {plan.price_yearly && (
                    <p className="text-sm text-muted-foreground">
                      ${plan.price_yearly}/{t('subscription.perYear')} ({t('subscription.savePercent', { percent: Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100) })})
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('subscription.includes')}:</p>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {t('subscription.upToUsers', { count: plan.max_users })}
                    </li>
                    {getFeatures(plan).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button 
                  className="w-full" 
                  variant={subscription?.planId === plan.id ? 'outline' : 'default'}
                  disabled={subscription?.planId === plan.id}
                >
                  {subscription?.planId === plan.id 
                    ? t('subscription.currentPlanButton')
                    : t('subscription.upgradeTo', { plan: plan.display_name })
                  }
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Billing Info Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>{t('subscription.billingInfo')}</CardTitle>
          <CardDescription>{t('subscription.billingDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              {t('subscription.stripeComingSoon')}
            </p>
            <Badge variant="outline">{t('common.comingSoon')}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
