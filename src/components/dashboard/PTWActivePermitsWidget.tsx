import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface PTWActivePermitsWidgetProps {
  activePermits: number;
  pendingApprovals: number;
  expiringToday: number;
  isLoading?: boolean;
}

export function PTWActivePermitsWidget({
  activePermits,
  pendingApprovals,
  expiringToday,
  isLoading,
}: PTWActivePermitsWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/ptw')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {t('dashboard.widgets.ptwActive', 'Active Permits')}
          </CardTitle>
          {pendingApprovals > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingApprovals} {t('dashboard.widgets.pending', 'pending')}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          {t('dashboard.widgets.ptwDescription', 'Permit to Work status')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold">{activePermits}</div>
          {expiringToday > 0 && (
            <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
              <Clock className="h-3 w-3" />
              {expiringToday} {t('dashboard.widgets.expiringToday', 'expiring')}
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
          {t('dashboard.widgets.viewAll', 'View All')}
          <ArrowRight className="ms-1 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
