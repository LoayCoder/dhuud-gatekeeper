import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ClipboardCheck, ListTodo, CheckCircle2, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyInspectionActions } from '@/hooks/use-inspection-actions';
import { useUpcomingSchedules } from '@/hooks/use-inspection-schedules';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import i18n from '@/i18n';

export function MyInspectionsWidget() {
  const { t } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  const { data: myActions = [], isLoading: actionsLoading } = useMyInspectionActions();
  const { data: upcomingSchedules = [], isLoading: schedulesLoading } = useUpcomingSchedules(7);
  
  const pendingActions = myActions.filter(a => a.status === 'assigned' || a.status === 'in_progress');
  const awaitingVerification = myActions.filter(a => a.status === 'completed');
  
  const isLoading = actionsLoading || schedulesLoading;
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            {t('myInspections.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card dir={direction}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          {t('myInspections.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upcoming Scheduled Inspections */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t('myInspections.upcomingScheduled')}
            </span>
            <Badge variant="outline">{upcomingSchedules.length}</Badge>
          </div>
          {upcomingSchedules.slice(0, 2).map((schedule) => (
            <div key={schedule.id} className="text-sm ps-5 text-muted-foreground">
              {schedule.name} - {schedule.next_due && format(new Date(schedule.next_due), 'MMM d')}
            </div>
          ))}
        </div>
        
        {/* My Pending Actions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium flex items-center gap-1">
              <ListTodo className="h-4 w-4 text-muted-foreground" />
              {t('myInspections.pendingActions')}
            </span>
            <Badge variant={pendingActions.length > 0 ? 'default' : 'outline'}>
              {pendingActions.length}
            </Badge>
          </div>
          {pendingActions.slice(0, 2).map((action) => (
            <div key={action.id} className="text-sm ps-5 flex items-center justify-between">
              <span className="text-muted-foreground truncate flex-1">{action.title}</span>
              {action.due_date && new Date(action.due_date) < new Date() && (
                <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
        
        {/* Awaiting Verification (for HSSE Experts) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              {t('myInspections.awaitingVerification')}
            </span>
            <Badge variant={awaitingVerification.length > 0 ? 'secondary' : 'outline'}>
              {awaitingVerification.length}
            </Badge>
          </div>
        </div>
        
        <div className="pt-2 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link to="/inspections/my-actions">
              {t('myInspections.viewMyActions')}
              <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link to="/inspections/schedules">
              {t('myInspections.viewSchedules')}
              <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
