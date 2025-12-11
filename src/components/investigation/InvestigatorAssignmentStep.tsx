import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Play, Loader2 } from "lucide-react";
import { useStartInvestigation, useCanPerformExpertScreening } from "@/hooks/use-hsse-workflow";
import { useCachedProfile } from "@/hooks/use-cached-profile";
import { supabase } from "@/integrations/supabase/client";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface InvestigatorAssignmentStepProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

export function InvestigatorAssignmentStep({ incident, onComplete }: InvestigatorAssignmentStepProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [selectedInvestigator, setSelectedInvestigator] = useState<string>("");
  const [assignmentNotes, setAssignmentNotes] = useState<string>("");
  
  const { data: canAssign } = useCanPerformExpertScreening();
  const { data: profile } = useCachedProfile();
  const startInvestigation = useStartInvestigation();
  
  // Fetch available HSSE investigators
  const { data: investigators, isLoading: loadingInvestigators } = useQuery({
    queryKey: ['hsse-investigators', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      
      // Get users with HSSE investigator roles
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, employee_id')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .or('is_deleted.is.null,is_deleted.eq.false');
      
      if (usersError) throw usersError;
      
      // Get role assignments
      const { data: roleAssignments, error: rolesError } = await supabase
        .from('user_role_assignments')
        .select(`
          user_id,
          roles!inner(code, category)
        `);
      
      if (rolesError) throw rolesError;
      
      // Filter users with HSSE roles
      const hsseRoleCodes = ['hsse_investigator', 'hsse_officer', 'hsse_expert', 'hsse_manager'];
      const hsseUserIds = new Set(
        roleAssignments
          .filter((ra: { user_id: string; roles: { code: string; category: string } }) => 
            hsseRoleCodes.includes(ra.roles.code) || ra.roles.category === 'hsse'
          )
          .map((ra: { user_id: string }) => ra.user_id)
      );
      
      return users?.filter(u => hsseUserIds.has(u.id)) || [];
    },
    enabled: !!profile?.tenant_id && canAssign,
  });
  
  if (!canAssign) {
    return null;
  }
  
  const handleAssign = () => {
    if (!selectedInvestigator) return;
    
    startInvestigation.mutate({
      incidentId: incident.id,
      investigatorId: selectedInvestigator,
      assignmentNotes: assignmentNotes.trim() || undefined,
    }, {
      onSuccess: onComplete,
    });
  };

  return (
    <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">{t('workflow.assignInvestigator.title', 'Assign Investigator')}</CardTitle>
          </div>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            {t('workflow.assignInvestigator.approved', 'Investigation Approved')}
          </Badge>
        </div>
        <CardDescription>
          {t('workflow.assignInvestigator.description', 'Manager has approved the investigation. Please assign an investigator to begin.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="investigator">
            {t('workflow.assignInvestigator.selectInvestigator', 'Select Investigator')}
          </Label>
          <Select
            value={selectedInvestigator}
            onValueChange={setSelectedInvestigator}
            dir={direction}
          >
            <SelectTrigger id="investigator" className="w-full">
              <SelectValue placeholder={t('workflow.assignInvestigator.placeholder', 'Choose an investigator...')} />
            </SelectTrigger>
            <SelectContent>
              {loadingInvestigators ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : investigators?.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {t('workflow.assignInvestigator.noInvestigators', 'No investigators available')}
                </div>
              ) : (
                investigators?.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    <div className="flex flex-col">
                      <span>{inv.full_name}</span>
                      {inv.job_title && (
                        <span className="text-xs text-muted-foreground">{inv.job_title}</span>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="assignment-notes">
            {t('workflow.assignInvestigator.notesLabel', 'Assignment Notes / Instructions')}
            <span className="text-muted-foreground font-normal ms-1">
              ({t('common.optional', 'Optional')})
            </span>
          </Label>
          <Textarea
            id="assignment-notes"
            value={assignmentNotes}
            onChange={(e) => setAssignmentNotes(e.target.value)}
            placeholder={t('workflow.assignInvestigator.notesPlaceholder', 'Enter any specific instructions or notes for the investigator...')}
            rows={3}
          />
        </div>
        
        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={handleAssign}
          disabled={!selectedInvestigator || startInvestigation.isPending}
        >
          {startInvestigation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin me-2" />
          ) : (
            <Play className="h-4 w-4 me-2" />
          )}
          {t('workflow.assignInvestigator.start', 'Assign & Start Investigation')}
        </Button>
      </CardContent>
    </Card>
  );
}
