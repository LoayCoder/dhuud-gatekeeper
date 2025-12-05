import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSupportAgents } from '@/hooks/use-support-agents';
import { User, Users } from 'lucide-react';

interface AgentAssignmentSelectProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  disabled?: boolean;
}

export function AgentAssignmentSelect({ 
  value, 
  onValueChange, 
  disabled 
}: AgentAssignmentSelectProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { agents, workload, isLoading } = useSupportAgents();

  const getAgentWorkload = (agentId: string) => {
    return workload.find(w => w.agent_id === agentId);
  };

  return (
    <Select
      value={value || 'unassigned'}
      onValueChange={(v) => onValueChange(v === 'unassigned' ? null : v)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full" dir={direction}>
        <SelectValue placeholder={t('adminSupport.selectAgent')} />
      </SelectTrigger>
      <SelectContent dir={direction}>
        <SelectItem value="unassigned">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{t('adminSupport.unassigned')}</span>
          </div>
        </SelectItem>
        {agents.map((agent) => {
          const agentWorkload = getAgentWorkload(agent.id);
          return (
            <SelectItem key={agent.id} value={agent.id}>
              <div className="flex items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{agent.full_name || t('adminSupport.unknownAgent')}</span>
                </div>
                {agentWorkload && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      agentWorkload.total_active >= 10 
                        ? 'bg-destructive/10 text-destructive' 
                        : agentWorkload.total_active >= 5 
                          ? 'bg-orange-500/10 text-orange-500' 
                          : 'bg-green-500/10 text-green-500'
                    }`}
                  >
                    {agentWorkload.total_active} {t('adminSupport.activeTickets')}
                  </Badge>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
