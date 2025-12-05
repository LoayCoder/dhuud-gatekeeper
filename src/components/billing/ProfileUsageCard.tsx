import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Users, UserCheck, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProfileUsage } from '@/hooks/use-profile-usage';
import { useCurrencyFormatter } from '@/hooks/use-tenant-currency';

interface ProfileUsageCardProps {
  usage: ProfileUsage | null;
  isLoading?: boolean;
  showUpgradeCta?: boolean;
}

export function ProfileUsageCard({ usage, isLoading, showUpgradeCta = true }: ProfileUsageCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatAmount } = useCurrencyFormatter();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('profileBilling.usageTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-8 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const usagePercentage = Math.round((usage.total_profiles / usage.free_quota) * 100);
  const isNearQuota = usagePercentage >= 80;
  const isOverQuota = usagePercentage >= 100;

  return (
    <Card className={isOverQuota ? 'border-destructive' : isNearQuota ? 'border-warning' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('profileBilling.usageTitle')}
            </CardTitle>
            <CardDescription>{t('profileBilling.currentMonth')}</CardDescription>
          </div>
          <Badge variant={isOverQuota ? 'destructive' : isNearQuota ? 'secondary' : 'default'}>
            {usage.plan_name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Usage Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{t('profileBilling.totalProfiles')}</span>
            <span className={isOverQuota ? 'text-destructive font-medium' : ''}>
              {usage.total_profiles} / {usage.free_quota}
            </span>
          </div>
          <Progress 
            value={Math.min(usagePercentage, 100)} 
            className={`h-3 ${isOverQuota ? '[&>div]:bg-destructive' : isNearQuota ? '[&>div]:bg-warning' : ''}`}
          />
          {isNearQuota && (
            <p className="text-xs text-warning flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {isOverQuota 
                ? t('profileBilling.quotaExceeded')
                : t('profileBilling.nearQuota', { percentage: usagePercentage })
              }
            </p>
          )}
        </div>

        {/* Breakdown by Type */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{usage.visitor_count}</p>
            <p className="text-xs text-muted-foreground">{t('profileBilling.visitors')}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <UserCheck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{usage.member_count}</p>
            <p className="text-xs text-muted-foreground">{t('profileBilling.members')}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Briefcase className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{usage.contractor_count}</p>
            <p className="text-xs text-muted-foreground">{t('profileBilling.contractors')}</p>
          </div>
        </div>

        {/* Billing Summary */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('profileBilling.freeQuota')}</span>
            <span>{usage.free_quota}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{t('profileBilling.billableProfiles')}</span>
            <span>{usage.billable_profiles}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{t('profileBilling.ratePerProfile')}</span>
            <span>{formatAmount(usage.rate_per_profile * 100)}</span>
          </div>
          <div className="flex justify-between font-medium pt-2 border-t">
            <span>{t('profileBilling.estimatedCharge')}</span>
            <span className={usage.profile_charges > 0 ? 'text-primary' : ''}>
              {formatAmount(usage.profile_charges * 100)}
            </span>
          </div>
        </div>

        {/* Upgrade CTA */}
        {showUpgradeCta && isNearQuota && (
          <Button 
            onClick={() => navigate('/settings/subscription')}
            className="w-full"
            variant={isOverQuota ? 'destructive' : 'default'}
          >
            {t('profileBilling.upgradePlan')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
