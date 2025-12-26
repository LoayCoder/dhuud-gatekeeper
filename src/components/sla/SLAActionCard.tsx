import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SLACountdownTimer } from './SLACountdownTimer';
import { User, Calendar, MoreVertical, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface SLAActionCardProps {
  action: {
    id: string;
    reference_id: string | null;
    title: string;
    priority: string | null;
    due_date: string | null;
    status: string | null;
    escalation_level: number;
    assignee_name: string | null;
  };
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onView?: () => void;
  onExtend?: () => void;
  onEscalate?: () => void;
}

const getPriorityConfig = (priority: string | null) => {
  switch (priority) {
    case 'critical':
      return { variant: 'destructive' as const, bg: 'border-red-200 dark:border-red-800' };
    case 'high':
      return { variant: 'destructive' as const, bg: 'border-orange-200 dark:border-orange-800' };
    case 'medium':
      return { variant: 'secondary' as const, bg: 'border-yellow-200 dark:border-yellow-800' };
    case 'low':
      return { variant: 'outline' as const, bg: 'border-green-200 dark:border-green-800' };
    default:
      return { variant: 'outline' as const, bg: 'border-border' };
  }
};

export function SLAActionCard({ 
  action, 
  selected, 
  onSelect, 
  onView,
  onExtend,
  onEscalate 
}: SLAActionCardProps) {
  const { t } = useTranslation();
  const priorityConfig = getPriorityConfig(action.priority);

  const getEscalationBg = () => {
    if (action.escalation_level >= 2) return 'bg-red-50 dark:bg-red-900/20';
    if (action.escalation_level === 1) return 'bg-orange-50 dark:bg-orange-900/20';
    return '';
  };

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      priorityConfig.bg,
      getEscalationBg(),
      selected && "ring-2 ring-primary"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Selection */}
          <div className="pt-1">
            <Checkbox 
              checked={selected} 
              onCheckedChange={onSelect}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                {action.reference_id && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {action.reference_id}
                  </Badge>
                )}
                <h3 className="font-medium text-sm leading-tight line-clamp-2">
                  {action.title}
                </h3>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={onView}>
                      <ExternalLink className="h-4 w-4 me-2" />
                      {t('common.view', 'View')}
                    </DropdownMenuItem>
                  )}
                  {onExtend && (
                    <DropdownMenuItem onClick={onExtend}>
                      <Calendar className="h-4 w-4 me-2" />
                      {t('sla.extendDeadline', 'Extend Deadline')}
                    </DropdownMenuItem>
                  )}
                  {onEscalate && (
                    <DropdownMenuItem onClick={onEscalate} className="text-destructive">
                      {t('sla.manualEscalate', 'Manual Escalate')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={priorityConfig.variant} className="text-xs">
                {action.priority || 'medium'}
              </Badge>
              
              {action.assignee_name && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {action.assignee_name}
                </span>
              )}
              
              {action.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(action.due_date), 'PP')}
                </span>
              )}
            </div>

            {/* Footer Row */}
            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <Badge variant="outline" className="text-xs">
                {action.status || 'pending'}
              </Badge>
              <SLACountdownTimer
                dueDate={action.due_date}
                escalationLevel={action.escalation_level}
                status={action.status}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
