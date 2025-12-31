import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, AlertTriangle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { useDeptRepDashboard } from '@/hooks/use-dept-rep-dashboard';
import { useUserRoles } from '@/hooks/use-user-roles';

/**
 * Dashboard card showing event report statistics for Department Representatives
 * Displays: New (pending approval), In Progress, Overdue counts
 */
export function DeptRepEventCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasRole, isLoading: rolesLoading } = useUserRoles();
  const { data: stats, isLoading: statsLoading } = useDeptRepDashboard();

  // Only show for department representatives
  const isDeptRep = hasRole('department_representative');

  if (rolesLoading) {
    return null; // Don't show skeleton while checking role
  }

  if (!isDeptRep) {
    return null;
  }

  if (statsLoading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats?.has_department) {
    return null; // User has no department assigned
  }

  const handleNavigate = () => {
    navigate('/incidents/investigations');
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ClipboardList className="h-5 w-5 text-primary" />
          {t('home.deptRepCard.title', 'Department Event Reports')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats Badges */}
        <div className="flex flex-wrap gap-2">
          {/* New - Blue (Mandatory action indicator per HSSA standards) */}
          <Badge 
            variant="outline" 
            className="flex items-center gap-1.5 border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400 px-3 py-1.5"
          >
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">{stats.new_count}</span>
            <span className="text-xs opacity-80">{t('home.deptRepCard.new', 'New')}</span>
          </Badge>

          {/* In Progress - Amber (Warning indicator per HSSA standards) */}
          <Badge 
            variant="outline" 
            className="flex items-center gap-1.5 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-medium">{stats.in_progress_count}</span>
            <span className="text-xs opacity-80">{t('home.deptRepCard.inProgress', 'In Progress')}</span>
          </Badge>

          {/* Overdue - Red (Danger indicator per HSSA standards) */}
          <Badge 
            variant="outline" 
            className="flex items-center gap-1.5 border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400 px-3 py-1.5"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="font-medium">{stats.overdue_count}</span>
            <span className="text-xs opacity-80">{t('home.deptRepCard.overdue', 'Overdue')}</span>
          </Badge>
        </div>

        {/* Action Button */}
        <Button 
          variant="outline" 
          className="w-full justify-between group"
          onClick={handleNavigate}
        >
          <span>{t('home.deptRepCard.viewReports', 'View My Department Reports')}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
