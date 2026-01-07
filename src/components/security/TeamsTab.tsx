import { useTranslation } from 'react-i18next';
import { Loader2, Users } from 'lucide-react';
import { useSecurityTeams } from '@/hooks/use-security-teams';
import { TeamCard } from './TeamCard';
import { TeamFormationPanel } from './TeamFormationPanel';

export function TeamsTab() {
  const { t } = useTranslation();
  const { data: teams, isLoading, error } = useSecurityTeams();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{t('common.errorLoadingData')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('security.securityTeams')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('security.teamsDescription')}
          </p>
        </div>
        <TeamFormationPanel />
      </div>

      {/* Teams Grid */}
      {teams && teams.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="text-lg font-medium mb-2">{t('security.noTeamsYet')}</h4>
          <p className="text-sm text-muted-foreground mb-4">
            {t('security.createFirstTeam')}
          </p>
          <TeamFormationPanel />
        </div>
      )}
    </div>
  );
}
