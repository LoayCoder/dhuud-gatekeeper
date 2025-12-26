import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SLACountdownTimerProps {
  dueDate: string | null;
  escalationLevel: number;
  status: string | null;
}

export function SLACountdownTimer({ dueDate, escalationLevel, status }: SLACountdownTimerProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [urgency, setUrgency] = useState<'safe' | 'warning' | 'danger' | 'critical'>('safe');

  useEffect(() => {
    if (!dueDate || status === 'completed' || status === 'verified' || status === 'closed') {
      setTimeLeft('');
      return;
    }

    const calculateTimeLeft = () => {
      const now = Date.now();
      const due = new Date(dueDate).getTime();
      const diff = due - now;

      // Determine urgency
      if (escalationLevel >= 2) {
        setUrgency('critical');
      } else if (escalationLevel === 1 || diff < 0) {
        setUrgency('danger');
      } else if (diff < 3 * 24 * 60 * 60 * 1000) {
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

  if (!dueDate || status === 'completed' || status === 'verified' || status === 'closed') {
    return (
      <Badge variant="outline" className="font-normal text-muted-foreground">
        {t('sla.completed', 'Done')}
      </Badge>
    );
  }

  const getConfig = () => {
    switch (urgency) {
      case 'critical':
        return {
          variant: 'destructive' as const,
          className: 'bg-destructive text-destructive-foreground',
        };
      case 'danger':
        return {
          variant: 'destructive' as const,
          className: 'bg-destructive/90 text-destructive-foreground',
        };
      case 'warning':
        return {
          variant: 'outline' as const,
          className: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400',
        };
      default:
        return {
          variant: 'outline' as const,
          className: 'text-muted-foreground',
        };
    }
  };

  const config = getConfig();

  return (
    <Badge 
      variant={config.variant} 
      className={cn("font-mono text-xs", config.className)}
    >
      {timeLeft}
      {escalationLevel > 0 && <span className="ms-1 font-semibold">L{escalationLevel}</span>}
    </Badge>
  );
}
