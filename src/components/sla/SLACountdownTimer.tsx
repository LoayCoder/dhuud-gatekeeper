import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, ArrowUp, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SLACountdownTimerProps {
  dueDate: string | null;
  escalationLevel: number;
  status: string | null;
}

export function SLACountdownTimer({ dueDate, escalationLevel, status }: SLACountdownTimerProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [urgency, setUrgency] = useState<'safe' | 'warning' | 'danger' | 'escalated'>('safe');

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
        setUrgency('escalated');
      } else if (escalationLevel === 1 || diff < 0) {
        setUrgency('danger');
      } else if (diff < 3 * 24 * 60 * 60 * 1000) { // 3 days
        setUrgency('warning');
      } else {
        setUrgency('safe');
      }

      // Calculate time string
      const absDiff = Math.abs(diff);
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

      let timeStr = '';
      if (days > 0) {
        timeStr = `${days}d ${hours}h`;
      } else if (hours > 0) {
        timeStr = `${hours}h ${minutes}m`;
      } else {
        timeStr = `${minutes}m ${seconds}s`;
      }

      if (diff < 0) {
        timeStr = `-${timeStr}`;
      }

      setTimeLeft(timeStr);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [dueDate, escalationLevel, status]);

  if (!dueDate || status === 'completed' || status === 'verified' || status === 'closed') {
    return (
      <Badge variant="outline" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        {t('sla.completed', 'Completed')}
      </Badge>
    );
  }

  const getIcon = () => {
    switch (urgency) {
      case 'escalated':
        return <ArrowUp className="h-3 w-3" />;
      case 'danger':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getVariant = () => {
    switch (urgency) {
      case 'escalated':
        return 'destructive';
      case 'danger':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Badge 
      variant={getVariant() as any} 
      className={cn(
        "gap-1 font-mono text-xs",
        urgency === 'escalated' && "animate-pulse bg-red-600",
        urgency === 'warning' && "bg-yellow-500 text-yellow-950"
      )}
    >
      {getIcon()}
      {timeLeft}
      {escalationLevel > 0 && (
        <span className="ms-1">L{escalationLevel}</span>
      )}
    </Badge>
  );
}
