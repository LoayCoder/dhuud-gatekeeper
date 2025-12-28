import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface FindingSLACountdownTimerProps {
  dueDate: string | null;
  escalationLevel: number;
  status: string | null;
  classification?: string;
  showLabel?: boolean;
}

export function FindingSLACountdownTimer({ 
  dueDate, 
  escalationLevel, 
  status,
  classification,
  showLabel = false,
}: FindingSLACountdownTimerProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [urgency, setUrgency] = useState<'safe' | 'warning' | 'danger' | 'critical'>('safe');

  useEffect(() => {
    if (!dueDate || status === 'closed' || status === 'resolved') {
      setTimeLeft('');
      return;
    }

    const calculateTimeLeft = () => {
      const now = Date.now();
      const due = new Date(dueDate).getTime();
      const diff = due - now;

      // Determine urgency based on escalation level and time remaining
      if (escalationLevel >= 2) {
        setUrgency('critical');
      } else if (escalationLevel === 1 || diff < 0) {
        setUrgency('danger');
      } else if (diff < 3 * 24 * 60 * 60 * 1000) { // Less than 3 days
        setUrgency('warning');
      } else {
        setUrgency('safe');
      }

      // Calculate time string
      const absDiff = Math.abs(diff);
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

      let timeStr = '';
      if (days > 0) {
        timeStr = `${days}d ${hours}h`;
      } else if (hours > 0) {
        timeStr = `${hours}h ${minutes}m`;
      } else {
        timeStr = `${minutes}m`;
      }

      if (diff < 0) {
        timeStr = `-${timeStr}`;
      }

      setTimeLeft(timeStr);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [dueDate, escalationLevel, status]);

  // Closed/Resolved status
  if (status === 'closed' || status === 'resolved') {
    return (
      <Badge variant="outline" className="font-normal text-muted-foreground gap-1">
        <CheckCircle className="h-3 w-3" />
        {t('sla.completed', 'Done')}
      </Badge>
    );
  }

  // No due date set
  if (!dueDate) {
    return (
      <Badge variant="outline" className="font-normal text-muted-foreground">
        {t('sla.noDueDate', 'No due date')}
      </Badge>
    );
  }

  const getConfig = () => {
    switch (urgency) {
      case 'critical':
        return {
          variant: 'destructive' as const,
          className: 'bg-destructive text-destructive-foreground animate-pulse',
          icon: AlertTriangle,
        };
      case 'danger':
        return {
          variant: 'destructive' as const,
          className: 'bg-destructive/90 text-destructive-foreground',
          icon: AlertTriangle,
        };
      case 'warning':
        return {
          variant: 'outline' as const,
          className: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400',
          icon: Clock,
        };
      default:
        return {
          variant: 'outline' as const,
          className: 'text-muted-foreground',
          icon: Clock,
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={cn("font-mono text-xs gap-1", config.className)}
    >
      <Icon className="h-3 w-3" />
      {showLabel && <span>{t('sla.due', 'Due')}:</span>}
      {timeLeft}
      {escalationLevel > 0 && (
        <span className="ms-1 font-semibold">L{escalationLevel}</span>
      )}
    </Badge>
  );
}
