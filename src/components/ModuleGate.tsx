import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useModuleAccess, ModuleCode } from '@/hooks/use-module-access';
import { useUserRoles } from '@/hooks/use-user-roles';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ModuleGateProps {
  module: ModuleCode;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export function ModuleGate({ 
  module, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: ModuleGateProps) {
  const { t } = useTranslation();
  const { hasModule, isLoading: tenantModulesLoading } = useModuleAccess();
  const { hasModuleAccess: hasRoleModuleAccess, isLoading: rolesLoading } = useUserRoles();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const isLoading = tenantModulesLoading || rolesLoading;

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  // Admin has full access to all modules
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check BOTH tenant module access AND user role-based module access
  const hasTenantAccess = hasModule(module);
  const hasRoleAccess = hasRoleModuleAccess(module);
  
  if (hasTenantAccess && hasRoleAccess) {
    return <>{children}</>;
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show upgrade prompt
  if (showUpgradePrompt) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>{t('moduleGate.featureLocked')}</CardTitle>
          <CardDescription>
            {t('moduleGate.upgradeRequired', { module: t(`modules.${module}`) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => navigate('/settings/subscription')} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {t('moduleGate.upgradePlan')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
