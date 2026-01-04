import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncidentKPIStripProps {
  totalOpen: number;
  criticalHigh: number;
  overdue: number;
  pendingActions: number;
  onKPIClick?: (filter: string) => void;
}

interface KPIItemProps {
  icon: React.ElementType;
  label: string;
  value: number;
  colorClass: string;
  onClick?: () => void;
}

function KPIItem({ icon: Icon, label, value, colorClass, onClick }: KPIItemProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
        "border-s-4",
        colorClass
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", colorClass.replace('border-s-', 'bg-').replace('-500', '-100').replace('-600', '-100'))}>
            <Icon className={cn("h-5 w-5", colorClass.replace('border-s-', 'text-'))} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function IncidentKPIStrip({ 
  totalOpen, 
  criticalHigh, 
  overdue, 
  pendingActions,
  onKPIClick 
}: IncidentKPIStripProps) {
  const { t } = useTranslation();

  const kpis: KPIItemProps[] = [
    {
      icon: AlertTriangle,
      label: t('hsseDashboard.open', 'Open Events'),
      value: totalOpen,
      colorClass: 'border-s-blue-500',
      onClick: () => onKPIClick?.('open'),
    },
    {
      icon: AlertCircle,
      label: t('hsseDashboard.critical', 'Critical / Major'),
      value: criticalHigh,
      colorClass: 'border-s-destructive',
      onClick: () => onKPIClick?.('critical'),
    },
    {
      icon: Clock,
      label: t('hsseDashboard.overdueActions', 'Overdue'),
      value: overdue,
      colorClass: 'border-s-amber-500',
      onClick: () => onKPIClick?.('overdue'),
    },
    {
      icon: CheckCircle2,
      label: t('hsseDashboard.pendingApprovals', 'Pending Actions'),
      value: pendingActions,
      colorClass: 'border-s-orange-500',
      onClick: () => onKPIClick?.('pending'),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi, index) => (
        <KPIItem key={index} {...kpi} />
      ))}
    </div>
  );
}
