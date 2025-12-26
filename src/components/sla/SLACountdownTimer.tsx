import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, ArrowUp, CheckCircle, Siren } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SLACountdownTimerProps {
  dueDate: string | null;
  escalationLevel: number;
  status: string | null;
}

export function SLACountdownTimer({ dueDate, escalationLevel, status }: SLACountdownTimerProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [urgency, setUrgency] = useState<'safe' | 'warning' | 'danger' | 'escalated' | 'critical'>('safe');
  const [progress, setProgress] = useState(100);

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
      } else if (diff < 3 * 24 * 60 * 60 * 1000) { // 3 days
        setUrgency('warning');
      } else {
        setUrgency('safe');
      }

      // Calculate progress (based on 7-day window)
      const totalWindow = 7 * 24 * 60 * 60 * 1000;
      const progressValue = Math.max(0, Math.min(100, (diff / totalWindow) * 100));
      setProgress(progressValue);

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
      <Badge variant="outline" className="gap-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200">
        <CheckCircle className="h-3 w-3" />
        {t('sla.completed', 'Completed')}
      </Badge>
    );
  }

  const getConfig = () => {
    switch (urgency) {
      case 'critical':
        return {
          icon: Siren,
          variant: 'destructive' as const,
          className: 'animate-pulse bg-red-600 text-white border-red-700',
          progressColor: 'bg-red-400',
        };
      case 'danger':
        return {
          icon: ArrowUp,
          variant: 'destructive' as const,
          className: 'bg-red-500 text-white border-red-600',
          progressColor: 'bg-red-300',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          variant: 'secondary' as const,
          className: 'bg-yellow-500 text-yellow-950 border-yellow-600',
          progressColor: 'bg-yellow-300',
        };
      default:
        return {
          icon: Clock,
          variant: 'outline' as const,
          className: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200',
          progressColor: 'bg-green-400',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div className="relative inline-flex">
      <Badge 
        variant={config.variant} 
        className={cn(
          "gap-1.5 font-mono text-xs py-1 px-2.5 relative overflow-hidden",
          config.className
        )}
      >
        {/* Progress bar background */}
        {urgency !== 'critical' && urgency !== 'danger' && (
          <div 
            className={cn(
              "absolute inset-y-0 start-0 opacity-30 transition-all duration-1000",
              config.progressColor
            )}
            style={{ width: `${100 - progress}%` }}
          />
        )}
        
        <Icon className="h-3 w-3 relative z-10" />
        <span className="relative z-10">{timeLeft}</span>
        {escalationLevel > 0 && (
          <span className="ms-1 font-bold relative z-10">L{escalationLevel}</span>
        )}
      </Badge>
    </div>
  );
}
