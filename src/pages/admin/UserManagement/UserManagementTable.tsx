
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Pencil, RefreshCw, KeyRound } from "lucide-react";
import { UserDetailPopover } from '@/features/users';
import { ManagerTeamViewer } from "@/components/hierarchy/ManagerTeamViewer";
import { RoleBadge } from "@/components/roles/RoleBadge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { cn } from "@/lib/utils";
import { getUserTypeLabel } from "@/lib/license-utils";
import type { RoleCategory } from '@/features/users';

export function UserManagementTable(props: import('./types').BaseUserManagementProps & { allSelected: boolean; someSelected: boolean }) {
  const { t } = useTranslation();
  const { loading, users, allSelected, handleSelectAll, someSelected, selectedUsers, handleSelectUser, getUserInitials, handleEditUser, handleToggleUserStatus, handleDeleteUser, getUserTypeBadgeVariant, handleSyncUserEmail, syncingUserId, handleResetPasswordClick, resetPasswordUserId, page, totalPages, totalCount, hasNextPage, hasPreviousPage, goToNextPage, goToPreviousPage, goToPage } = props;

  return (
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
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label={t('userManagement.selectAll')}
                    className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                    {...(someSelected ? { 'data-state': 'indeterminate' } : {})}
                  />
                </TableHead>
                <TableHead className="text-start">{t('profile.fullName')}</TableHead>
                <TableHead className="text-start">{t('userManagement.userType')}</TableHead>
                <TableHead className="text-start">{t('userManagement.status')}</TableHead>
                <TableHead className="text-start">{t('orgStructure.branch')}</TableHead>
                <TableHead className="text-start">{t('userManagement.roles')}</TableHead>
                <TableHead className="text-start">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      selectedUsers.has(user.id) && 'bg-muted/50'
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                        aria-label={t('userManagement.selectUser', { name: user.full_name })}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-start">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={cn(
                            "text-xs font-medium",
                            user.is_active
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {getUserInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <UserDetailPopover
                          user={user}
                          onEdit={() => handleEditUser(user)}
                          onToggleStatus={() => handleToggleUserStatus(user)}
                          onDelete={() => handleDeleteUser(user.id, user.full_name || '')}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-start">
                      <Badge variant={getUserTypeBadgeVariant(user.user_type)}>
                        {user.user_type ? t(getUserTypeLabel(user.user_type)) : '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-start">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "h-2 w-2 rounded-full",
                          user.is_active ? "bg-green-500" : "bg-muted-foreground"
                        )} />
                        <span className={cn(
                          "text-sm",
                          user.is_active ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {user.is_active ? t('userManagement.active') : t('userManagement.inactive')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-start">
                      {user.branch_name || '-'}
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
                        {user.has_login && user.email && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSyncUserEmail(user.id, user.full_name || '')}
                              disabled={syncingUserId === user.id}
                              aria-label={t('userManagement.syncEmail', 'Sync Login Email')}
                              title={t('userManagement.syncEmailTooltip', 'Sync login email with profile email')}
                            >
                              {syncingUserId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResetPasswordClick(user.id, user.full_name || '', user.phone_number)}
                              disabled={resetPasswordUserId === user.id}
                              aria-label={t('userManagement.resetPassword', 'Reset Password')}
                              title={t('userManagement.resetPasswordTooltip', 'Reset password and send via WhatsApp')}
                            >
                              {resetPasswordUserId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <KeyRound className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
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

  );
}
