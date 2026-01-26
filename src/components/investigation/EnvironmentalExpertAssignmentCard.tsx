import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Leaf,
  UserPlus,
  Loader2,
  CheckCircle2,
  XCircle,
  User
} from "lucide-react";
import { useEnvironmentalAssignment } from "@/hooks/use-environmental-assignment";
import { useUserRoles } from "@/hooks/use-user-roles";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface EnvironmentalExpertAssignmentCardProps {
  incident: IncidentWithDetails;
  onComplete?: () => void;
}

export function EnvironmentalExpertAssignmentCard({ incident, onComplete }: EnvironmentalExpertAssignmentCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { hasRole } = useUserRoles();

  const [selectedExpertId, setSelectedExpertId] = useState<string>("");

  const {
    assignedExpert,
    isAssigned,
    availableExperts,
    isLoading,
    assignExpert,
    unassignExpert,
    isAssigning,
    isUnassigning,
  } = useEnvironmentalAssignment(incident.id);

  // Only HSSE Manager or HSSE Expert can assign
  const canAssign = hasRole('hsse_manager') || hasRole('hsse_expert');

  // Check if incident has environmental impact (from AI detection or manual selection)
  const hasEnvironmentalImpact = (incident as any).has_environmental_impact ||
    (incident as any).ai_detected_environmental;

  // Don't show if no environmental impact or user can't assign
  if (!hasEnvironmentalImpact || !canAssign) {
    return null;
  }

  const handleAssign = () => {
    if (selectedExpertId) {
      assignExpert(selectedExpertId, {
        onSuccess: () => {
          setSelectedExpertId("");
          onComplete?.();
        },
      });
    }
  };

  const handleUnassign = () => {
    unassignExpert(undefined, {
      onSuccess: () => {
        onComplete?.();
      },
    });
  };

  if (isLoading) {
    return (
      <Card className="border-green-500/50 bg-green-500/5" dir={direction}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-500/50 bg-green-500/5" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">
              {t('investigation.environmental.assignmentTitle', 'Environmental Expert Assignment')}
            </CardTitle>
          </div>
          {isAssigned ? (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
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
            ? t('investigation.environmental.expertAssignedDesc', 'An environmental expert has been assigned to assess the environmental impact.')
            : t('investigation.environmental.assignExpertDesc', 'Assign an environmental expert to assess and document the environmental impact of this incident.')
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAssigned ? (
          // Show assigned expert
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">{assignedExpert?.full_name}</p>
                <p className="text-sm text-muted-foreground">{assignedExpert?.email}</p>
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
            {availableExperts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>{t('investigation.environmental.noExpertsAvailable', 'No environmental experts available in this tenant.')}</p>
                <p className="text-sm mt-1">{t('investigation.environmental.contactAdmin', 'Please contact your administrator to add users with the Environmental Expert role.')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('investigation.environmental.selectExpert', 'Select Environmental Expert')}
                  </label>
                  <Select value={selectedExpertId} onValueChange={setSelectedExpertId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('investigation.environmental.selectExpertPlaceholder', 'Choose an expert...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableExperts.map((expert) => (
                        <SelectItem key={expert.id} value={expert.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{expert.full_name}</span>
                            <span className="text-muted-foreground text-xs">({expert.email})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleAssign}
                  disabled={!selectedExpertId || isAssigning}
                >
                  {isAssigning ? (
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 me-2" />
                  )}
                  {t('investigation.environmental.assignExpert', 'Assign Environmental Expert')}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Info about what happens next */}
        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          {isAssigned
            ? t('investigation.environmental.assignedInfo', 'The assigned expert will be notified and can now complete the Environmental Impact assessment tab.')
            : t('investigation.environmental.pendingInfo', 'Once assigned, the expert will receive a notification and can access the Environmental Impact tab to document their assessment.')
          }
        </div>
      </CardContent>
    </Card>
  );
}
