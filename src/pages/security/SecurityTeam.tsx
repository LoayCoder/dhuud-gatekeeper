import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Search, Filter, Pencil, UserCheck, UserX, Shield, Phone, MapPin, Briefcase } from 'lucide-react';
import { useSecurityTeam, useUpdateSecurityTeamMember, type SecurityTeamMember } from '@/hooks/use-security-team';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function SecurityTeam() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingMember, setEditingMember] = useState<SecurityTeamMember | null>(null);
  const [editForm, setEditForm] = useState({ is_active: true, job_title: '' });

  const { data: teamMembers, isLoading } = useSecurityTeam({
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
  });
  const updateMember = useUpdateSecurityTeamMember();

  // Fetch sites for assignment
  const { data: sites } = useQuery({
    queryKey: ['sites-list'],
    queryFn: async () => {
      const { data } = await supabase.from('sites').select('id, name').is('deleted_at', null).order('name');
      return data || [];
    },
  });

  const filteredMembers = teamMembers?.filter(m =>
    !searchQuery || 
    m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const activeCount = teamMembers?.filter(m => m.is_active).length || 0;
  const totalCount = teamMembers?.length || 0;

  const handleEditClick = (member: SecurityTeamMember) => {
    setEditingMember(member);
    setEditForm({
      is_active: member.is_active ?? true,
      job_title: member.job_title || '',
    });
  };

  const handleEditSubmit = async () => {
    if (!editingMember) return;
    await updateMember.mutateAsync({
      id: editingMember.id,
      ...editForm,
    });
    setEditingMember(null);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'security_supervisor': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return t('security.team.roles.admin', 'Admin');
      case 'security_supervisor': return t('security.team.roles.supervisor', 'Supervisor');
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
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <UserCheck className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">{t('security.team.activeMembers', 'Active Members')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-muted">
                <UserX className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount - activeCount}</p>
                <p className="text-sm text-muted-foreground">{t('security.team.inactiveMembers', 'Inactive Members')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('security.team.teamList', 'Team Members')}
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('common.search', 'Search...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-10 w-[200px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 me-2" />
                  <SelectValue />
                </SelectTrigger>
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
            <div className="animate-pulse space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded" />)}
            </div>
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
                  <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map(member => (
                  <TableRow key={member.id} className={!member.is_active ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>{member.full_name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.full_name || t('common.unnamed', 'Unnamed')}</p>
                          {member.job_title && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {member.job_title}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{member.employee_id || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {getRoleLabel(member.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.phone_number ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {member.phone_number}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {member.sites?.name ? (
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {member.sites.name}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.is_active ? 'default' : 'secondary'}>
                        {member.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(member)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && !filteredMembers.length && (
            <div className="flex flex-col items-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('security.team.noMembers', 'No team members found')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('security.team.editMember', 'Edit Team Member')}</DialogTitle>
            <DialogDescription>
              {editingMember?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('security.team.jobTitle', 'Job Title')}</Label>
              <Input
                value={editForm.job_title}
                onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                placeholder={t('security.team.jobTitlePlaceholder', 'e.g., Security Guard')}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('common.active', 'Active')}</Label>
              <Switch
                checked={editForm.is_active}
                onCheckedChange={(c) => setEditForm({ ...editForm, is_active: c })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingMember(null)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button onClick={handleEditSubmit} disabled={updateMember.isPending}>
                {t('common.save', 'Save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
