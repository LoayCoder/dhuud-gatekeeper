const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/components/users/UserFormDialog.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/components/users/UserFormDialog');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const hooksDir = path.join(targetDir, 'hooks');
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

const componentsDir = path.join(targetDir, 'components');
if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });

function extractBetween(str, startStr, endStr) {
    const startIdx = str.indexOf(startStr);
    if (startIdx === -1) return '';
    const restStr = str.substring(startIdx + startStr.length);
    const endIdx = restStr.indexOf(endStr);
    if (endIdx === -1) return '';
    return restStr.substring(0, endIdx);
}

// 1. Types
const typesImports = `import { z } from 'zod';\n\n`;
const schemaStr = extractBetween(content, "const userFormSchema = z.object({", "});");
const typesContent = typesImports + "export const userFormSchema = z.object({" + schemaStr + "});\n\n" +
    "export type UserFormValues = z.infer<typeof userFormSchema>;\n\n" +
    "export interface UserFormDialogProps {\n  open: boolean;\n  onOpenChange: (open: boolean) => void;\n  user?: any;\n  onSave: (data: UserFormValues, selectedRoleIds: string[], emailChanged: boolean, originalEmail: string | null, selectedBranchIds: string[]) => Promise<void>;\n}\n";

fs.writeFileSync(path.join(targetDir, 'types.ts'), typesContent);

// 2. Main hook
const hookImports = `import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserType, isContractorType, userTypeHasLogin, getUserTypeLabel } from '@/lib/license-utils';
import { useLicensedUserQuota } from '@/hooks/use-licensed-user-quota';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/use-user-roles';
import { UserFormValues, userFormSchema, UserFormDialogProps } from '../types';

export function useUserFormState(props: UserFormDialogProps) {
  const { open, onOpenChange, user, onSave } = props;
`;

const hookBody = extractBetween(content, "  const { t, i18n } = useTranslation();", "  return (");

const hookBottom = `
  return {
    t, i18n, direction, profile, isAdmin, form,
    activeTab, setActiveTab, isLoading, setIsLoading,
    selectedRoleIds, setSelectedRoleIds,
    showTeamAssignment, setShowTeamAssignment,
    currentManagerId, setCurrentManagerId,
    hierarchy, selectedBranchIds, setSelectedBranchIds,
    userType, hasLogin, hasFullBranchAccess,
    selectedDivisionId, selectedDepartmentId,
    filteredDivisions, filteredDepartments, filteredSections, filteredSites,
    currentEmail, originalEmail, emailHasChanged,
    onSubmit, hasManagerRole, showTypeSpecificTab, getTabStatus,
    roles, user, onOpenChange, quota
  };
}
`;
fs.writeFileSync(path.join(hooksDir, 'useUserFormState.ts'), hookImports + "  const { t, i18n } = useTranslation();" + hookBody + hookBottom);

// 3. Components
const commonImports = `import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Users, LogIn, UserX, AlertCircle, AlertTriangle, User, Shield, Building2, Briefcase, Check } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { isContractorType } from '@/lib/license-utils';
import { RoleSelectorEnhanced } from '@/components/roles/RoleSelectorEnhanced';
import { TeamAssignmentDialog } from '@/components/hierarchy/TeamAssignmentDialog';
`;

const basicCards = `const userTypeCards = [
  { value: 'employee', icon: '👤', color: 'bg-blue-500/10 border-blue-500/30' },
  { value: 'contractor_longterm', icon: '🔧', color: 'bg-amber-500/10 border-amber-500/30' },
  { value: 'contractor_shortterm', icon: '⚡', color: 'bg-orange-500/10 border-orange-500/30' },
  { value: 'member', icon: '🏅', color: 'bg-purple-500/10 border-purple-500/30' },
  { value: 'visitor', icon: '👋', color: 'bg-gray-500/10 border-gray-500/30' },
];\n\n`;

const basicTabContent = extractBetween(content, '                {/* Tab 1: Basic Info */}', '                {/* Tab 2: Roles & Permissions */}');
fs.writeFileSync(path.join(componentsDir, 'BasicTab.tsx'), commonImports + basicCards + `
export function BasicTab({ state }: { state: any }) {
  const { t, form, userType, hasLogin, emailHasChanged, user, direction } = state;
  return (
    <>
      {/* Tab 1: Basic Info */}
${basicTabContent}
    </>
  );
}
`);

const rolesTabContent = extractBetween(content, '                {/* Tab 2: Roles & Permissions */}', '                {/* Tab 3: Organization */}');
fs.writeFileSync(path.join(componentsDir, 'RolesTab.tsx'), commonImports + `
export function RolesTab({ state }: { state: any }) {
  const { t, isAdmin, selectedRoleIds, setSelectedRoleIds, user, setShowTeamAssignment, currentManagerId, roles } = state;
  return (
    <>
      {/* Tab 2: Roles & Permissions */}
${rolesTabContent}
    </>
  );
}
`);

const orgTabContent = extractBetween(content, '                {/* Tab 3: Organization */}', '                {/* Tab 4: Type-Specific Details */}');
fs.writeFileSync(path.join(componentsDir, 'OrganizationTab.tsx'), commonImports + `
export function OrganizationTab({ state }: { state: any }) {
  const { t, form, hasFullBranchAccess, selectedBranchIds, setSelectedBranchIds, hierarchy, direction, filteredDivisions, filteredDepartments, filteredSections, filteredSites } = state;
  return (
    <>
      {/* Tab 3: Organization */}
${orgTabContent}
    </>
  );
}
`);

const detailsTabContent = extractBetween(content, '                {/* Tab 4: Type-Specific Details */}', '              </div>');
fs.writeFileSync(path.join(componentsDir, 'DetailsTab.tsx'), commonImports + `
export function DetailsTab({ state }: { state: any }) {
  const { t, form, userType } = state;
  return (
    <>
      {/* Tab 4: Type-Specific Details */}
${detailsTabContent}
    </>
  );
}
`);


// 4. Shell
const shellContent = `import React from 'react';
import { Loader2, User, Shield, Building2, Briefcase, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { UserFormDialogProps } from './types';
import { useUserFormState } from './hooks/useUserFormState';
import { BasicTab } from './components/BasicTab';
import { RolesTab } from './components/RolesTab';
import { OrganizationTab } from './components/OrganizationTab';
import { DetailsTab } from './components/DetailsTab';
import { TeamAssignmentDialog } from '@/components/hierarchy/TeamAssignmentDialog';
import { supabase } from '@/integrations/supabase/client';

export default function UserFormDialog(props: UserFormDialogProps) {
  const state = useUserFormState(props);
  const {
    t, direction, form, open, onOpenChange, user,
    activeTab, setActiveTab, getTabStatus, showTypeSpecificTab,
    onSubmit, isLoading, quota, showTeamAssignment, setShowTeamAssignment,
    currentManagerId, setCurrentManagerId
  } = state;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" dir={direction}>
        <DialogHeader className="text-start pb-2">
          <DialogTitle className="text-start text-xl">
            {user ? t('userManagement.editUser') : t('userManagement.addUser')}
          </DialogTitle>
          <DialogDescription className="text-start">
            {quota && (
              <span className="text-xs">
                {t('userManagement.licensedUsers')}: {quota.current_licensed_users} / {quota.max_licensed_users}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
              {/* Tab Navigation */}
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="basic" className="gap-2 text-xs sm:text-sm">
                  <User className="h-4 w-4 hidden sm:block" />
                  {t('userManagement.tabBasic', 'Basic')}
                  {getTabStatus('basic') && <Check className="h-3 w-3 text-green-500" />}
                </TabsTrigger>
                <TabsTrigger value="roles" className="gap-2 text-xs sm:text-sm">
                  <Shield className="h-4 w-4 hidden sm:block" />
                  {t('userManagement.tabRoles', 'Roles')}
                  {getTabStatus('roles') && <Check className="h-3 w-3 text-green-500" />}
                </TabsTrigger>
                <TabsTrigger value="organization" className="gap-2 text-xs sm:text-sm">
                  <Building2 className="h-4 w-4 hidden sm:block" />
                  {t('userManagement.tabOrg', 'Org')}
                </TabsTrigger>
                {showTypeSpecificTab && (
                  <TabsTrigger value="details" className="gap-2 text-xs sm:text-sm">
                    <Briefcase className="h-4 w-4 hidden sm:block" />
                    {t('userManagement.tabDetails', 'Details')}
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Tab Content - Scrollable */}
              <div className="flex-1 overflow-y-auto px-1">
                <BasicTab state={state} />
                <RolesTab state={state} />
                <OrganizationTab state={state} />
                {showTypeSpecificTab && <DetailsTab state={state} />}
              </div>
            </Tabs>

            {/* Sticky Footer */}
            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {user ? t('common.save') : t('userManagement.sendInvitation')}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {/* Team Assignment Dialog */}
        {showTeamAssignment && user && (
          <TeamAssignmentDialog
            open={showTeamAssignment}
            onOpenChange={setShowTeamAssignment}
            userId={user.id}
            userName={user.full_name}
            currentManagerId={currentManagerId}
            onAssigned={() => {
              // Refetch manager assignment
              supabase
                .from('manager_team')
                .select('manager_id')
                .eq('user_id', user.id)
                .maybeSingle()
                .then(({ data }) => setCurrentManagerId(data?.manager_id || null));
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
`;

fs.writeFileSync(path.join(targetDir, 'UserFormDialog.tsx'), shellContent);
fs.writeFileSync(path.join(targetDir, 'index.tsx'), "export { default } from './UserFormDialog';\n");

console.log('UserFormDialog split successfully');
