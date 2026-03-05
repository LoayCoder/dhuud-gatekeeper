
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil, Plus, Search, Download, X, Upload, RefreshCw, Filter, ChevronDown, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { UserFormDialog, UserDetailPopover, UserImportDialog, InvitationManagementPanel } from "@/features/users";
import { UserDiagnosticPanel } from "@/features/users";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Stethoscope } from "lucide-react";
import { EmailSyncBanner } from "@/features/users";
import { LicensedUserQuotaCard } from "@/components/billing/LicensedUserQuotaCard";
import { useLicensedUserQuota } from "@/hooks/use-licensed-user-quota";
import { getUserTypeLabel, getContractorType } from "@/lib/license-utils";
import { useAdminAuditLog, detectUserChanges } from "@/hooks/use-admin-audit-log";
import { ManagerTeamViewer } from "@/components/hierarchy/ManagerTeamViewer";
import { useUserRoles, RoleCategory } from "@/hooks/use-user-roles";
import { RoleBadge } from "@/components/roles/RoleBadge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useUsersPaginated, UserWithRoles, UseUsersPaginatedFilters } from "@/hooks/use-users-paginated";
import { ExportColumn } from "@/lib/export-utils";
import { performSecureExport, type ReportColumn } from "@/lib/secure-export";
import { UserStatsCards } from "@/features/users";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface HierarchyItem {
  id: string;
  name: string;
}


import { UserManagementFilters } from './UserManagementFilters';
import { UserManagementTable } from './UserManagementTable';
import { UserManagementModals } from './UserManagementModals';
import { useUserManagementState, useUserManagementData, useUserManagementSaveActions, useUserManagementStatusActions, useUserManagementExtraActions } from './hooks/useUserManagement';

export default function UserManagement() {
  const state = useUserManagementState();
  const data = useUserManagementData(state);
  const saveActions = useUserManagementSaveActions(state, data);
  const statusActions = useUserManagementStatusActions(state, data);
  const coreActions = { ...saveActions, ...statusActions };
  const extraActions = useUserManagementExtraActions(state, data);
  const actions = { ...coreActions, ...extraActions };

  const { users = [], selectedUsers, totalCount, loading, direction, t, exporting, handleExport, setIsImportDialogOpen, handleAddUser, quota, breakdown, quotaLoading, refetchUsers, setSelectedUsers, handleBulkActionClick, userTypeFilter, statusFilter, branchFilter, divisionFilter, roleFilter } = { ...state, ...data, ...actions } as any;
  const allSelected = users.length > 0 && users.every((u: any) => selectedUsers?.has(u.id));
  const someSelected = users.some((u: any) => selectedUsers?.has(u.id)) && !allSelected;

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (userTypeFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (branchFilter !== 'all') count++;
    if (divisionFilter !== 'all') count++;
    if (roleFilter !== 'all') count++;
    return count;
  }, [userTypeFilter, statusFilter, branchFilter, divisionFilter, roleFilter]);

  const userStats = useMemo(() => {
    const activeUsers = users.filter(u => u.is_active).length;
    return {
      total: totalCount,
      active: activeUsers,
      inactive: totalCount - activeUsers,
    };
  }, [users, totalCount]);

  return (
    <div className="container py-8 space-y-6" dir={direction}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1 text-start">
          <h1 className="text-3xl font-bold tracking-tight">{t('userManagement.title')}</h1>
          <p className="text-muted-foreground">{t('userManagement.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {t('userManagement.export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                {t('userManagement.exportCSV')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                {t('userManagement.exportExcel')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Stethoscope className="h-4 w-4" />
                {t('userManagement.diagnostics', 'Diagnostics')}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>{t('userManagement.accountDiagnostics', 'Account Diagnostics')}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <UserDiagnosticPanel />
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            {t('userManagement.importUsers')}
          </Button>
          <Button onClick={handleAddUser} className="gap-2">
            <Plus className="h-4 w-4 rtl:order-last" />
            {t('userManagement.addUser')}
          </Button>
        </div>
      </div>

      {/* User Stats Cards */}
      <UserStatsCards
        totalUsers={userStats.total}
        activeUsers={userStats.active}
        inactiveUsers={userStats.inactive}
        isLoading={loading}
      />

      <LicensedUserQuotaCard quota={quota} breakdown={breakdown} isLoading={quotaLoading} showUpgradeCta={true} />

      <EmailSyncBanner onSyncComplete={refetchUsers} />


      <UserManagementFilters {...state} {...data} {...actions} activeFilterCount={activeFilterCount} clearAllFilters={actions.clearAllFilters} />

      <InvitationManagementPanel />

      {/* Bulk Actions Toolbar */}
      {selectedUsers.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {t('userManagement.selectedCount', { count: selectedUsers.size })}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUsers(new Set())}>
                  {t('userManagement.clearSelection')}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkActionClick('activate')}
                >
                  {t('userManagement.bulkActivate')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkActionClick('deactivate')}
                >
                  {t('userManagement.bulkDeactivate')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkActionClick('delete')}
                >
                  {t('userManagement.bulkDelete')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <UserManagementTable {...state} {...data} {...actions} allSelected={allSelected} someSelected={someSelected} />

      <UserManagementModals {...state} {...data} {...actions} />
    </div>
  );
}
