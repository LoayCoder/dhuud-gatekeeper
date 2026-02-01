import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Eye, ClipboardList, Plus, FileBox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModuleAccess } from '@/hooks/use-module-access';
import { useUserRoles } from '@/hooks/use-user-roles';

interface QuickActionProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  path: string;
  colorClass: string;
  bgClass: string;
}

function QuickAction({ icon: Icon, label, description, path, colorClass, bgClass }: QuickActionProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(path)}
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl border bg-card',
        'hover:shadow-md hover:border-primary/30 transition-all duration-200',
        'text-start w-full group'
      )}
    >
      <div className={cn('p-3 rounded-xl transition-transform group-hover:scale-110', bgClass)}>
        <Icon className={cn('h-5 w-5', colorClass)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm group-hover:text-primary transition-colors">
          {label}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {description}
        </p>
      </div>
      <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export function QuickReportButtons() {
  const { t } = useTranslation();
  const { hasModule } = useModuleAccess();
  const { hasRole } = useUserRoles();

  // Check if user can create gate passes (security module or department rep)
  const canCreateGatePass = hasModule('security') || hasRole('department_representative');

  const baseActions: QuickActionProps[] = [
    {
      icon: AlertTriangle,
      label: t('dashboard.quickActions.reportIncident', 'Report Incident'),
      description: t('dashboard.quickActions.reportIncidentDesc', 'Log a safety incident'),
      path: '/incidents/new',
      colorClass: 'text-destructive',
      bgClass: 'bg-destructive/10',
    },
    {
      icon: Eye,
      label: t('dashboard.quickActions.reportObservation', 'Report Observation'),
      description: t('dashboard.quickActions.reportObservationDesc', 'Share a safety observation'),
      path: '/observations/new',
      colorClass: 'text-info',
      bgClass: 'bg-info/10',
    },
    {
      icon: ClipboardList,
      label: t('dashboard.quickActions.myActions', 'My Actions'),
      description: t('dashboard.quickActions.myActionsDesc', 'View assigned tasks'),
      path: '/actions/my',
      colorClass: 'text-primary',
      bgClass: 'bg-primary/10',
    },
  ];

  // Add gate pass action if user has access
  const actions = canCreateGatePass
    ? [
        ...baseActions,
        {
          icon: FileBox,
          label: t('dashboard.quickActions.createGatePass', 'Create Gate Pass'),
          description: t('dashboard.quickActions.createGatePassDesc', 'Request material movement'),
          path: '/contractors/gate-passes?action=create',
          colorClass: 'text-warning',
          bgClass: 'bg-warning/10',
        },
      ]
    : baseActions;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {actions.map((action, idx) => (
        <QuickAction key={idx} {...action} />
      ))}
    </div>
  );
}
