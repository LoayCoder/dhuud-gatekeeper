import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  ClipboardCheck, 
  AlertTriangle, 
  DoorOpen,
  Plus,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useModuleAccess } from '@/hooks/use-module-access';
import { useUserRoles } from '@/hooks/use-user-roles';

export function QuickActionsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasModule } = useModuleAccess();
  const { hasRole } = useUserRoles();

  const quickActions = [
    {
      id: 'create-permit',
      label: t('dashboard.quickActions.createPermit', 'Create PTW Permit'),
      icon: FileText,
      path: '/ptw/create',
      show: hasModule('ptw'),
    },
    {
      id: 'start-inspection',
      label: t('dashboard.quickActions.startInspection', 'Start Inspection'),
      icon: ClipboardCheck,
      path: '/inspections',
      show: hasModule('audits') || hasModule('hsse_core'),
    },
    {
      id: 'report-incident',
      label: t('dashboard.quickActions.reportIncident', 'Report Event'),
      icon: AlertTriangle,
      path: '/incidents/report',
      show: hasModule('incidents') || hasModule('hsse_core'),
    },
    {
      id: 'gate-entry',
      label: t('dashboard.quickActions.gateEntry', 'Gate Entry'),
      icon: DoorOpen,
      path: '/security/gate-dashboard',
      show: hasModule('security') && (hasRole('security_guard') || hasRole('security_supervisor') || hasRole('admin')),
    },
  ].filter(action => action.show);

  if (quickActions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          {t('dashboard.quickActions.title', 'Quick Actions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            className="justify-start text-xs h-auto py-2 px-3"
            onClick={() => navigate(action.path)}
          >
            <action.icon className="h-4 w-4 me-2 shrink-0" />
            <span className="truncate">{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
