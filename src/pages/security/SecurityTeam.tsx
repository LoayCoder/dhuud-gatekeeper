import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Search, Filter, Shield, Phone, MapPin, Briefcase, Plus, Network, Crown, Eye, UsersRound } from 'lucide-react';
import { useSecurityTeam } from '@/hooks/use-security-team';
import { GuardRegistrationForm } from '@/components/security/GuardRegistrationForm';
import { TeamHierarchyView } from '@/components/security/TeamHierarchyView';
import { TeamsTab } from '@/components/security/TeamsTab';

export default function SecurityTeam() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddGuard, setShowAddGuard] = useState(false);

  const { data: teamMembers, isLoading } = useSecurityTeam({
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
  });

  // Apply filters
  const filteredMembers = teamMembers?.filter(m => {
    const matchesSearch = !searchQuery || 
      m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];

  // Calculate stats by role
  const managersCount = teamMembers?.filter(m => m.role === 'security_manager').length || 0;
  const supervisorsCount = teamMembers?.filter(m => m.role === 'security_supervisor').length || 0;
  const shiftLeadersCount = teamMembers?.filter(m => m.role === 'security_shift_leader').length || 0;
  const guardsCount = teamMembers?.filter(m => m.role === 'security_guard').length || 0;
  const activeCount = teamMembers?.filter(m => m.is_active).length || 0;
  const totalCount = teamMembers?.length || 0;


  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'security_manager': return 'default';
      case 'security_supervisor': return 'secondary';
      case 'security_shift_leader': return 'secondary';
      case 'security_guard': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'security_manager': return t('security.team.roles.manager', 'Manager');
      case 'security_supervisor': return t('security.team.roles.supervisor', 'Supervisor');
      case 'security_shift_leader': return t('security.team.roles.shiftLeader', 'Shift Leader');
      case 'security_guard': return t('security.team.roles.guard', 'Guard');
      default: return t('security.team.roles.member', 'Member');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('security.team.title', 'Security Team')}</h1>
          <p className="text-muted-foreground">{t('security.team.description', 'Manage security personnel and assignments')}</p>
        </div>
        <Button onClick={() => setShowAddGuard(true)}>
          <Plus className="h-4 w-4 me-2" />
          {t('security.guards.addGuard', 'Add Guard')}
        </Button>
      </div>

      {/* Stats Cards - Role-based */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setRoleFilter('all')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-muted-foreground">{t('security.team.totalMembers', 'Total Members')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-blue-500/50 transition-colors" onClick={() => setRoleFilter('security_manager')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Crown className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{managersCount}</p>
                <p className="text-sm text-muted-foreground">{t('security.team.managers', 'Managers')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-purple-500/50 transition-colors" onClick={() => setRoleFilter('security_supervisor')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <Eye className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{supervisorsCount}</p>
                <p className="text-sm text-muted-foreground">{t('security.team.supervisors', 'Supervisors')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-orange-500/50 transition-colors" onClick={() => setRoleFilter('security_shift_leader')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <Users className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{shiftLeadersCount}</p>
                <p className="text-sm text-muted-foreground">{t('security.team.shiftLeaders', 'Shift Leaders')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-500/50 transition-colors" onClick={() => setRoleFilter('security_guard')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Shield className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{guardsCount}</p>
                <p className="text-sm text-muted-foreground">{t('security.team.guards', 'Guards')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for List vs Hierarchy vs Teams */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <Users className="h-4 w-4" />
            {t('security.team.teamList', 'Team List')}
          </TabsTrigger>
          <TabsTrigger value="hierarchy" className="gap-2">
            <Network className="h-4 w-4" />
            {t('security.team.hierarchy', 'Hierarchy')}
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-2">
            <UsersRound className="h-4 w-4" />
            {t('security.teams', 'Teams')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t('security.team.teamList', 'Team Members')}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={t('common.search', 'Search...')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-10 w-[200px]" />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[160px]"><Shield className="h-4 w-4 me-2" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('security.team.allRoles', 'All Roles')}</SelectItem>
                      <SelectItem value="security_manager">{t('security.team.roles.manager', 'Manager')}</SelectItem>
                      <SelectItem value="security_supervisor">{t('security.team.roles.supervisor', 'Supervisor')}</SelectItem>
                      <SelectItem value="security_shift_leader">{t('security.team.roles.shiftLeader', 'Shift Leader')}</SelectItem>
                      <SelectItem value="security_guard">{t('security.team.roles.guard', 'Guard')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]"><Filter className="h-4 w-4 me-2" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                      <SelectItem value="active">{t('common.active', 'Active')}</SelectItem>
                      <SelectItem value="inactive">{t('common.inactive', 'Inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              
              {isLoading ? (
                <div className="animate-pulse space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('security.team.member', 'Member')}</TableHead>
                      <TableHead>{t('security.team.employeeId', 'Employee ID')}</TableHead>
                      <TableHead>{t('security.team.role', 'Role')}</TableHead>
                      <TableHead>{t('security.team.contact', 'Contact')}</TableHead>
                      <TableHead>{t('security.team.site', 'Site')}</TableHead>
                      <TableHead>{t('common.status', 'Status')}</TableHead>
                      
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map(member => (
                      <TableRow key={member.id} className={!member.is_active ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10"><AvatarImage src={member.avatar_url || undefined} /><AvatarFallback>{member.full_name?.charAt(0) || '?'}</AvatarFallback></Avatar>
                            <div>
                              <p className="font-medium">{member.full_name || t('common.unnamed', 'Unnamed')}</p>
                              {member.job_title && <p className="text-xs text-muted-foreground flex items-center gap-1"><Briefcase className="h-3 w-3" />{member.job_title}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{member.employee_id || '-'}</TableCell>
                        <TableCell><Badge variant={getRoleBadgeVariant(member.role)}>{getRoleLabel(member.role)}</Badge></TableCell>
                        <TableCell>{member.phone_number ? <span className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{member.phone_number}</span> : '-'}</TableCell>
                        <TableCell>{member.sites?.name ? <span className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3" />{member.sites.name}</span> : '-'}</TableCell>
                        <TableCell><Badge variant={member.is_active ? 'default' : 'secondary'}>{member.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {!isLoading && !filteredMembers.length && (
                <div className="flex flex-col items-center py-12"><Users className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">{t('security.team.noMembers', 'No team members found')}</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy">
          <TeamHierarchyView />
        </TabsContent>

        <TabsContent value="teams">
          <TeamsTab />
        </TabsContent>
      </Tabs>

      {/* Add Guard Dialog */}
      <Dialog open={showAddGuard} onOpenChange={setShowAddGuard}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{t('security.guards.registration', 'Guard Registration')}</DialogTitle>
            <DialogDescription>{t('security.guards.registrationDesc', 'Register a new security guard')}</DialogDescription>
          </DialogHeader>
          <GuardRegistrationForm onSuccess={() => setShowAddGuard(false)} onCancel={() => setShowAddGuard(false)} />
        </DialogContent>
      </Dialog>

    </div>
  );
}
