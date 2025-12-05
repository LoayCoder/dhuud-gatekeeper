import { useEffect, useState, useCallback } from "react";
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
import { Loader2, Pencil, Plus, LogIn, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { UserFormDialog } from "@/components/users/UserFormDialog";
import { LicensedUserQuotaCard } from "@/components/billing/LicensedUserQuotaCard";
import { useLicensedUserQuota } from "@/hooks/use-licensed-user-quota";
import { getUserTypeLabel, getContractorType } from "@/lib/license-utils";
import { useAdminAuditLog, detectUserChanges } from "@/hooks/use-admin-audit-log";
import { ManagerTeamViewer } from "@/components/hierarchy/ManagerTeamViewer";
import { useUserRoles, RoleCategory } from "@/hooks/use-user-roles";
import { RoleBadge } from "@/components/roles/RoleBadge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useUsersPaginated, UserWithRoles, UseUsersPaginatedFilters } from "@/hooks/use-users-paginated";

interface HierarchyItem {
  id: string;
  name: string;
}

export default function UserManagement() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const direction = i18n.dir();
  
  const [branches, setBranches] = useState<HierarchyItem[]>([]);
  const [divisions, setDivisions] = useState<HierarchyItem[]>([]);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);

  // Filters
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { quota, breakdown, isLoading: quotaLoading, refetch: refetchQuota } = useLicensedUserQuota();
  const { logUserCreated, logUserUpdated, logUserDeactivated, logUserActivated } = useAdminAuditLog();
  const { roles } = useUserRoles();

  // Build filters object for the hook
  const filters: UseUsersPaginatedFilters = {
    userType: userTypeFilter !== 'all' ? userTypeFilter : null,
    isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : null,
    branchId: branchFilter !== 'all' ? branchFilter : null,
    divisionId: divisionFilter !== 'all' ? divisionFilter : null,
    roleCode: roleFilter !== 'all' ? roleFilter : null,
  };

  // Use the optimized server-side paginated query
  const {
    users,
    isLoading: loading,
    page,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    goToPage,
    refetch: refetchUsers,
    resetPage,
  } = useUsersPaginated({ filters, pageSize: 25 });

  // Reset to page 1 when filters change
  useEffect(() => {
    resetPage();
  }, [userTypeFilter, statusFilter, branchFilter, divisionFilter, roleFilter, resetPage]);

  // Fetch branches and divisions for filters (one-time)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      const [b, d] = await Promise.all([
        supabase.from('branches').select('id, name').order('name').limit(100),
        supabase.from('divisions').select('id, name').order('name').limit(100),
      ]);
      if (b.data) setBranches(b.data);
      if (d.data) setDivisions(d.data);
    };
    fetchFilterOptions();
  }, []);

  const handleAddUser = () => { setEditingUser(null); setIsFormDialogOpen(true); };
  const handleEditUser = (user: UserWithRoles) => { setEditingUser(user); setIsFormDialogOpen(true); };

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
    refetchUsers();
    refetchQuota();
  };

  const getUserTypeBadgeVariant = (userType: string | null) => {
    switch (userType) {
      case 'employee': return 'default';
      case 'contractor_longterm': case 'member': return 'secondary';
      default: return 'outline';
    }
  };

  const hierarchyArrow = direction === 'rtl' ? '←' : '↳';

  return (
    <div className="container py-8 space-y-6" dir={direction}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1 text-start">
          <h1 className="text-3xl font-bold tracking-tight">{t('userManagement.title')}</h1>
          <p className="text-muted-foreground">{t('userManagement.description')}</p>
        </div>
        <Button onClick={handleAddUser} className="gap-2">
          <Plus className="h-4 w-4 rtl:order-last" />
          {t('userManagement.addUser')}
        </Button>
      </div>

      <LicensedUserQuotaCard quota={quota} breakdown={breakdown} isLoading={quotaLoading} showUpgradeCta={true} />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-start">{t('userManagement.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2 text-start">
              <label className="text-sm font-medium">{t('userManagement.filterByType')}</label>
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter} dir={direction}>
                <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
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

            <div className="space-y-2 text-start">
              <label className="text-sm font-medium">{t('userManagement.filterByStatus')}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter} dir={direction}>
                <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
                <SelectContent dir={direction} className="bg-background">
                  <SelectItem value="all">{t('userManagement.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('userManagement.active')}</SelectItem>
                  <SelectItem value="inactive">{t('userManagement.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-start">
              <label className="text-sm font-medium">{t('userManagement.filterByBranch')}</label>
              <Select value={branchFilter} onValueChange={setBranchFilter} dir={direction}>
                <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
                <SelectContent dir={direction} className="bg-background">
                  <SelectItem value="all">{t('userManagement.allBranches')}</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-start">
              <label className="text-sm font-medium">{t('userManagement.filterByDivision')}</label>
              <Select value={divisionFilter} onValueChange={setDivisionFilter} dir={direction}>
                <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
                <SelectContent dir={direction} className="bg-background">
                  <SelectItem value="all">{t('userManagement.allDivisions')}</SelectItem>
                  {divisions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-start">
              <label className="text-sm font-medium">{t('userManagement.filterByRole')}</label>
              <Select value={roleFilter} onValueChange={setRoleFilter} dir={direction}>
                <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
                <SelectContent dir={direction} className="bg-background">
                  <SelectItem value="all">{t('userManagement.allRoles')}</SelectItem>
                  {roles.map(r => <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>)}
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
                  <TableHead className="text-start">{t('profile.fullName')}</TableHead>
                  <TableHead className="text-start">{t('userManagement.userType')}</TableHead>
                  <TableHead className="text-start">{t('userManagement.status')}</TableHead>
                  <TableHead className="text-start">{t('userManagement.login')}</TableHead>
                  <TableHead className="text-start">{t('orgStructure.branch')}</TableHead>
                  <TableHead className="text-start">{t('userManagement.hierarchy')}</TableHead>
                  <TableHead className="text-start">{t('userManagement.roles')}</TableHead>
                  <TableHead className="text-start">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-start">
                        <div className="flex flex-col">
                          <span>{user.full_name || '-'}</span>
                          {user.employee_id && (
                            <span className="text-xs text-muted-foreground">#{user.employee_id}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-start">
                        <Badge variant={getUserTypeBadgeVariant(user.user_type)}>
                          {user.user_type ? t(getUserTypeLabel(user.user_type)) : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-start">
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? t('userManagement.active') : t('userManagement.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-start">
                        {user.has_login ? (
                          <LogIn className="h-4 w-4 text-primary" />
                        ) : (
                          <LogOut className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-start">
                        {user.branch_name || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-start">
                        {user.division_name && (
                          <span>{user.division_name}</span>
                        )}
                        {user.department_name && (
                          <span className="text-muted-foreground"> {hierarchyArrow} {user.department_name}</span>
                        )}
                        {user.section_name && (
                          <span className="text-muted-foreground"> {hierarchyArrow} {user.section_name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-start">
                        <div className="flex flex-wrap gap-1">
                          {user.role_assignments && user.role_assignments.length > 0 ? (
                            <>
                              {user.role_assignments
                                .filter(r => r.role_code !== 'normal_user')
                                .slice(0, 3)
                                .map((role) => (
                                  <RoleBadge
                                    key={role.role_id}
                                    code={role.role_code}
                                    name={role.role_name}
                                    category={role.category as RoleCategory}
                                    size="sm"
                                  />
                                ))}
                              {user.role_assignments.filter(r => r.role_code !== 'normal_user').length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.role_assignments.filter(r => r.role_code !== 'normal_user').length - 3}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-start">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            aria-label={t('common.edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ManagerTeamViewer 
                            managerId={user.id} 
                            managerName={user.full_name || undefined} 
                            compact 
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          
          {totalPages > 1 && (
            <div className="border-t p-4">
              <PaginationControls
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={25}
                hasNextPage={hasNextPage}
                hasPreviousPage={hasPreviousPage}
                onNextPage={goToNextPage}
                onPreviousPage={goToPreviousPage}
                onFirstPage={() => goToPage(1)}
                onLastPage={() => goToPage(totalPages)}
                isLoading={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        user={editingUser ? {
          id: editingUser.id,
          full_name: editingUser.full_name,
          phone_number: editingUser.phone_number,
          user_type: editingUser.user_type,
          has_login: editingUser.has_login,
          is_active: editingUser.is_active,
          employee_id: editingUser.employee_id,
          job_title: editingUser.job_title,
          assigned_branch_id: editingUser.assigned_branch_id,
          assigned_division_id: editingUser.assigned_division_id,
          assigned_department_id: editingUser.assigned_department_id,
          assigned_section_id: editingUser.assigned_section_id,
        } : null}
        onSave={handleSaveUser}
      />
    </div>
  );
}
