import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Award, TrendingUp, Users } from 'lucide-react';
import { useBadgeStatistics } from '@/hooks/use-badge-admin';

export function BadgeStatisticsTab() {
  const { t, i18n } = useTranslation();
  const { data: stats, isLoading } = useBadgeStatistics();
  const isRTL = i18n.language === 'ar';

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalAwarded = stats?.reduce((sum, s) => sum + Number(s.total_awarded), 0) || 0;
  const thisMonthAwarded = stats?.reduce((sum, s) => sum + Number(s.awarded_this_month), 0) || 0;
  const uniqueEarners = stats?.reduce((sum, s) => sum + Number(s.unique_earners), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.badges.totalAwarded', 'Total Badges Awarded')}
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAwarded}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.badges.thisMonth', 'Awarded This Month')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthAwarded}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.badges.uniqueEarners', 'Unique Badge Earners')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueEarners}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('admin.badges.badgeBreakdown', 'Badge Breakdown')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.map((badge) => (
              <div key={badge.badge_id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {isRTL && badge.name_ar ? badge.name_ar : badge.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {badge.tier} • {badge.category}
                  </p>
                </div>
                <div className="text-end">
                  <p className="font-bold">{badge.total_awarded}</p>
                  <p className="text-xs text-muted-foreground">
                    +{badge.awarded_this_month} this month
                  </p>
                </div>
              </div>
            ))}
            {(!stats || stats.length === 0) && (
              <p className="text-center py-8 text-muted-foreground">
                {t('admin.badges.noStats', 'No badge statistics available')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
