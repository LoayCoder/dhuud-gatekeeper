import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil, Plus, LogIn, LogOut, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { UserFormDialog } from "@/components/users/UserFormDialog";
import { LicensedUserQuotaCard } from "@/components/billing/LicensedUserQuotaCard";
import { useLicensedUserQuota } from "@/hooks/use-licensed-user-quota";
import { getUserTypeLabel, getContractorType } from "@/lib/license-utils";
import { useAdminAuditLog, detectUserChanges } from "@/hooks/use-admin-audit-log";
import { RoleBadge } from "@/components/roles/RoleBadge";
import { ManagerTeamViewer } from "@/components/hierarchy/ManagerTeamViewer";
import { useUserRoles, Role } from "@/hooks/use-user-roles";

interface UserProfile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  assigned_branch_id: string | null;
  assigned_division_id: string | null;
  assigned_department_id: string | null;
  assigned_section_id: string | null;
  user_type: string | null;
  has_login: boolean | null;
  is_active: boolean | null;
  is_deleted: boolean | null;
  employee_id: string | null;
  job_title: string | null;
  contractor_company_name: string | null;
  contract_start: string | null;
  contract_end: string | null;
  membership_id: string | null;
  membership_start: string | null;
  membership_end: string | null;
  branches?: { name: string } | null;
  divisions?: { name: string } | null;
  departments?: { name: string } | null;
  sections?: { name: string } | null;
}

interface UserWithRole extends UserProfile {
  role?: string;
  userRoles?: { role_id: string; role_code: string; role_name: string; category: string }[];
}

interface HierarchyItem {
  id: string;
  name: string;
}

const RTL_LANGUAGES = ['ar', 'ur'];

export default function UserManagement() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const isRTL = RTL_LANGUAGES.includes(i18n.language);
  const direction = isRTL ? 'rtl' : 'ltr';
  const textAlign = isRTL ? 'text-right' : 'text-left';
  
  const [branches, setBranches] = useState<HierarchyItem[]>([]);
  const [divisions, setDivisions] = useState<HierarchyItem[]>([]);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);

  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { quota, breakdown, isLoading: quotaLoading, refetch: refetchQuota } = useLicensedUserQuota();
  const { logUserCreated, logUserUpdated, logUserDeactivated, logUserActivated } = useAdminAuditLog();
  const { roles } = useUserRoles();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id, full_name, phone_number, assigned_branch_id, assigned_division_id,
          assigned_department_id, assigned_section_id, user_type, has_login, is_active,
          is_deleted, employee_id, job_title, contractor_company_name, contract_start,
          contract_end, membership_id, membership_start, membership_end,
          branches:assigned_branch_id(name), divisions:assigned_division_id(name),
          departments:assigned_department_id(name), sections:assigned_section_id(name)
        `)
        .or('is_deleted.is.null,is_deleted.eq.false');

      if (profilesError) throw profilesError;

      const { data: rolesData } = await supabase.from('user_roles').select('user_id, role');
      
      // Fetch new role assignments
      const { data: roleAssignments } = await supabase
        .from('user_role_assignments')
        .select('user_id, role_id, roles(code, name, category)');

      const usersWithRoles = (profilesData || []).map(p => {
        const userRoleAssignments = (roleAssignments || [])
          .filter((ra: any) => ra.user_id === p.id)
          .map((ra: any) => ({
            role_id: ra.role_id,
            role_code: ra.roles?.code || '',
            role_name: ra.roles?.name || '',
            category: ra.roles?.category || 'general',
          }));

        return {
          ...p,
          role: rolesData?.find(r => r.user_id === p.id)?.role || 'user',
          userRoles: userRoleAssignments,
        };
      }) as UserWithRole[];

      setUsers(usersWithRoles);

      const [b, d] = await Promise.all([
        supabase.from('branches').select('id, name'),
        supabase.from('divisions').select('id, name'),
      ]);

      if (b.data) setBranches(b.data);
      if (d.data) setDivisions(d.data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('userManagement.errorFetching'), description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (userTypeFilter !== 'all' && user.user_type !== userTypeFilter) return false;
      if (statusFilter === 'active' && !user.is_active) return false;
      if (statusFilter === 'inactive' && user.is_active) return false;
      if (branchFilter !== 'all' && user.assigned_branch_id !== branchFilter) return false;
      if (divisionFilter !== 'all' && user.assigned_division_id !== divisionFilter) return false;
      if (roleFilter !== 'all') {
        const hasRole = user.userRoles?.some(r => r.role_code === roleFilter);
        if (!hasRole) return false;
      }
      return true;
    });
  }, [users, userTypeFilter, statusFilter, branchFilter, divisionFilter, roleFilter]);

  const handleAddUser = () => { setEditingUser(null); setIsFormDialogOpen(true); };
  const handleEditUser = (user: UserWithRole) => { setEditingUser(user); setIsFormDialogOpen(true); };

  const handleSaveUser = async (data: any) => {
    const updateData = {
      full_name: data.full_name,
      phone_number: data.phone_number,
      user_type: data.user_type,
      has_login: data.has_login,
      is_active: data.is_active,
      employee_id: data.employee_id || null,
      job_title: data.job_title || null,
      contractor_company_name: data.contractor_company_name || null,
      contractor_type: getContractorType(data.user_type),
      contract_start: data.contract_start || null,
      contract_end: data.contract_end || null,
      membership_id: data.membership_id || null,
      membership_start: data.membership_start || null,
      membership_end: data.membership_end || null,
      assigned_branch_id: data.assigned_branch_id,
      assigned_division_id: data.assigned_division_id,
      assigned_department_id: data.assigned_department_id,
      assigned_section_id: data.assigned_section_id,
    };

    if (editingUser) {
      // Detect changes for audit logging
      const changes = detectUserChanges(editingUser as unknown as Record<string, unknown>, updateData);
      
      // Check for status change
      const wasActive = editingUser.is_active;
      const isNowActive = data.is_active;
      
      const { error } = await supabase.from('profiles').update(updateData).eq('id', editingUser.id);
      if (error) throw error;
      
      // Log appropriate audit events
      if (wasActive && !isNowActive) {
        await logUserDeactivated(editingUser.id, data.full_name);
      } else if (!wasActive && isNowActive) {
        await logUserActivated(editingUser.id, data.full_name);
      }
      
      if (Object.keys(changes).length > 0) {
        await logUserUpdated(editingUser.id, data.full_name, changes);
      }
      
      toast({ title: t('userManagement.userUpdated') });
    } else {
      const newUserId = crypto.randomUUID();
      const { error } = await supabase.from('profiles').insert({
        id: newUserId,
        tenant_id: profile?.tenant_id,
        ...updateData,
      });
      if (error) throw error;
      
      // Log user creation
      await logUserCreated(newUserId, data.full_name, data.user_type);
      
      toast({ title: t('userManagement.userCreated') });
    }
    fetchData();
    refetchQuota();
  };

  const getUserTypeBadgeVariant = (userType: string | null) => {
    switch (userType) {
      case 'employee': return 'default';
      case 'contractor_longterm': case 'member': return 'secondary';
      default: return 'outline';
    }
  };

  const hierarchyArrow = isRTL ? '←' : '↳';

  return (
    <div className="container py-8 space-y-6" dir={direction}>
      <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div className={`flex flex-col gap-1 ${isRTL ? 'items-end' : 'items-start'}`}>
          <h1 className={`text-3xl font-bold tracking-tight ${textAlign}`}>{t('userManagement.title')}</h1>
          <p className={`text-muted-foreground ${textAlign}`}>{t('userManagement.description')}</p>
        </div>
        <Button onClick={handleAddUser} className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Plus className="h-4 w-4" />
          {t('userManagement.addUser')}
        </Button>
      </div>

      <LicensedUserQuotaCard quota={quota} breakdown={breakdown} isLoading={quotaLoading} showUpgradeCta={true} />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className={`text-lg ${textAlign}`}>{t('userManagement.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`space-y-2 ${textAlign}`}>
              <label className="text-sm font-medium">{t('userManagement.filterByType')}</label>
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter} dir={direction}>
                <SelectTrigger className={textAlign}><SelectValue /></SelectTrigger>
                <SelectContent dir={direction} className="bg-background">
                  <SelectItem value="all">{t('userManagement.allTypes')}</SelectItem>
                  <SelectItem value="employee">{t('userTypes.employee')}</SelectItem>
                  <SelectItem value="contractor_longterm">{t('userTypes.contractorLongterm')}</SelectItem>
                  <SelectItem value="contractor_shortterm">{t('userTypes.contractorShortterm')}</SelectItem>
                  <SelectItem value="member">{t('userTypes.member')}</SelectItem>
                  <SelectItem value="visitor">{t('userTypes.visitor')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={`space-y-2 ${textAlign}`}>
              <label className="text-sm font-medium">{t('userManagement.filterByStatus')}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter} dir={direction}>
                <SelectTrigger className={textAlign}><SelectValue /></SelectTrigger>
                <SelectContent dir={direction} className="bg-background">
                  <SelectItem value="all">{t('userManagement.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('userManagement.active')}</SelectItem>
                  <SelectItem value="inactive">{t('userManagement.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={`space-y-2 ${textAlign}`}>
              <label className="text-sm font-medium">{t('userManagement.filterByBranch')}</label>
              <Select value={branchFilter} onValueChange={setBranchFilter} dir={direction}>
                <SelectTrigger className={textAlign}><SelectValue /></SelectTrigger>
                <SelectContent dir={direction} className="bg-background">
                  <SelectItem value="all">{t('userManagement.allBranches')}</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className={`space-y-2 ${textAlign}`}>
              <label className="text-sm font-medium">{t('userManagement.filterByDivision')}</label>
              <Select value={divisionFilter} onValueChange={setDivisionFilter} dir={direction}>
                <SelectTrigger className={textAlign}><SelectValue /></SelectTrigger>
                <SelectContent dir={direction} className="bg-background">
                  <SelectItem value="all">{t('userManagement.allDivisions')}</SelectItem>
                  {divisions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={textAlign}>{t('profile.fullName')}</TableHead>
                  <TableHead className={textAlign}>{t('userManagement.userType')}</TableHead>
                  <TableHead className={textAlign}>{t('userManagement.status')}</TableHead>
                  <TableHead className={textAlign}>{t('userManagement.login')}</TableHead>
                  <TableHead className={textAlign}>{t('orgStructure.branch')}</TableHead>
                  <TableHead className={textAlign}>{t('userManagement.hierarchy')}</TableHead>
                  <TableHead className={textAlign}>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className={`font-medium ${textAlign}`}>
                        <div className="flex flex-col">
                          <span>{user.full_name || '-'}</span>
                          {user.employee_id && (
                            <span className="text-xs text-muted-foreground">#{user.employee_id}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={textAlign}>
                        <Badge variant={getUserTypeBadgeVariant(user.user_type)}>
                          {user.user_type ? t(getUserTypeLabel(user.user_type)) : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className={textAlign}>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? t('userManagement.active') : t('userManagement.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className={textAlign}>
                        {user.has_login ? (
                          <LogIn className="h-4 w-4 text-primary" />
                        ) : (
                          <LogOut className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className={textAlign}>
                        {user.branches?.name || '-'}
                      </TableCell>
                      <TableCell className={`text-sm ${textAlign}`}>
                        {user.divisions?.name && (
                          <span>{user.divisions.name}</span>
                        )}
                        {user.departments?.name && (
                          <span className="text-muted-foreground"> {hierarchyArrow} {user.departments.name}</span>
                        )}
                        {user.sections?.name && (
                          <span className="text-muted-foreground"> {hierarchyArrow} {user.sections.name}</span>
                        )}
                        {!user.divisions?.name && !user.departments?.name && !user.sections?.name && '-'}
                      </TableCell>
                      <TableCell className={textAlign}>
                        <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        user={editingUser}
        onSave={handleSaveUser}
      />
    </div>
  );
}
