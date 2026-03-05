import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  HeartPulse,
  UserPlus,
  Loader2,
  CheckCircle2,
  XCircle,
  User
} from "lucide-react";
import { useInjuryAssignment } from "@/hooks/use-injury-assignment";
import { useUserRoles } from '@/features/users';
import type { IncidentWithDetails } from '@/features/incidents';

interface ClinicUserAssignmentCardProps {
  incident: IncidentWithDetails;
  onComplete?: () => void;
}

export function ClinicUserAssignmentCard({ incident, onComplete }: ClinicUserAssignmentCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { hasRole } = useUserRoles();

  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const {
    assignedClinicUser,
    isAssigned,
    availableClinicUsers,
    isLoading,
    assignClinicUser,
    unassignClinicUser,
    isAssigning,
    isUnassigning,
  } = useInjuryAssignment(incident.id);

  // Only HSSE Manager or HSSE Expert can assign
  const canAssign = hasRole('hsse_manager') || hasRole('hsse_expert');

  // Check if incident has injury
  const hasInjury = (incident as any).has_injury ||
    (incident as any).ai_detected_injury ||
    (incident as any).injury_count > 0;

  // Don't show if no injury or user can't assign
  if (!hasInjury || !canAssign) {
    return null;
  }

  const handleAssign = () => {
    if (selectedUserId) {
      assignClinicUser(selectedUserId, {
        onSuccess: () => {
          setSelectedUserId("");
          onComplete?.();
        },
      });
    }
  };

  const handleUnassign = () => {
    unassignClinicUser(undefined, {
      onSuccess: () => {
        onComplete?.();
      },
    });
  };

  if (isLoading) {
    return (
      <Card className="border-red-500/50 bg-red-500/5" dir={direction}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-red-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-500/50 bg-red-500/5" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-red-600" />
            <CardTitle className="text-lg">
              {t('investigation.injury.assignmentTitle', 'Clinic User Assignment')}
            </CardTitle>
          </div>
          {isAssigned ? (
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
              <CheckCircle2 className="h-3 w-3 me-1" />
              {t('common.assigned', 'Assigned')}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              {t('common.pending', 'Pending Assignment')}
            </Badge>
          )}
        </div>
        <CardDescription>
          {isAssigned
            ? t('investigation.injury.clinicUserAssignedDesc', 'A clinic user has been assigned to complete the injury assessment.')
            : t('investigation.injury.assignClinicUserDesc', 'Assign a clinic user to document medical details and injury assessment for this incident.')
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAssigned ? (
          // Show assigned user
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                <User className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium">{assignedClinicUser?.full_name}</p>
                <p className="text-sm text-muted-foreground">{assignedClinicUser?.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnassign}
              disabled={isUnassigning}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              {isUnassigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 me-1" />
              )}
              {t('common.unassign', 'Unassign')}
            </Button>
          </div>
        ) : (
          // Show assignment form
          <>
            {availableClinicUsers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>{t('investigation.injury.noClinicUsersAvailable', 'No clinic users available in this tenant.')}</p>
                <p className="text-sm mt-1">{t('investigation.injury.contactAdmin', 'Please contact your administrator to add users with the Clinic User role.')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('investigation.injury.selectClinicUser', 'Select Clinic User')}
                  </label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('investigation.injury.selectClinicUserPlaceholder', 'Choose a clinic user...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClinicUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{user.full_name}</span>
                            <span className="text-muted-foreground text-xs">({user.email})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={handleAssign}
                  disabled={!selectedUserId || isAssigning}
                >
                  {isAssigning ? (
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 me-2" />
                  )}
                  {t('investigation.injury.assignClinicUser', 'Assign Clinic User')}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Info about what happens next */}
        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          {isAssigned
            ? t('investigation.injury.assignedInfo', 'The assigned clinic user will be notified and can now complete the Injury assessment tab.')
            : t('investigation.injury.pendingInfo', 'Once assigned, the clinic user will receive a notification and can access the Injury tab to document their assessment.')
          }
        </div>
      </CardContent>
    </Card>
  );
}


