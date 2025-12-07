import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { OverdueActionsWidget } from '@/components/dashboard/OverdueActionsWidget';
import { PendingClosureRequestsWidget } from '@/components/dashboard/PendingClosureRequestsWidget';
import { useModuleAccess } from '@/hooks/use-module-access';
import { useUserRoles } from '@/hooks/use-user-roles';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasModule } = useModuleAccess();
  const { hasRole } = useUserRoles();

  const hasHSSEAccess = hasModule('hsse_core') || hasModule('incidents');

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('dashboard.welcomeTitle')}</h2>
        <p className="text-muted-foreground">
          {t('dashboard.welcomeSubtitle')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.userProfile')}</CardTitle>
            <CardDescription>{t('dashboard.accountInfo')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium">{t('auth.email')}:</span>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('security.securityStatus')}</CardTitle>
            <CardDescription>{t('security.zeroTrustActive')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-green-600">
              <Shield className="h-5 w-5" />
              <span className="font-medium">{t('security.protected')}</span>
            </div>
          </CardContent>
        </Card>

        {hasHSSEAccess && <OverdueActionsWidget />}
        {(hasRole('hsse_manager') || hasRole('admin')) && <PendingClosureRequestsWidget />}
      </div>

      <div className="min-h-[200px] flex-1 rounded-xl bg-muted/50" />
    </div>
  );
}
