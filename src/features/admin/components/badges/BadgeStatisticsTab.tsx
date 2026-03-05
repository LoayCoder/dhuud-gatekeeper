import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useBadgeStatistics } from '@/hooks/use-badge-admin';
import { cn } from '@/lib/utils';

export function BadgeStatisticsTab() {
  const { t, i18n } = useTranslation();
  const { data: stats, isLoading } = useBadgeStatistics();
  const isRTL = i18n.language === 'ar';

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
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
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              {t('admin.badges.totalAwarded', 'Total Awarded')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalAwarded}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              {t('admin.badges.thisMonth', 'This Month')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{thisMonthAwarded}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              {t('admin.badges.uniqueEarners', 'Unique Earners')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{uniqueEarners}</div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            {t('admin.badges.breakdown', 'Credential Breakdown')}
          </CardTitle>
          <CardDescription>
            {t('admin.badges.breakdownDesc', 'Distribution and award statistics by credential')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
            <div className="col-span-5">{t('admin.badges.credential', 'Credential')}</div>
            <div className="col-span-2">{t('admin.badges.level', 'Level')}</div>
            <div className="col-span-2">{t('admin.badges.category', 'Category')}</div>
            <div className="col-span-1 text-end">{t('admin.badges.total', 'Total')}</div>
            <div className="col-span-2 text-end">{t('admin.badges.thisMonth', 'This Month')}</div>
          </div>

          <div className="divide-y">
            {stats?.map((badge) => (
              <div
                key={badge.badge_id}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-4 py-3"
              >
                <div className="md:col-span-5">
                  <p className="font-medium text-sm">
                    {isRTL && badge.name_ar ? badge.name_ar : badge.name}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Badge variant="secondary" className="capitalize text-xs font-normal bg-muted">
                    {badge.tier}
                  </Badge>
                </div>
                <div className="md:col-span-2">
                  <Badge variant="secondary" className="capitalize text-xs font-normal bg-muted">
                    {badge.category}
                  </Badge>
                </div>
                <div className="md:col-span-1 text-end text-sm tabular-nums">
                  {badge.total_awarded}
                </div>
                <div className="md:col-span-2 text-end text-sm tabular-nums text-muted-foreground">
                  +{badge.awarded_this_month}
                </div>
              </div>
            ))}

            {(!stats || stats.length === 0) && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {t('admin.badges.noStats', 'No statistics available')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
