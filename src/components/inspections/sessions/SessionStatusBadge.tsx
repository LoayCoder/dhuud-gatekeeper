import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { FileEdit, Play, Lock, AlertTriangle } from 'lucide-react';

interface SessionStatusBadgeProps {
  status: 'draft' | 'in_progress' | 'completed_with_open_actions' | 'closed';
}

export function SessionStatusBadge({ status }: SessionStatusBadgeProps) {
  const { t } = useTranslation();
  
  const statusConfig = {
    draft: {
      label: t('inspectionSessions.status.draft'),
      variant: 'secondary' as const,
      icon: FileEdit,
    },
    in_progress: {
      label: t('inspectionSessions.status.inProgress'),
      variant: 'default' as const,
      icon: Play,
    },
    completed_with_open_actions: {
      label: t('inspectionSessions.status.completedWithActions'),
      variant: 'outline' as const,
      icon: AlertTriangle,
    },
    closed: {
      label: t('inspectionSessions.status.closed'),
      variant: 'secondary' as const,
      icon: Lock,
    },
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
