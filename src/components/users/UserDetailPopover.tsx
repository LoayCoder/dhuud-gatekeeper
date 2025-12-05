import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, UserX, UserCheck, Trash2, Phone, Briefcase, Building2, Hash, LogIn, LogOut } from 'lucide-react';
import { RoleBadge } from '@/components/roles/RoleBadge';
import { RoleCategory } from '@/hooks/use-user-roles';
import { UserWithRoles } from '@/hooks/use-users-paginated';
import { getUserTypeLabel } from '@/lib/license-utils';

interface UserDetailPopoverProps {
  user: UserWithRoles;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

export function UserDetailPopover({ user, onEdit, onToggleStatus, onDelete }: UserDetailPopoverProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const hierarchyArrow = direction === 'rtl' ? '←' : '→';

  const handleEdit = () => {
    setOpen(false);
    onEdit();
  };

  const handleToggleStatus = () => {
    setOpen(false);
    onToggleStatus();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    setDeleteDialogOpen(false);
    setOpen(false);
    onDelete();
  };

  const buildHierarchyPath = () => {
    const parts: string[] = [];
    if (user.division_name) parts.push(user.division_name);
    if (user.department_name) parts.push(user.department_name);
    if (user.section_name) parts.push(user.section_name);
    return parts.join(` ${hierarchyArrow} `);
  };

  const filteredRoles = user.role_assignments?.filter(r => r.role_code !== 'normal_user') || [];

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="font-medium text-start hover:text-primary hover:underline cursor-pointer transition-colors"
          >
            <div className="flex flex-col">
              <span>{user.full_name || '-'}</span>
              {user.employee_id && (
                <span className="text-xs text-muted-foreground">#{user.employee_id}</span>
              )}
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0" 
          align="start" 
          dir={direction}
        >
          {/* Header */}
          <div className="p-4 pb-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-lg leading-tight">
                {user.full_name || t('userManagement.unnamedProfile')}
              </h4>
              <Badge variant={user.is_active ? 'default' : 'secondary'} className="shrink-0">
                {user.is_active ? t('userManagement.active') : t('userManagement.inactive')}
              </Badge>
            </div>
            {user.job_title && (
              <p className="text-sm text-muted-foreground mt-1">{user.job_title}</p>
            )}
          </div>

          <Separator />

          {/* Details */}
          <div className="p-4 space-y-3">
            {user.phone_number && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span dir="ltr">{user.phone_number}</span>
              </div>
            )}
            
            {user.employee_id && (
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{user.employee_id}</span>
              </div>
            )}

            {user.user_type && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <Badge variant="outline">
                  {t(getUserTypeLabel(user.user_type))}
                </Badge>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              {user.has_login ? (
                <>
                  <LogIn className="h-4 w-4 text-primary shrink-0" />
                  <span>{t('userManagement.hasLogin')}</span>
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{t('userManagement.noLogin')}</span>
                </>
              )}
            </div>

            {user.branch_name && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{user.branch_name}</span>
              </div>
            )}

            {buildHierarchyPath() && (
              <div className="text-sm text-muted-foreground ps-6">
                {buildHierarchyPath()}
              </div>
            )}
          </div>

          {/* Roles */}
          {filteredRoles.length > 0 && (
            <>
              <Separator />
              <div className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {t('userManagement.roles')}
                </p>
                <div className="flex flex-wrap gap-1">
                  {filteredRoles.map((role) => (
                    <RoleBadge
                      key={role.role_id}
                      code={role.role_code}
                      name={role.role_name}
                      category={role.category as RoleCategory}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="p-2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
              {t('common.edit')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleToggleStatus}
            >
              {user.is_active ? (
                <>
                  <UserX className="h-3.5 w-3.5" />
                  {t('userManagement.deactivate')}
                </>
              ) : (
                <>
                  <UserCheck className="h-3.5 w-3.5" />
                  {t('userManagement.activate')}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDeleteClick}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('common.delete')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">
              {t('userManagement.confirmDeleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              {t('userManagement.confirmDeleteDesc', { userName: user.full_name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse sm:flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
