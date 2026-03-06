import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { UserCheck, Loader2, User, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCanPerformExpertScreening } from '@/features/incidents';
import { toast } from "sonner";
import { format } from "date-fns";
import type { IncidentWithDetails } from '@/features/incidents';
import type { Investigation } from '@/features/investigation';
import { investigatorAssignmentSchema, type InvestigatorAssignmentFormValues } from './InvestigatorAssignmentSchema';

interface InvestigatorAssignmentCardProps {
  incident: IncidentWithDetails;
  investigation: Investigation | null;
  onRefresh: () => void;
}

export function InvestigatorAssignmentCard({ incident, investigation, onRefresh }: InvestigatorAssignmentCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<InvestigatorAssignmentFormValues>({
    resolver: zodResolver(investigatorAssignmentSchema),
    defaultValues: { selectedInvestigator: '', notes: '' },
  });

  const { data: canAssign, isLoading: checkingPermission } = useCanPerformExpertScreening();

  const { data: investigators, isLoading: loadingInvestigators } = useQuery({
    queryKey: ['hsse-investigators', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, employee_id')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .or('is_deleted.is.null,is_deleted.eq.false');
      if (usersError) throw usersError;
      const userIds = usersData?.map(u => u.id) || [];
      if (userIds.length === 0) return [];
      const { data: roleData, error: roleError } = await supabase
        .from('user_role_assignments')
        .select('user_id, role:roles(code, category)')
        .in('user_id', userIds);
      if (roleError) throw roleError;
      const hsseRoleCodes = ['hsse_officer', 'hsse_investigator', 'hsse_manager', 'hsse_expert', 'incident_analyst', 'admin'];
      const hsseUserIds = new Set(
        roleData?.filter(ra => {
          const role = ra.role as { code: string; category: string } | null;
          return role && (hsseRoleCodes.includes(role.code) || role.category === 'hsse');
        }).map(ra => ra.user_id) || []
      );
      return usersData?.filter(p => hsseUserIds.has(p.id)) || [];
    },
    enabled: !!profile?.tenant_id && !!canAssign,
  });

  const { data: assignedInvestigator } = useQuery({
    queryKey: ['investigator-profile', investigation?.investigator_id],
    queryFn: async () => {
      if (!investigation?.investigator_id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, employee_id')
        .eq('id', investigation.investigator_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!investigation?.investigator_id,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');
      const values = form.getValues();
      if (!values.selectedInvestigator) throw new Error('No investigator selected');

      if (investigation) {
        const { error } = await supabase
          .from('investigations')
          .update({
            investigator_id: values.selectedInvestigator,
            assigned_by: user.id,
            assigned_at: new Date().toISOString(),
            assignment_notes: values.notes || null,
          })
          .eq('id', investigation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('investigations')
          .insert({
            incident_id: incident.id,
            tenant_id: profile.tenant_id,
            investigator_id: values.selectedInvestigator,
            assigned_by: user.id,
            assigned_at: new Date().toISOString(),
            assignment_notes: values.notes || null,
          });
        if (error) throw error;
      }

      await supabase.from('incident_audit_logs').insert({
        incident_id: incident.id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'investigator_assigned',
        new_value: { investigator_id: values.selectedInvestigator, notes: values.notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation', incident.id] });
      toast.success(t('investigation.investigatorAssigned', 'Investigator assigned successfully'));
      form.reset({ selectedInvestigator: '', notes: '' });
      onRefresh();
    },
    onError: (error) => {
      toast.error(t('common.error') + ': ' + error.message);
    },
  });

  if (checkingPermission) {
    return (
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            {t('investigation.overview.investigatorAssignment', 'Investigator Assignment')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.loading')}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasInvestigator = !!investigation?.investigator_id;

  const renderAssignmentForm = (isReassign = false) => (
    <Form {...form}>
      <div className="space-y-3">
        <FormField control={form.control} name="selectedInvestigator" render={({ field }) => (
          <FormItem>
            <FormLabel>{t('investigation.overview.selectInvestigator', 'Select Investigator')}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('investigation.overview.selectPlaceholder', 'Choose an investigator...')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent dir={direction}>
                {investigators?.length === 0 && !isReassign ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {t('investigation.overview.noInvestigators', 'No HSSE investigators available')}
                  </div>
                ) : (
                  investigators?.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.full_name} ({inv.job_title || inv.employee_id})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>{t('investigation.overview.assignmentNotes', 'Assignment Notes')}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t('investigation.overview.notesPlaceholder', 'Optional notes for the investigator...')}
                rows={2}
              />
            </FormControl>
          </FormItem>
        )} />
        <Button
          onClick={() => assignMutation.mutate()}
          disabled={!form.watch('selectedInvestigator') || assignMutation.isPending}
          size={isReassign ? "sm" : "default"}
          className={isReassign ? "" : "w-full"}
        >
          {assignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
          {isReassign
            ? t('investigation.overview.reassignBtn', 'Reassign')
            : t('investigation.overview.assignBtn', 'Assign Investigator')}
        </Button>
      </div>
    </Form>
  );

  if (hasInvestigator && assignedInvestigator) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            {t('investigation.overview.investigatorAssignment', 'Investigator Assignment')}
          </CardTitle>
        </CardHeader>
        <CardContent dir={direction}>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{assignedInvestigator.full_name}</p>
                  <p className="text-sm text-muted-foreground">{assignedInvestigator.job_title}</p>
                </div>
                <Badge variant="secondary" className="ms-auto">
                  {t('investigation.overview.assigned', 'Assigned')}
                </Badge>
              </div>
              {investigation.assigned_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {t('investigation.overview.assignedOn', 'Assigned on {{date}}', {
                    date: format(new Date(investigation.assigned_at), 'PPp')
                  })}
                </div>
              )}
              {investigation.assignment_notes && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {t('investigation.overview.assignmentNotes', 'Assignment Notes')}
                  </p>
                  <p className="text-sm">{investigation.assignment_notes}</p>
                </div>
              )}
              {investigation.started_at && (
                <Badge variant="default" className="gap-1">
                  {t('investigation.overview.investigationStarted', 'Investigation Started')}
                </Badge>
              )}
            </div>

            {canAssign && (
              <details className="group">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  {t('investigation.overview.reassign', 'Reassign investigator...')}
                </summary>
                <div className="mt-3">
                  {renderAssignmentForm(true)}
                </div>
              </details>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canAssign) {
    return (
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            {t('investigation.overview.investigatorAssignment', 'Investigator Assignment')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('investigation.overview.awaitingExpertAssignment', 'HSSE Expert will assign an investigator for this case.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          {t('investigation.overview.investigatorAssignment', 'Investigator Assignment')}
        </CardTitle>
      </CardHeader>
      <CardContent dir={direction}>
        {loadingInvestigators ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.loading')}
          </div>
        ) : (
          renderAssignmentForm(false)
        )}
      </CardContent>
    </Card>
  );
}
