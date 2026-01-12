import { useTranslation } from 'react-i18next';
import { Users, Clock, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TacticalStatsGridProps {
  onDuty: number;
  scheduled: number;
  completed: number;
  alerts: number;
  securityScore?: number;
  className?: string;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  status: 'nominal' | 'pending' | 'warning' | 'critical';
  suffix?: string;
}

function StatCard({ label, value, icon, status, suffix }: StatCardProps) {
  const statusColors = {
    nominal: 'tactical-text-accent',
    pending: 'text-[hsl(var(--tactical-info))]',
    warning: 'tactical-text-warning',
    critical: 'tactical-text-critical',
  };

  const statusBorders = {
    nominal: 'tactical-border-accent tactical-glow',
    pending: 'border-[hsl(var(--tactical-info)/0.4)]',
    warning: 'tactical-glow-warning border-[hsl(var(--tactical-warning)/0.4)]',
    critical: 'tactical-border-critical tactical-glow-critical',
  };

  const statusLabels = {
    nominal: 'OK',
    pending: 'PEND',
    warning: 'WARN',
    critical: 'ALERT',
  };

  return (
    <div className={cn(
      'tactical-card p-4 flex flex-col',
      statusBorders[status]
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] tracking-[0.2em] uppercase tactical-text-dim font-medium">
          {label}
        </span>
        <div className={cn('p-1.5 rounded', statusColors[status])}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <div className="flex-1 flex items-end justify-between">
        <span className={cn('tactical-stat-value', statusColors[status])}>
          {value}{suffix}
        </span>
        <span className={cn(
          'text-[9px] px-2 py-0.5 rounded tracking-wider font-bold',
          status === 'nominal' && 'bg-[hsl(var(--tactical-accent)/0.2)] tactical-text-accent',
          status === 'pending' && 'bg-[hsl(var(--tactical-info)/0.2)] text-[hsl(var(--tactical-info))]',
          status === 'warning' && 'bg-[hsl(var(--tactical-warning)/0.2)] tactical-text-warning',
          status === 'critical' && 'bg-[hsl(var(--tactical-critical)/0.2)] tactical-text-critical animate-tactical-pulse'
        )}>
          {statusLabels[status]}
        </span>
      </div>
    </div>
  );
}

export function TacticalStatsGrid({
  onDuty,
  scheduled,
  completed,
  alerts,
  securityScore = 0,
  className,
}: TacticalStatsGridProps) {
  const { t } = useTranslation();

  const getScoreStatus = (score: number): 'nominal' | 'warning' | 'critical' => {
    if (score >= 80) return 'nominal';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  const getAlertStatus = (count: number): 'nominal' | 'warning' | 'critical' => {
    if (count === 0) return 'nominal';
    if (count <= 2) return 'warning';
    return 'critical';
  };

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-5 gap-3', className)}>
      <StatCard
        label={t('security.tactical.securityScore', 'Security Score')}
        value={securityScore}
        suffix="%"
        icon={<Shield className="h-4 w-4" />}
        status={getScoreStatus(securityScore)}
      />
      <StatCard
        label={t('security.tactical.onDuty', 'Personnel On Duty')}
        value={onDuty}
        icon={<Users className="h-4 w-4" />}
        status={onDuty > 0 ? 'nominal' : 'warning'}
      />
      <StatCard
        label={t('security.tactical.scheduled', 'Scheduled')}
        value={scheduled}
        icon={<Clock className="h-4 w-4" />}
        status="pending"
      />
      <StatCard
        label={t('security.tactical.completed', 'Completed')}
        value={completed}
        icon={<CheckCircle className="h-4 w-4" />}
        status="nominal"
      />
      <StatCard
        label={t('security.tactical.activeAlerts', 'Active Alerts')}
        value={alerts}
        icon={<AlertTriangle className="h-4 w-4" />}
        status={getAlertStatus(alerts)}
      />
    </div>
  );
}
