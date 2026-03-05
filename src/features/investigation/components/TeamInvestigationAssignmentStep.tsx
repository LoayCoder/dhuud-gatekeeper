import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  UserPlus, 
  Users, 
  Play, 
  Loader2, 
  Shield,
  Crown,
  AlertTriangle
} from "lucide-react";
import { useStartInvestigation, useCanPerformExpertScreening } from '@/features/incidents';
import { useAssignInvestigationTeam } from '@/features/investigation';
import { useCachedProfile } from "@/hooks/use-cached-profile";
import { supabase } from "@/integrations/supabase/client";
import type { IncidentWithDetails } from '@/features/incidents';

interface TeamInvestigationAssignmentStepProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

/**
 * Extended investigator assignment step that supports team investigations.
 * - Level 1-2: Single investigator only
 * - Level 3: Option for single or team
 * - Level 4-5: Mandatory team with leader and members
 */
export function TeamInvestigationAssignmentStep({ incident, onComplete }: TeamInvestigationAssignmentStepProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [selectedInvestigator, setSelectedInvestigator] = useState<string>("");
  const [useTeamInvestigation, setUseTeamInvestigation] = useState(false);
  const [teamLeaderId, setTeamLeaderId] = useState<string>("");
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [assignmentNotes, setAssignmentNotes] = useState<string>("");
  
  const { data: canAssign } = useCanPerformExpertScreening();
  const { data: profile } = useCachedProfile();
  const startInvestigation = useStartInvestigation();
  const assignTeam = useAssignInvestigationTeam();
  
  // Determine severity level requirements
  const severityLevel = incident.severity_v2 || (incident as any).severity;
  const severityNumber = severityLevel ? parseInt(severityLevel.replace('level_', '')) : 1;
  
  const isTeamMandatory = severityNumber >= 4;
  const isTeamOptional = severityNumber === 3;
  const isSingleOnly = severityNumber <= 2;
  
  // Auto-enable team mode for L4-5
  const effectiveTeamMode = isTeamMandatory || useTeamInvestigation;
  
  // Fetch available HSSE investigators
  const { data: investigators, isLoading: loadingInvestigators } = useQuery({
    queryKey: ['hsse-investigators', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, employee_id')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .or('is_deleted.is.null,is_deleted.eq.false');
      
      if (usersError) throw usersError;
      
      const { data: roleAssignments, error: rolesError } = await supabase
        .from('user_role_assignments')
        .select(`
          user_id,
          roles!inner(code, category)
        `);
      
      if (rolesError) throw rolesError;
      
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
  
  // Filter available team members (exclude selected leader)
  const availableTeamMembers = useMemo(() => {
    if (!investigators) return [];
    return investigators.filter(inv => inv.id !== teamLeaderId);
  }, [investigators, teamLeaderId]);
  
  if (!canAssign) {
    return null;
  }
  
  const toggleTeamMember = (userId: string) => {
    setTeamMemberIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  const handleAssign = () => {
    if (effectiveTeamMode) {
      // Team investigation
      if (!teamLeaderId || teamMemberIds.length === 0) return;
      
      assignTeam.mutate({
        incidentId: incident.id,
        investigationType: 'team',
        teamLeaderId,
        teamMemberIds,
        assignmentNotes: assignmentNotes.trim() || undefined,
      }, {
        onSuccess: onComplete,
      });
    } else {
      // Single investigator
      if (!selectedInvestigator) return;
      
      startInvestigation.mutate({
        incidentId: incident.id,
        investigatorId: selectedInvestigator,
        assignmentNotes: assignmentNotes.trim() || undefined,
      }, {
        onSuccess: onComplete,
      });
    }
  };

  const isSubmitDisabled = effectiveTeamMode 
    ? !teamLeaderId || teamMemberIds.length === 0 || assignTeam.isPending
    : !selectedInvestigator || startInvestigation.isPending;

  const getSeverityBadge = () => {
    if (!severityLevel) return null;
    
    const colorMap: Record<string, string> = {
      'level_1': 'bg-green-100 text-green-800 border-green-300',
      'level_2': 'bg-blue-100 text-blue-800 border-blue-300',
      'level_3': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'level_4': 'bg-orange-100 text-orange-800 border-orange-300',
      'level_5': 'bg-red-100 text-red-800 border-red-300',
    };
    
    return (
      <Badge variant="outline" className={colorMap[severityLevel] || ''}>
        {String(t(`incidents.severity.${severityLevel}`, severityLevel))}
      </Badge>
    );
  };

  return (
    <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {effectiveTeamMode ? (
              <Users className="h-5 w-5 text-green-600" />
            ) : (
              <UserPlus className="h-5 w-5 text-green-600" />
            )}
            <CardTitle className="text-lg">
              {effectiveTeamMode 
                ? t('workflow.assignTeam.title', 'Assign Investigation Team')
                : t('workflow.assignInvestigator.title', 'Assign Investigator')}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getSeverityBadge()}
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              {t('workflow.assignInvestigator.approved', 'Investigation Approved')}
            </Badge>
          </div>
        </div>
        <CardDescription>
          {effectiveTeamMode 
            ? t('workflow.assignTeam.description', 'Select a team leader and team members for this investigation.')
            : t('workflow.assignInvestigator.description', 'Manager has approved the investigation. Please assign an investigator to begin.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mandatory Team Alert for L4-5 */}
        {isTeamMandatory && (
          <Alert variant="default" className="border-orange-200 bg-orange-50">
            <Shield className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">
              {t('workflow.assignTeam.mandatoryTeam', 'Team Investigation Required')}
            </AlertTitle>
            <AlertDescription className="text-orange-700">
              {t('workflow.assignTeam.mandatoryTeamDesc', 'Level 4 and Level 5 incidents require a team investigation with a designated team leader and at least one team member.')}
            </AlertDescription>
          </Alert>
        )}

        {/* Team Toggle for L3 */}
        {isTeamOptional && (
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
            <div className="space-y-0.5">
              <Label htmlFor="team-toggle" className="text-base font-medium">
                {t('workflow.assignTeam.useTeam', 'Use Team Investigation')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('workflow.assignTeam.useTeamDesc', 'Enable to assign a team leader and multiple investigators.')}
              </p>
            </div>
            <Switch
              id="team-toggle"
              checked={useTeamInvestigation}
              onCheckedChange={setUseTeamInvestigation}
            />
          </div>
        )}

        {effectiveTeamMode ? (
          // Team Investigation Mode
          <>
            {/* Team Leader Selection */}
            <div className="space-y-2">
              <Label htmlFor="team-leader" className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                {t('workflow.assignTeam.selectLeader', 'Team Leader')} *
              </Label>
              <Select
                value={teamLeaderId}
                onValueChange={setTeamLeaderId}
                dir={direction}
              >
                <SelectTrigger id="team-leader" className="w-full">
                  <SelectValue placeholder={t('workflow.assignTeam.leaderPlaceholder', 'Choose team leader...')} />
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

            {/* Team Members Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                {t('workflow.assignTeam.selectMembers', 'Team Members')} *
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('workflow.assignTeam.selectMembersHint', 'Select at least one team member. The leader can assign tasks to members.')}
              </p>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                {availableTeamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {teamLeaderId 
                      ? t('workflow.assignTeam.noMembersAvailable', 'No other team members available')
                      : t('workflow.assignTeam.selectLeaderFirst', 'Select a team leader first')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableTeamMembers.map((member) => (
                      <div 
                        key={member.id} 
                        className="flex items-center space-x-3 rtl:space-x-reverse p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={`member-${member.id}`}
                          checked={teamMemberIds.includes(member.id)}
                          onCheckedChange={() => toggleTeamMember(member.id)}
                        />
                        <label
                          htmlFor={`member-${member.id}`}
                          className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {member.full_name}
                          {member.job_title && (
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              {member.job_title}
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {teamMemberIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('workflow.assignTeam.membersSelected', '{{count}} member(s) selected', { count: teamMemberIds.length })}
                </p>
              )}
            </div>
          </>
        ) : (
          // Single Investigator Mode
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
        )}
        
        {/* Assignment Notes */}
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
          disabled={isSubmitDisabled}
        >
          {(startInvestigation.isPending || assignTeam.isPending) ? (
            <Loader2 className="h-4 w-4 animate-spin me-2" />
          ) : (
            <Play className="h-4 w-4 me-2" />
          )}
          {effectiveTeamMode 
            ? t('workflow.assignTeam.start', 'Assign Team & Start Investigation')
            : t('workflow.assignInvestigator.start', 'Assign & Start Investigation')}
        </Button>
      </CardContent>
    </Card>
  );
}



