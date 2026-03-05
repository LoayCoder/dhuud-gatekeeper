import { useTranslation } from 'react-i18next';
import { Shield, AlertTriangle, LayoutDashboard, Monitor, ShieldCheck, Users, Lock, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TenantSecuritySelector } from '@/features/security';
import { SecurityOverviewTab } from '@/features/security';
import { ActiveSessionsTab } from '@/features/security';
import { SecuritySettingsActionsTab } from '@/features/security';
import { SuspiciousActivityTabContent } from './components/SuspiciousActivityTabContent';
import { SecurityEventsTabContent } from './components/SecurityEventsTabContent';
import { UserManagementTabContent } from './components/UserManagementTabContent';
import { SensitiveDataAccessTabContent } from './components/SensitiveDataAccessTabContent';
import { useSecurityAuditLog } from './hooks/useSecurityAuditLog';

export default function SecurityAuditLog() {
  const state = useSecurityAuditLog();
  const {
    t, direction, realtimeEnabled, selectedTenantId, setSelectedTenantId, suspiciousStats
  } = state;

  return (
    <div className="container max-w-7xl py-8 space-y-8" dir={direction}>
      {/* Header */}
      <div className="text-start">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          {t('securityAudit.title', 'Security Audit Log')}
        </h1>
        <p className="text-muted-foreground">
          {t('securityAudit.description', 'Monitor and review security events and user management activities')}
        </p>
        {realtimeEnabled && (
          <Badge variant="outline" className="mt-2 gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            {t('securityAudit.realtime', 'Real-time updates enabled')}
          </Badge>
        )}
      </div>

      {/* Tenant Selector */}
      <div className="flex items-center justify-between">
        <TenantSecuritySelector 
          selectedTenantId={selectedTenantId} 
          onTenantChange={setSelectedTenantId} 
        />
        {realtimeEnabled && (
          <Badge variant="outline" className="gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            {t('securityAudit.realtime', 'Real-time updates enabled')}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6" dir={direction}>
        <div className="flex justify-start overflow-x-auto">
          <TabsList className="flex flex-wrap h-auto gap-1 w-full max-w-5xl">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              {t('securityAudit.overview', 'Overview')}
            </TabsTrigger>
            <TabsTrigger value="suspicious-activity" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t('securityAudit.suspiciousActivity', 'Suspicious Activity')}
              {suspiciousStats.suspicious > 0 && (
                <Badge variant="destructive" className="ms-1">{suspiciousStats.suspicious}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active-sessions" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              {t('securityAudit.activeSessions', 'Active Sessions')}
            </TabsTrigger>
            <TabsTrigger value="security-events" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              {t('securityAudit.securityEvents', 'Security Events')}
            </TabsTrigger>
            <TabsTrigger value="user-management" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('securityAudit.userManagement', 'User Management')}
            </TabsTrigger>
            <TabsTrigger value="sensitive-access" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t('securityAudit.sensitiveAccess', 'Data Access')}
            </TabsTrigger>
            <TabsTrigger value="settings-actions" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t('securityAudit.settingsActions', 'Settings & Actions')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <SecurityOverviewTab tenantId={selectedTenantId} />
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="active-sessions">
          <ActiveSessionsTab tenantId={selectedTenantId} />
        </TabsContent>

        <SuspiciousActivityTabContent state={state} />
        <SecurityEventsTabContent state={state} />
        <UserManagementTabContent state={state} />
        <SensitiveDataAccessTabContent state={state} />

        {/* Settings & Actions Tab */}
        <TabsContent value="settings-actions">
          <SecuritySettingsActionsTab tenantId={selectedTenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

