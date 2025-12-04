import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Users, UserCog, Briefcase, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LicensedUserQuota, UserTypeBreakdown } from '@/hooks/use-licensed-user-quota';
import { cn } from '@/lib/utils';

const RTL_LANGUAGES = ['ar', 'ur'];

interface LicensedUserQuotaCardProps {
  quota: LicensedUserQuota | null;
  breakdown?: UserTypeBreakdown | null;
  isLoading?: boolean;
  showUpgradeCta?: boolean;
}

export function LicensedUserQuotaCard({ 
  quota, 
  breakdown, 
  isLoading, 
  showUpgradeCta = true 
}: LicensedUserQuotaCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);

  if (isLoading) {
    return (
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader>
          <CardTitle className={cn(
            "flex items-center gap-2",
            isRTL && "flex-row-reverse"
          )}>
            <UserCog className="h-5 w-5" />
            {t('userManagement.licensedUsers')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quota) return null;

  const usagePercentage = Math.round((quota.current_licensed_users / quota.max_licensed_users) * 100);
  const isNearQuota = usagePercentage >= 80;
  const isAtQuota = !quota.can_add_user;

  return (
    <Card 
      className={isAtQuota ? 'border-destructive' : isNearQuota ? 'border-warning' : ''}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <CardHeader>
        <div className={cn(
          "flex items-center justify-between",
          isRTL && "flex-row-reverse"
        )}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle className={cn(
              "flex items-center gap-2",
              isRTL && "flex-row-reverse"
            )}>
              <UserCog className="h-5 w-5" />
              {t('userManagement.licensedUsers')}
            </CardTitle>
            <CardDescription>{t('userManagement.usersWithLogin')}</CardDescription>
          </div>
          <Badge variant={isAtQuota ? 'destructive' : isNearQuota ? 'secondary' : 'outline'}>
            {quota.remaining_slots} {t('userManagement.slotsRemaining')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usage Progress */}
        <div className="space-y-2">
          <div className={cn(
            "flex items-center justify-between text-sm",
            isRTL && "flex-row-reverse"
          )}>
            <span>{t('userManagement.activeUsers')}</span>
            <span className={isAtQuota ? 'text-destructive font-medium' : ''}>
              {quota.current_licensed_users} / {quota.max_licensed_users}
            </span>
          </div>
          <Progress 
            value={Math.min(usagePercentage, 100)} 
            className={`h-3 ${isAtQuota ? '[&>div]:bg-destructive' : isNearQuota ? '[&>div]:bg-warning' : ''}`}
          />
          {isAtQuota && (
            <p className={cn(
              "text-xs text-destructive flex items-center gap-1",
              isRTL && "flex-row-reverse"
            )}>
              <AlertTriangle className="h-3 w-3" />
              {t('userManagement.quotaReached')}
            </p>
          )}
        </div>

        {/* Breakdown by Type */}
        {breakdown && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{breakdown.employees}</p>
              <p className="text-xs text-muted-foreground">{t('userTypes.employees')}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Briefcase className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{breakdown.contractors_longterm}</p>
              <p className="text-xs text-muted-foreground">{t('userTypes.contractorsLT')}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <UserCheck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{breakdown.members_with_login}</p>
              <p className="text-xs text-muted-foreground">{t('userTypes.membersWithLogin')}</p>
            </div>
          </div>
        )}

        {/* Upgrade CTA */}
        {showUpgradeCta && isNearQuota && (
          <Button 
            onClick={() => navigate('/settings/subscription')}
            className="w-full"
            variant={isAtQuota ? 'destructive' : 'default'}
          >
            {t('userManagement.upgradeForMore')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
