import React from "react";
import { Users, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TeamMemberSelector, SelectedMemberCard } from "../../TeamMemberSelector";
import { TEAM_ROLES } from "../constants";

export function WizardStep2({ state }: { state: unknown }) {
  const { t, isRTL } = state;
  const {
    teamLeader, setTeamLeader,
    teamMembers, removeTeamMember, addTeamMember
  } = state;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("risk.step2.title", "Risk Assessment Team")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t("risk.team.requirement", "Risk assessments must be conducted by a competent team including a Team Leader and at least one Team Member.")}
          </AlertDescription>
        </Alert>

        {/* Team Leader Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              {isRTL ? TEAM_ROLES.team_leader.label_ar : TEAM_ROLES.team_leader.label}
              <Badge variant="destructive" className="text-xs">
                {t("common.required", "Required")}
              </Badge>
            </Label>
          </div>
          
          {teamLeader ? (
            <SelectedMemberCard
              user={teamLeader}
              role={isRTL ? TEAM_ROLES.team_leader.label_ar : TEAM_ROLES.team_leader.label}
              onRemove={() => setTeamLeader(null)}
              isRequired
            />
          ) : (
            <TeamMemberSelector
              onSelect={(user) => setTeamLeader(user)}
              excludeIds={teamMembers.map((m: unknown) => m.user_id)}
              placeholder={t("risk.team.searchLeaderPlaceholder", "Search for Team Leader by name or ID...")}
            />
          )}
        </div>

        {/* Team Members Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">
              {isRTL ? TEAM_ROLES.member.label_ar : TEAM_ROLES.member.label}
            </Label>
            <Badge variant="outline">
              {teamMembers.length} {t("common.selected", "selected")}
            </Badge>
          </div>

          {/* Selected Members */}
          {teamMembers.length > 0 && (
            <div className="space-y-2">
              {teamMembers.map((member: unknown) => (
                <SelectedMemberCard
                  key={member.user_id}
                  user={member}
                  role={isRTL ? TEAM_ROLES.member.label_ar : TEAM_ROLES.member.label}
                  onRemove={() => removeTeamMember(member.user_id)}
                />
              ))}
            </div>
          )}

          {/* Add Member Selector */}
          <TeamMemberSelector
            onSelect={addTeamMember}
            excludeIds={[
              ...(teamLeader ? [teamLeader.user_id] : []),
              ...teamMembers.map((m: unknown) => m.user_id),
            ]}
            placeholder={t("risk.team.searchMemberPlaceholder", "Add team member by name or ID...")}
          />
        </div>

        {/* Validation Message */}
        {(!teamLeader || teamMembers.length < 1) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {!teamLeader
                ? t("risk.team.leaderRequired", "Please select a Team Leader")
                : t("risk.team.memberRequired", "Please add at least one Team Member")}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
