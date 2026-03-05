
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { UserFormDialog, UserImportDialog } from "@/features/users";

export function UserManagementModals(props: import('./types').BaseUserManagementProps) {
  const { t } = useTranslation();
  const { direction, bulkActionDialogOpen, setBulkActionDialogOpen, bulkActionType, selectedUsers, bulkActionLoading, handleBulkAction, resetPasswordDialogOpen, setResetPasswordDialogOpen, resetPasswordTarget, handleResetPassword, isFormDialogOpen, setIsFormDialogOpen, editingUser, handleSaveUser, isImportDialogOpen, setIsImportDialogOpen, refetchUsers, refetchQuota } = props;

  return (
    <>
      <UserFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        user={editingUser ? {
          id: editingUser.id,
          full_name: editingUser.full_name,
          email: editingUser.email,
          phone_number: editingUser.phone_number,
          user_type: editingUser.user_type,
          has_login: editingUser.has_login,
          is_active: editingUser.is_active,
          employee_id: editingUser.employee_id,
          job_title: editingUser.job_title,
          has_full_branch_access: editingUser.has_full_branch_access,
          assigned_branch_id: editingUser.assigned_branch_id,
          assigned_division_id: editingUser.assigned_division_id,
          assigned_department_id: editingUser.assigned_department_id,
          assigned_section_id: editingUser.assigned_section_id,
          contractor_company_name: editingUser.contractor_company_name,
          contract_start: editingUser.contract_start,
          contract_end: editingUser.contract_end,
          membership_id: editingUser.membership_id,
          membership_start: editingUser.membership_start,
          membership_end: editingUser.membership_end,
        } : null}
        onSave={handleSaveUser}
      />

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">
              {bulkActionType === 'delete' && t('userManagement.confirmBulkDelete', { count: selectedUsers.size })}
              {bulkActionType === 'activate' && t('userManagement.confirmBulkActivate', { count: selectedUsers.size })}
              {bulkActionType === 'deactivate' && t('userManagement.confirmBulkDeactivate', { count: selectedUsers.size })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              {bulkActionType === 'delete' && t('userManagement.bulkDeleteDesc')}
              {bulkActionType === 'activate' && t('userManagement.bulkActivateDesc')}
              {bulkActionType === 'deactivate' && t('userManagement.bulkDeactivateDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActionLoading}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkAction}
              disabled={bulkActionLoading}
              className={bulkActionType === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">
              {t('userManagement.resetPasswordConfirm', 'Reset password for {{name}}?', { name: resetPasswordTarget?.name || '' })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              {t('userManagement.resetPasswordDescription', 'A new temporary password will be generated and sent to the user via WhatsApp.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>
              {t('userManagement.resetPassword', 'Reset Password')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={() => {
          refetchUsers();
          refetchQuota();
        }}
      />
    </>
  );
}
