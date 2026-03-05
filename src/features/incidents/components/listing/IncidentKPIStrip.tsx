import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { KPIStrip, type KPIItem } from '@/components/ui/kpi-strip';
import { type StatusType } from '@/components/ui/status-badge';

interface IncidentKPIStripProps {
  totalOpen: number;
  criticalHigh: number;
  overdue: number;
  pendingActions: number;
  onKPIClick?: (filter: string) => void;
}

export function IncidentKPIStrip({ 
  totalOpen, 
  criticalHigh, 
  overdue, 
  pendingActions,
  onKPIClick 
}: IncidentKPIStripProps) {
  const { t } = useTranslation();

  const kpis: KPIItem[] = [
    {
      icon: AlertTriangle,
      label: t('hsseDashboard.open', 'Open Events'),
      value: totalOpen,
      status: 'informational' as StatusType,
      onClick: () => onKPIClick?.('open'),
    },
    {
      icon: AlertCircle,
      label: t('hsseDashboard.critical', 'Critical / Major'),
      value: criticalHigh,
      status: 'critical' as StatusType,
      onClick: () => onKPIClick?.('critical'),
    },
    {
      icon: Clock,
      label: t('hsseDashboard.overdueActions', 'Overdue'),
      value: overdue,
      status: 'pending' as StatusType,
      onClick: () => onKPIClick?.('overdue'),
    },
    {
      icon: CheckCircle2,
      label: t('hsseDashboard.pendingApprovals', 'Pending Actions'),
      value: pendingActions,
      status: 'pending' as StatusType,
      onClick: () => onKPIClick?.('pending'),
    },
  ];

  return <KPIStrip items={kpis} />;
}
