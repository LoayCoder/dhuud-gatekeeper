import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Rocket, Building2, Sparkles } from 'lucide-react';
import { formatPrice, type Plan } from '@/hooks/use-price-calculator';
import { cn } from '@/lib/utils';

const planIcons: Record<string, React.ReactNode> = {
  starter: <Rocket className="h-5 w-5" />,
  pro: <Crown className="h-5 w-5" />,
  enterprise: <Building2 className="h-5 w-5" />,
};

interface PlanSelectorProps {
  plans: Plan[];
  selectedPlanId: string | null;
  onSelect: (planId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  currentPlanId?: string;
}

export function PlanSelector({
  plans,
  selectedPlanId,
  onSelect,
  isLoading,
  disabled,
  className,
  currentPlanId,
}: PlanSelectorProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t('subscription.selectPlan', 'Select a Plan')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {t('subscription.selectPlan', 'Select a Plan')}
        </CardTitle>
        <CardDescription>
          {t('subscription.selectPlanDesc', 'Choose the plan that best fits your organization')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedPlanId || ''}
          onValueChange={onSelect}
          disabled={disabled}
          className="grid gap-4 md:grid-cols-3"
        >
          {plans.map(plan => {
            const isSelected = selectedPlanId === plan.id;
            const isCurrent = currentPlanId === plan.id;
            const icon = planIcons[plan.name] || <Sparkles className="h-5 w-5" />;

            return (
              <label
                key={plan.id}
                htmlFor={plan.id}
                className={cn(
                  "relative flex cursor-pointer flex-col rounded-lg border-2 p-4 transition-all hover:border-primary/50",
                  isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20",
                  !isSelected && "border-muted",
                  disabled && "cursor-not-allowed opacity-60"
                )}
              >
                <RadioGroupItem
                  value={plan.id}
                  id={plan.id}
                  className="sr-only"
                />
                
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "rounded-lg p-2",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{plan.display_name}</h3>
                      {isCurrent && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {t('subscription.currentPlan', 'Current')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-3">
                  <span className="text-2xl font-bold">
                    {formatPrice(plan.base_price_monthly)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{t('subscription.month', 'month')}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>{plan.description}</p>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{plan.included_users}</span>
                    <span>{t('subscription.usersIncluded', 'users included')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{t('subscription.upTo', 'Up to')}</span>
                    <span className="font-medium text-foreground">{plan.max_users}</span>
                    <span>{t('subscription.maxUsers', 'users max')}</span>
                  </div>
                  {plan.price_per_user > 0 && (
                    <div className="text-xs">
                      +{formatPrice(plan.price_per_user)}/{t('subscription.additionalUser', 'additional user')}
                    </div>
                  )}
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute -top-px -end-px">
                    <div className="rounded-bl-lg rounded-tr-lg bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                      {t('subscription.selected', 'Selected')}
                    </div>
                  </div>
                )}
              </label>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
