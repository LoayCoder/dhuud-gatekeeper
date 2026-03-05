
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import { useLicensedUserQuota } from "@/hooks/use-licensed-user-quota";
import { useAdminAuditLog } from "@/hooks/use-admin-audit-log";
import { useUserRoles } from "@/hooks/use-user-roles";

export function useUserManagementState() {
  const { t, i18n } = useTranslation();
  const { profile, user } = useAuth();
  const direction = i18n.dir();
  
  const [branches, setBranches] = useState<HierarchyItem[]>([]);
  const [divisions, setDivisions] = useState<HierarchyItem[]>([]);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);

  // Search with debounce
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<BulkActionType>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Export loading
  const [exporting, setExporting] = useState(false);
  
  // Import dialog
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  // Email sync state
  const [syncingUserId, setSyncingUserId] = useState<string | null>(null);
  
  // Password reset state
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string; name: string; phone: string } | null>(null);

  // Filters
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { quota, breakdown, isLoading: quotaLoading, refetch: refetchQuota } = useLicensedUserQuota();
  const { logUserCreated, logUserUpdated, logUserDeactivated, logUserActivated, logUserDeleted } = useAdminAuditLog();
  const { roles, assignRoles } = useUserRoles();
  
  // Filters panel state
  const [filtersOpen, setFiltersOpen] = useState(false);

  return {
    t, i18n, profile, user, direction,
    branches, setBranches, divisions, setDivisions,
    isFormDialogOpen, setIsFormDialogOpen, editingUser, setEditingUser,
    searchInput, setSearchInput, searchTerm, setSearchTerm,
    selectedUsers, setSelectedUsers, bulkActionDialogOpen, setBulkActionDialogOpen,
    bulkActionType, setBulkActionType, bulkActionLoading, setBulkActionLoading,
    exporting, setExporting, isImportDialogOpen, setIsImportDialogOpen,
    syncingUserId, setSyncingUserId, resetPasswordUserId, setResetPasswordUserId,
    resetPasswordDialogOpen, setResetPasswordDialogOpen, resetPasswordTarget, setResetPasswordTarget,
    userTypeFilter, setUserTypeFilter, statusFilter, setStatusFilter,
    branchFilter, setBranchFilter, divisionFilter, setDivisionFilter, roleFilter, setRoleFilter,
    quota, breakdown, quotaLoading, refetchQuota, logUserCreated, logUserUpdated, logUserDeactivated, logUserActivated, logUserDeleted,
    roles, assignRoles, filtersOpen, setFiltersOpen
  };
}
