import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardCheck, 
  Search, 
  AlertTriangle, 
  ListTodo,
  Plus
} from "lucide-react";
import { useQuickActionCounts } from "@/hooks/use-quick-action-counts";
import { Skeleton } from "@/components/ui/skeleton";

interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  variant?: 'default' | 'warning' | 'danger';
  onClick: () => void;
}

function QuickActionButton({ icon: Icon, label, count, variant = 'default', onClick }: QuickActionButtonProps) {
  const bgClass = variant === 'danger' 
    ? 'bg-destructive/10 hover:bg-destructive/20 border-destructive/20' 
    : variant === 'warning' 
      ? 'bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
      : 'bg-card hover:bg-accent border-border';

  return (
    <button 
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center p-4 rounded-lg border transition-colors ${bgClass}`}
    >
      <Icon className={`h-6 w-6 mb-2 ${
        variant === 'danger' ? 'text-destructive' : 
        variant === 'warning' ? 'text-yellow-600' : 
        'text-primary'
      }`} />
      <span className="text-sm font-medium text-center">{label}</span>
      {count !== undefined && count > 0 && (
        <Badge 
          variant={variant === 'danger' ? 'destructive' : variant === 'warning' ? 'outline' : 'default'}
          className="absolute -top-2 -end-2 min-w-[20px] h-5 flex items-center justify-center"
        >
          {count}
        </Badge>
      )}
    </button>
  );
}

export function QuickActionsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: counts, isLoading } = useQuickActionCounts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('hsseDashboard.quickActions', 'Quick Actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('hsseDashboard.quickActions', 'Quick Actions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <QuickActionButton
            icon={ClipboardCheck}
            label={t('hsseDashboard.pendingApprovals', 'Pending Approvals')}
            count={counts?.pending_approvals}
            variant={counts?.pending_approvals && counts.pending_approvals > 0 ? 'warning' : 'default'}
            onClick={() => navigate('/incidents/investigate')}
          />
          <QuickActionButton
            icon={Search}
            label={t('hsseDashboard.openInvestigations')}
            count={counts?.open_investigations}
            onClick={() => navigate('/incidents/investigate')}
          />
          <QuickActionButton
            icon={AlertTriangle}
            label={t('hsseDashboard.overdueActions')}
            count={counts?.overdue_actions}
            variant={counts?.overdue_actions && counts.overdue_actions > 0 ? 'danger' : 'default'}
            onClick={() => navigate('/incidents/my-actions')}
          />
          <QuickActionButton
            icon={ListTodo}
            label={t('hsseDashboard.myActions', 'My Actions')}
            count={counts?.my_actions}
            onClick={() => navigate('/incidents/my-actions')}
          />
        </div>
        <button
          onClick={() => navigate('/incidents/report')}
          className="w-full mt-3 flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">{t('hsseDashboard.reportNewEvent', 'Report New Event')}</span>
        </button>
      </CardContent>
    </Card>
  );
}
