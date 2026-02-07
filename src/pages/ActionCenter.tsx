import { useTranslation } from 'react-i18next';
import { useModuleAccess } from '@/hooks/use-module-access';
import { useUserRoles } from '@/hooks/use-user-roles';
import { useAuth } from '@/contexts/AuthContext';
import { useActionCenterStats } from '@/hooks/use-action-center-stats';
import { EnterprisePage } from '@/components/layout/EnterprisePage';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap } from 'lucide-react';
import {
  ActionCenterStatsBar,
  IncidentsModule,
  ObservationsModule,
  GatePassesModule,
  InspectionsModule,
  AuditsModule,
  UserManagementModule,
  PasswordResetModule,
  ContractorsModule,
  VideoInductionModule,
} from '@/components/action-center';
import { NotificationPipelineStatus } from '@/components/action-center/NotificationPipelineStatus';

export default function ActionCenter() {
  const { t } = useTranslation();
  const { profile, isAdmin } = useAuth();
  const { hasModule } = useModuleAccess();
  const { hasRole, hasRoleInCategory } = useUserRoles();
  const { data: stats, isLoading } = useActionCenterStats();

  // Module access checks
  const hasHSSEAccess = hasModule('hsse_core') || hasModule('incidents');
  const hasSecurityAccess = hasModule('security');
  const hasInspectionsAccess = hasModule('audits') || hasModule('hsse_core');
  const hasContractorAccess = hasModule('hsse_core') || hasModule('security');

  // Role-based visibility - isAdmin comes from useAuth() context
  const isHSSERole = hasRoleInCategory('hsse');
  const isSecurityRole = hasRole('security_guard') || hasRole('security_supervisor') || hasRole('security_manager');
  const isInspectorRole = hasRole('inspector') || hasRole('auditor') || hasRole('hsse_expert');
  const isContractorRole = hasRoleInCategory('contractor');
  const isManager = hasRole('manager') || hasRole('department_representative');

  // Determine which modules to show
  const showIncidents = hasHSSEAccess || isHSSERole || isManager;
  const showObservations = hasHSSEAccess || isHSSERole || isManager;
  const showGatePasses = true; // All employees can create gate passes
  const showInspections = hasInspectionsAccess || isInspectorRole;
  const showAudits = hasInspectionsAccess || isInspectorRole;
  const showUsers = isAdmin;
  const showPasswordReset = isAdmin;
  const showContractors = hasContractorAccess || isContractorRole || isAdmin || isSecurityRole;
  const showVideoInduction = hasContractorAccess || isContractorRole || isAdmin;

  // Group modules into sections
  const hasOperationsSection = showIncidents || showObservations;
  const hasAccessSection = showGatePasses;
  const hasComplianceSection = showInspections || showAudits;
  const hasWorkforceSection = showContractors || showVideoInduction;
  const hasAdminSection = showUsers || showPasswordReset;

  return (
    <EnterprisePage
      title={t('actionCenter.title', 'Action Center')}
      description={t('actionCenter.description', 'Unified operational hub — execute tasks across all modules from one place')}
      titleIcon={Zap}
    >
      {/* Cross-Module KPI Summary */}
      <section className="space-y-3">
        <SectionHeader
          title={t('actionCenter.overview', 'Overview')}
          description={t('actionCenter.overviewDesc', 'Cross-module summary of items requiring attention')}
        />
        <ActionCenterStatsBar stats={stats} isLoading={isLoading} />
        {/* Notification delivery status — admin only */}
        {isAdmin && <NotificationPipelineStatus />}
      </section>

      {/* Operations Section: Incidents & Observations */}
      {hasOperationsSection && (
        <section className="space-y-3">
          <SectionHeader
            title={t('actionCenter.sections.operations', 'Operations')}
            description={t('actionCenter.sections.operationsDesc', 'Incident and observation management')}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {showIncidents && (
              isLoading ? <ModuleCardSkeleton /> : stats && <IncidentsModule stats={stats.incidents} />
            )}
            {showObservations && (
              isLoading ? <ModuleCardSkeleton /> : stats && <ObservationsModule stats={stats.observations} />
            )}
          </div>
        </section>
      )}

      {/* Access Control Section: Gate Passes */}
      {hasAccessSection && (
        <section className="space-y-3">
          <SectionHeader
            title={t('actionCenter.sections.accessControl', 'Access Control')}
            description={t('actionCenter.sections.accessControlDesc', 'Gate passes and access management')}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {showGatePasses && (
              isLoading ? <ModuleCardSkeleton /> : stats && <GatePassesModule stats={stats.gatePasses} />
            )}
          </div>
        </section>
      )}

      {/* Compliance Section: Inspections & Audits */}
      {hasComplianceSection && (
        <section className="space-y-3">
          <SectionHeader
            title={t('actionCenter.sections.compliance', 'Compliance & Quality')}
            description={t('actionCenter.sections.complianceDesc', 'Inspections, audits, and compliance tracking')}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {showInspections && (
              isLoading ? <ModuleCardSkeleton /> : stats && <InspectionsModule stats={stats.inspections} />
            )}
            {showAudits && (
              isLoading ? <ModuleCardSkeleton /> : stats && <AuditsModule stats={stats.audits} />
            )}
          </div>
        </section>
      )}

      {/* Workforce Section: Contractors & Inductions */}
      {hasWorkforceSection && (
        <section className="space-y-3">
          <SectionHeader
            title={t('actionCenter.sections.workforce', 'Workforce & Contractors')}
            description={t('actionCenter.sections.workforceDesc', 'Contractor management and compliance')}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {showContractors && (
              isLoading ? <ModuleCardSkeleton /> : stats && <ContractorsModule stats={stats.contractors} />
            )}
            {showVideoInduction && (
              isLoading ? <ModuleCardSkeleton /> : stats && <VideoInductionModule stats={stats.videoInductions} />
            )}
          </div>
        </section>
      )}

      {/* Administration Section: Users & Password Reset */}
      {hasAdminSection && (
        <section className="space-y-3">
          <SectionHeader
            title={t('actionCenter.sections.administration', 'Administration')}
            description={t('actionCenter.sections.administrationDesc', 'User management and security')}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {showUsers && (
              isLoading ? <ModuleCardSkeleton /> : stats && <UserManagementModule stats={stats.users} />
            )}
            {showPasswordReset && <PasswordResetModule />}
          </div>
        </section>
      )}
    </EnterprisePage>
  );
}

function ModuleCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-14 rounded-md" />
        ))}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-8 w-28 rounded-md" />
        ))}
      </div>
    </div>
  );
}
