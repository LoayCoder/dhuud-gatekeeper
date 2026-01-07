import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Users, Shield, User, ChevronDown, Phone, Mail, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  email: string | null;
  is_active: boolean;
  role: string;
  assigned_site_id: string | null;
  sites?: { name: string } | null;
}

interface SupervisorGroup {
  supervisor: TeamMember;
  guards: TeamMember[];
}

export function TeamHierarchyView() {
  const { t } = useTranslation();

  // Get current user's role and info
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-with-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id, full_name')
        .eq('id', user.id)
        .single();

      const { data: isAdmin } = await supabase.rpc('is_admin');

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const userRoles = roles?.map(r => r.role) || [];
      const isManager = isAdmin || userRoles.includes('security_manager');
      const isSupervisor = userRoles.includes('security_supervisor');

      return {
        ...profile,
        isManager,
        isSupervisor,
        isGuard: userRoles.includes('security_guard'),
      };
    },
  });

  // Fetch team hierarchy based on roster
  const { data: hierarchy, isLoading } = useQuery({
    queryKey: ['security-team-hierarchy', currentUser?.tenant_id],
    queryFn: async () => {
      if (!currentUser?.tenant_id) return { managers: [], supervisorGroups: [] };

      // Get all security team members
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['security_manager', 'security_supervisor', 'security_guard']);

      if (!roles?.length) return { managers: [], supervisorGroups: [] };

      const userIds = roles.map(r => r.user_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone_number, email, is_active, assigned_site_id, sites(name)')
        .eq('tenant_id', currentUser.tenant_id)
        .in('id', userIds)
        .is('deleted_at', null);

      // Get roster to determine supervisor-guard relationships
      const { data: roster } = await supabase
        .from('shift_roster')
        .select('guard_id, supervisor_id')
        .is('deleted_at', null);

      // Build team members with roles
      const members: TeamMember[] = (profiles || []).map(p => ({
        ...p,
        role: roles.find(r => r.user_id === p.id)?.role || 'user',
      }));

      // Categorize members
      const managers = members.filter(m => m.role === 'security_manager');
      const supervisors = members.filter(m => m.role === 'security_supervisor');
      const guards = members.filter(m => m.role === 'security_guard');

      // Group guards by supervisor from roster
      const supervisorGroups: SupervisorGroup[] = supervisors.map(sup => {
        const assignedGuardIds = roster
          ?.filter(r => r.supervisor_id === sup.id)
          .map(r => r.guard_id) || [];
        const assignedGuards = guards.filter(g => assignedGuardIds.includes(g.id));
        return { supervisor: sup, guards: assignedGuards };
      });

      // Guards without supervisor assignment
      const assignedGuardIds = roster?.map(r => r.guard_id) || [];
      const unassignedGuards = guards.filter(g => !assignedGuardIds.includes(g.id));
      if (unassignedGuards.length > 0) {
        supervisorGroups.push({
          supervisor: {
            id: 'unassigned',
            full_name: t('security.team.unassigned', 'Unassigned'),
            avatar_url: null,
            phone_number: null,
            email: null,
            is_active: true,
            role: 'placeholder',
            assigned_site_id: null,
          },
          guards: unassignedGuards,
        });
      }

      return { managers, supervisorGroups };
    },
    enabled: !!currentUser?.tenant_id,
  });

  // Apply visibility rules
  const visibleData = useMemo(() => {
    if (!hierarchy || !currentUser) return { managers: [], supervisorGroups: [] };

    // Manager sees everything
    if (currentUser.isManager) return hierarchy;

    // Supervisor sees only their team
    if (currentUser.isSupervisor) {
      return {
        managers: [],
        supervisorGroups: hierarchy.supervisorGroups.filter(
          sg => sg.supervisor.id === currentUser.id
        ),
      };
    }

    // Guard sees only themselves
    if (currentUser.isGuard) {
      const myGroup = hierarchy.supervisorGroups.find(sg =>
        sg.guards.some(g => g.id === currentUser.id)
      );
      if (myGroup) {
        return {
          managers: [],
          supervisorGroups: [{
            supervisor: myGroup.supervisor,
            guards: myGroup.guards.filter(g => g.id === currentUser.id),
          }],
        };
      }
    }

    return { managers: [], supervisorGroups: [] };
  }, [hierarchy, currentUser]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'security_manager':
        return <Badge className="bg-blue-500">{t('security.team.roles.manager', 'Manager')}</Badge>;
      case 'security_supervisor':
        return <Badge className="bg-purple-500">{t('security.team.roles.supervisor', 'Supervisor')}</Badge>;
      case 'security_guard':
        return <Badge variant="secondary">{t('security.team.roles.guard', 'Guard')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {currentUser?.isManager 
            ? t('security.team.allTeams', 'All Teams')
            : t('security.team.myTeam', 'My Team')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Managers */}
        {visibleData.managers.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t('security.team.managers', 'Security Managers')}
            </h4>
            <div className="grid gap-2">
              {visibleData.managers.map(manager => (
                <MemberCard key={manager.id} member={manager} getRoleBadge={getRoleBadge} />
              ))}
            </div>
          </div>
        )}

        {/* Supervisor Groups */}
        {visibleData.supervisorGroups.map(group => (
          <Collapsible key={group.supervisor.id} defaultOpen className="space-y-2">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={group.supervisor.avatar_url || undefined} />
                    <AvatarFallback>
                      {group.supervisor.id === 'unassigned' ? '?' : group.supervisor.full_name?.charAt(0) || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-start">
                    <p className="font-medium">{group.supervisor.full_name}</p>
                    {group.supervisor.id !== 'unassigned' && (
                      <p className="text-xs text-muted-foreground">
                        {t('security.team.supervisor', 'Supervisor')} • {group.guards.length} {t('security.team.guards', 'guards')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {group.supervisor.id !== 'unassigned' && getRoleBadge('security_supervisor')}
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ms-6 ps-4 border-s-2 border-muted space-y-2">
                {group.guards.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    {t('security.team.noGuardsAssigned', 'No guards assigned')}
                  </p>
                ) : (
                  group.guards.map(guard => (
                    <MemberCard key={guard.id} member={guard} getRoleBadge={getRoleBadge} compact />
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}

        {visibleData.managers.length === 0 && visibleData.supervisorGroups.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t('security.team.noTeamData', 'No team data available')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MemberCard({ 
  member, 
  getRoleBadge,
  compact = false 
}: { 
  member: TeamMember; 
  getRoleBadge: (role: string) => React.ReactNode;
  compact?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-lg border',
      !member.is_active && 'opacity-60'
    )}>
      <div className="flex items-center gap-3">
        <Avatar className={compact ? 'h-8 w-8' : 'h-10 w-10'}>
          <AvatarImage src={member.avatar_url || undefined} />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div>
          <p className={cn('font-medium', compact && 'text-sm')}>{member.full_name}</p>
          {!compact && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {member.phone_number && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {member.phone_number}
                </span>
              )}
              {member.sites?.name && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {member.sites.name}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {getRoleBadge(member.role)}
        <Badge variant={member.is_active ? 'outline' : 'secondary'}>
          {member.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
        </Badge>
      </div>
    </div>
  );
}
