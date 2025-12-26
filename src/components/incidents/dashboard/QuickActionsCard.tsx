import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  AlertTriangle, 
  Plus
} from "lucide-react";
import { useQuickActionCounts } from "@/hooks/use-quick-action-counts";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickActionDrilldownModal } from "./QuickActionDrilldownModal";
import { QuickActionType } from "@/hooks/use-quick-action-drilldown";

interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  variant?: 'default' | 'warning' | 'danger';
  onClick: () => void;
}

function QuickActionButton({ icon: Icon, label, count, variant = 'default', onClick }: QuickActionButtonProps) {
  const bgClass = variant === 'danger' 
    ? 'bg-gradient-to-br from-destructive/10 to-destructive/5 hover:from-destructive/20 hover:to-destructive/10 border-destructive/30' 
    : variant === 'warning' 
      ? 'bg-gradient-to-br from-warning/20 to-warning/5 hover:from-warning/30 hover:to-warning/10 border-warning/30 dark:from-warning/20 dark:to-warning/5'
      : 'bg-gradient-to-br from-card to-muted/30 hover:from-primary/5 hover:to-primary/10 border-border';

  const iconClass = variant === 'danger' 
    ? 'text-destructive' 
    : variant === 'warning' 
      ? 'text-warning dark:text-warning' 
      : 'text-primary';

  return (
    <button 
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:shadow-md hover:scale-[1.02] ${bgClass}`}
    >
      <div className={`p-2 rounded-lg mb-2 ${
        variant === 'danger' ? 'bg-destructive/10' : 
        variant === 'warning' ? 'bg-warning/10' : 
        'bg-primary/10'
      }`}>
        <Icon className={`h-5 w-5 ${iconClass}`} />
      </div>
      <span className="text-sm font-medium text-center">{label}</span>
      {count !== undefined && (
        <Badge 
          variant={variant === 'danger' ? 'destructive' : 'default'}
          className={`absolute -top-2 -end-2 min-w-[20px] h-5 flex items-center justify-center ${
            variant === 'warning' ? 'bg-warning text-warning-foreground' : ''
          }`}
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
  const [modalType, setModalType] = useState<QuickActionType | null>(null);

  const openModal = (type: QuickActionType) => {
    setModalType(type);
  };

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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('hsseDashboard.quickActions', 'Quick Actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionButton
              icon={Search}
              label={t('hsseDashboard.openInvestigations')}
              count={counts?.open_investigations}
              onClick={() => openModal('open_investigations')}
            />
            <QuickActionButton
              icon={AlertTriangle}
              label={t('hsseDashboard.overdueActions')}
              count={counts?.overdue_actions}
              variant={counts?.overdue_actions && counts.overdue_actions > 0 ? 'danger' : 'default'}
              onClick={() => openModal('overdue_actions')}
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
      
      <QuickActionDrilldownModal
        open={modalType !== null}
        onOpenChange={(open) => !open && setModalType(null)}
        actionType={modalType}
      />
    </>
  );
}
