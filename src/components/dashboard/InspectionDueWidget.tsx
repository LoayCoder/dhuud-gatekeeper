import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface InspectionDueWidgetProps {
  dueToday: number;
  overdue: number;
  completedThisWeek: number;
  isLoading?: boolean;
}

export function InspectionDueWidget({
  dueToday,
  overdue,
  completedThisWeek,
  isLoading,
}: InspectionDueWidgetProps) {
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

  const hasOverdue = overdue > 0;
  const totalPending = dueToday + overdue;

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        hasOverdue && "border-orange-500/50 bg-orange-500/5"
      )}
      onClick={() => navigate('/inspections')}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardCheck className={cn("h-4 w-4", hasOverdue ? "text-orange-600" : "text-primary")} />
            {t('dashboard.widgets.inspectionsDue', 'Inspections Due')}
          </CardTitle>
          {hasOverdue && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
              <AlertCircle className="h-3 w-3 me-1" />
              {overdue} {t('dashboard.widgets.overdue', 'overdue')}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          {t('dashboard.widgets.inspectionsDescription', 'Scheduled inspections')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold">{totalPending}</div>
          <div className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3 w-3" />
            {completedThisWeek} {t('dashboard.widgets.thisWeek', 'this week')}
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
