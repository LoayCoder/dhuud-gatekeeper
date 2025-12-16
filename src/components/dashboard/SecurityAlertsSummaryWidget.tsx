import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Users, ArrowRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SecurityAlertsSummaryWidgetProps {
  openAlerts: number;
  criticalAlerts: number;
  visitorsOnSite: number;
  isLoading?: boolean;
}

export function SecurityAlertsSummaryWidget({
  openAlerts,
  criticalAlerts,
  visitorsOnSite,
  isLoading,
}: SecurityAlertsSummaryWidgetProps) {
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

  const hasCritical = criticalAlerts > 0;

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        hasCritical && "border-destructive/50 bg-destructive/5"
      )}
      onClick={() => navigate('/security')}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldAlert className={cn("h-4 w-4", hasCritical ? "text-destructive" : "text-primary")} />
            {t('dashboard.widgets.securityAlerts', 'Security Alerts')}
          </CardTitle>
          {hasCritical && (
            <Badge variant="destructive" className="text-xs flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {criticalAlerts}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          {t('dashboard.widgets.securityDescription', 'Active alerts & visitors')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold">{openAlerts}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {visitorsOnSite} {t('dashboard.widgets.visitors', 'on site')}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
          {t('dashboard.widgets.viewAll', 'View All')}
          <ArrowRight className="ms-1 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
