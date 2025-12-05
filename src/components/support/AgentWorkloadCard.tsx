import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSupportAgents } from '@/hooks/use-support-agents';
import { User, Loader2 } from 'lucide-react';

const MAX_RECOMMENDED_TICKETS = 10;

export function AgentWorkloadCard() {
  const { t } = useTranslation();
  const { workload, isLoading } = useSupportAgents();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (workload.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('adminSupport.agentWorkload')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('adminSupport.noAgents')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('adminSupport.agentWorkload')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workload.map((agent) => {
          const workloadPercent = Math.min((agent.total_active / MAX_RECOMMENDED_TICKETS) * 100, 100);
          const isOverloaded = agent.total_active >= MAX_RECOMMENDED_TICKETS;
          const isNearCapacity = agent.total_active >= MAX_RECOMMENDED_TICKETS * 0.8;

          return (
            <div key={agent.agent_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{agent.agent_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      isOverloaded 
                        ? 'bg-destructive/10 text-destructive' 
                        : isNearCapacity 
                          ? 'bg-orange-500/10 text-orange-500' 
                          : 'bg-green-500/10 text-green-500'
                    }`}
                  >
                    {agent.total_active} / {MAX_RECOMMENDED_TICKETS}
                  </Badge>
                </div>
              </div>
              <Progress 
                value={workloadPercent} 
                className={`h-2 ${
                  isOverloaded 
                    ? '[&>div]:bg-destructive' 
                    : isNearCapacity 
                      ? '[&>div]:bg-orange-500' 
                      : '[&>div]:bg-green-500'
                }`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{agent.open_tickets} {t('adminSupport.open')}, {agent.in_progress_tickets} {t('adminSupport.inProgressShort')}</span>
                {agent.avg_resolution_hours && (
                  <span>{t('adminSupport.avgResolution')}: {agent.avg_resolution_hours}h</span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
