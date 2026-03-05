import React from 'react';
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

export function UserFormDialog(props: UserFormDialogProps) {
  const state = useUserFormState(props) as any;
  const {
    t, direction, form, onOpenChange, user,
    activeTab, setActiveTab, getTabStatus, showTypeSpecificTab,
    onSubmit, isLoading, quota, showTeamAssignment, setShowTeamAssignment,
    currentManagerId, setCurrentManagerId
  } = state;
  const open = props.open;

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
            userId={(user as any).id}
            userName={(user as any).full_name}
            currentManagerId={currentManagerId}
            onAssigned={() => {
              // Refetch manager assignment
              supabase
                .from('manager_team')
                .select('manager_id')
                .eq('user_id', (user as any).id)
                .maybeSingle()
                .then(({ data }) => setCurrentManagerId(data?.manager_id || null));
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

