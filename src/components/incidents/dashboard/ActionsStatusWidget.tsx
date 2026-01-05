import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { ClipboardList, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import type { ActionStats } from "@/hooks/use-hsse-event-dashboard";

interface Props {
  data: ActionStats;
}

export function ActionsStatusWidget({ data }: Props) {
  const { t } = useTranslation();

  const totalOpen = data.open_actions;
  const overduePercentage = totalOpen > 0 ? Math.round((data.overdue_actions / totalOpen) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          {t('hsseDashboard.actionsStatus')}
        </CardTitle>
        <Link 
          to="/incidents/actions" 
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {t('hsseDashboard.viewAll')}
          <ArrowRight className="h-3 w-3 rtl:rotate-180" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('hsseDashboard.openActions')}</span>
            </div>
            <p className="text-2xl font-bold">{data.open_actions}</p>
          </div>

          <div className="p-3 bg-destructive/10 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">{t('hsseDashboard.overdueActions')}</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{data.overdue_actions}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t('hsseDashboard.overdueRate')}</span>
            <span className="font-medium">{overduePercentage}%</span>
          </div>
          <Progress value={overduePercentage} className="h-2" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {data.critical_actions > 0 && (
            <Badge variant="destructive">
              {data.critical_actions} {t('hsseDashboard.critical')}
            </Badge>
          )}
          {data.high_priority_actions > 0 && (
            <Badge variant="secondary" className="bg-warning/10 text-warning border border-warning/20">
              {data.high_priority_actions} {t('hsseDashboard.highPriority')}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
