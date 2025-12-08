import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Loader2, User, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import type { IncidentWithDetails } from "@/hooks/use-incidents";
import type { Investigation } from "@/hooks/use-investigation";

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
  
  const [selectedInvestigator, setSelectedInvestigator] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Fetch HSSE-eligible users for investigator selection
  const { data: investigators, isLoading: loadingInvestigators } = useQuery({
    queryKey: ['hsse-investigators', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      // Get all active users with their roles via RPC or simple query
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, employee_id')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .or('is_deleted.is.null,is_deleted.eq.false');

      if (usersError) throw usersError;

      // Get role assignments for these users
      const userIds = usersData?.map(u => u.id) || [];
      if (userIds.length === 0) return [];

      const { data: roleData, error: roleError } = await supabase
        .from('user_role_assignments')
        .select('user_id, role:roles(code, category)')
        .in('user_id', userIds);

      if (roleError) throw roleError;

      // Filter to only HSSE roles
      const hsseRoleCodes = ['hsse_officer', 'hsse_investigator', 'hsse_manager', 'hsse_expert', 'incident_analyst', 'admin'];
      const hsseUserIds = new Set(
        roleData?.filter(ra => {
          const role = ra.role as { code: string; category: string } | null;
          return role && (hsseRoleCodes.includes(role.code) || role.category === 'hsse');
        }).map(ra => ra.user_id) || []
      );

      return usersData?.filter(p => hsseUserIds.has(p.id)) || [];
    },
    enabled: !!profile?.tenant_id,
  });

  // Fetch assigned investigator profile
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

  // Mutation to assign investigator
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');
      if (!selectedInvestigator) throw new Error('No investigator selected');

      // Create or update investigation record
      if (investigation) {
        const { error } = await supabase
          .from('investigations')
          .update({
            investigator_id: selectedInvestigator,
            assigned_by: user.id,
            assignment_date: new Date().toISOString(),
            assignment_notes: notes || null,
          })
          .eq('id', investigation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('investigations')
          .insert({
            incident_id: incident.id,
            tenant_id: profile.tenant_id,
            investigator_id: selectedInvestigator,
            assigned_by: user.id,
            assignment_date: new Date().toISOString(),
            assignment_notes: notes || null,
          });

        if (error) throw error;
      }

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incident.id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'investigator_assigned',
        new_value: { investigator_id: selectedInvestigator, notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation', incident.id] });
      toast.success(t('investigation.investigatorAssigned', 'Investigator assigned successfully'));
      setSelectedInvestigator('');
      setNotes('');
      onRefresh();
    },
    onError: (error) => {
      toast.error(t('common.error') + ': ' + error.message);
    },
  });

  const hasInvestigator = !!investigation?.investigator_id;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          {t('investigation.overview.investigatorAssignment', 'Investigator Assignment')}
        </CardTitle>
      </CardHeader>
      <CardContent dir={direction}>
        {hasInvestigator && assignedInvestigator ? (
          <div className="space-y-4">
            {/* Current Investigator Display */}
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
              
              {investigation.assignment_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {t('investigation.overview.assignedOn', 'Assigned on {{date}}', {
                    date: format(new Date(investigation.assignment_date), 'PPp')
                  })}
                </div>
              )}

              {investigation.started_at && (
                <Badge variant="default" className="gap-1">
                  {t('investigation.overview.investigationStarted', 'Investigation Started')}
                </Badge>
              )}
            </div>

            {/* Reassign option */}
            <details className="group">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                {t('investigation.overview.reassign', 'Reassign investigator...')}
              </summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <Label>{t('investigation.overview.selectInvestigator', 'Select Investigator')}</Label>
                  <Select value={selectedInvestigator} onValueChange={setSelectedInvestigator}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('investigation.overview.selectPlaceholder', 'Choose an investigator...')} />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      {investigators?.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.full_name} ({inv.job_title || inv.employee_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('investigation.overview.assignmentNotes', 'Assignment Notes')}</Label>
                  <Textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('investigation.overview.notesPlaceholder', 'Optional notes for the investigator...')}
                    rows={2}
                  />
                </div>
                <Button 
                  onClick={() => assignMutation.mutate()}
                  disabled={!selectedInvestigator || assignMutation.isPending}
                  size="sm"
                >
                  {assignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  {t('investigation.overview.reassignBtn', 'Reassign')}
                </Button>
              </div>
            </details>
          </div>
        ) : (
          <div className="space-y-4">
            {loadingInvestigators ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{t('investigation.overview.selectInvestigator', 'Select Investigator')}</Label>
                  <Select value={selectedInvestigator} onValueChange={setSelectedInvestigator}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('investigation.overview.selectPlaceholder', 'Choose an investigator...')} />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      {investigators?.length === 0 ? (
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
                </div>

                <div className="space-y-2">
                  <Label>{t('investigation.overview.assignmentNotes', 'Assignment Notes')}</Label>
                  <Textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('investigation.overview.notesPlaceholder', 'Optional notes for the investigator...')}
                    rows={2}
                  />
                </div>

                <Button 
                  onClick={() => assignMutation.mutate()}
                  disabled={!selectedInvestigator || assignMutation.isPending}
                  className="w-full"
                >
                  {assignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  {t('investigation.overview.assignBtn', 'Assign Investigator')}
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
