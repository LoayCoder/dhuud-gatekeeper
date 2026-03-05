import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wrench,
  UserPlus,
  Loader2,
  CheckCircle2,
  XCircle,
  User
} from "lucide-react";
import { usePropertyDamageAssignment } from "@/hooks/use-property-damage-assignment";
import { useUserRoles } from '@/features/users';
import type { IncidentWithDetails } from '@/features/incidents';

interface TechEvaluatorAssignmentCardProps {
  incident: IncidentWithDetails;
  onComplete?: () => void;
}

export function TechEvaluatorAssignmentCard({ incident, onComplete }: TechEvaluatorAssignmentCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { hasRole } = useUserRoles();

  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<string>("");

  const {
    assignedEvaluator,
    isAssigned,
    availableEvaluators,
    isLoading,
    assignEvaluator,
    unassignEvaluator,
    isAssigning,
    isUnassigning,
  } = usePropertyDamageAssignment(incident.id);

  // Only HSSE Manager or HSSE Expert can assign
  const canAssign = hasRole('hsse_manager') || hasRole('hsse_expert');

  // Check if incident has property damage
  const hasDamage = (incident as any).has_damage ||
    (incident as any).ai_detected_damage ||
    (incident as any).damage_cost > 0;

  // Don't show if no property damage or user can't assign
  if (!hasDamage || !canAssign) {
    return null;
  }

  const handleAssign = () => {
    if (selectedEvaluatorId) {
      assignEvaluator(selectedEvaluatorId, {
        onSuccess: () => {
          setSelectedEvaluatorId("");
          onComplete?.();
        },
      });
    }
  };

  const handleUnassign = () => {
    unassignEvaluator(undefined, {
      onSuccess: () => {
        onComplete?.();
      },
    });
  };

  if (isLoading) {
    return (
      <Card className="border-amber-500/50 bg-amber-500/5" dir={direction}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/50 bg-amber-500/5" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg">
              {t('investigation.property.assignmentTitle', 'Tech Evaluator Assignment')}
            </CardTitle>
          </div>
          {isAssigned ? (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              <CheckCircle2 className="h-3 w-3 me-1" />
              {t('common.assigned', 'Assigned')}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
              {t('common.pending', 'Pending Assignment')}
            </Badge>
          )}
        </div>
        <CardDescription>
          {isAssigned
            ? t('investigation.property.evaluatorAssignedDesc', 'A tech evaluator has been assigned to assess the property damage.')
            : t('investigation.property.assignEvaluatorDesc', 'Assign a technical evaluator to assess and document property/asset damage for this incident.')
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAssigned ? (
          // Show assigned evaluator
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
                <User className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">{assignedEvaluator?.full_name}</p>
                <p className="text-sm text-muted-foreground">{assignedEvaluator?.email}</p>
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
            {availableEvaluators.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>{t('investigation.property.noEvaluatorsAvailable', 'No tech evaluators available in this tenant.')}</p>
                <p className="text-sm mt-1">{t('investigation.property.contactAdmin', 'Please contact your administrator to add users with the Tech Evaluator role.')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('investigation.property.selectEvaluator', 'Select Tech Evaluator')}
                  </label>
                  <Select value={selectedEvaluatorId} onValueChange={setSelectedEvaluatorId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('investigation.property.selectEvaluatorPlaceholder', 'Choose an evaluator...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEvaluators.map((evaluator) => (
                        <SelectItem key={evaluator.id} value={evaluator.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{evaluator.full_name}</span>
                            <span className="text-muted-foreground text-xs">({evaluator.email})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  onClick={handleAssign}
                  disabled={!selectedEvaluatorId || isAssigning}
                >
                  {isAssigning ? (
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 me-2" />
                  )}
                  {t('investigation.property.assignEvaluator', 'Assign Tech Evaluator')}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Info about what happens next */}
        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          {isAssigned
            ? t('investigation.property.assignedInfo', 'The assigned evaluator will be notified and can now complete the Property Damage assessment tab.')
            : t('investigation.property.pendingInfo', 'Once assigned, the evaluator will receive a notification and can access the Property Damage tab to document their assessment.')
          }
        </div>
      </CardContent>
    </Card>
  );
}


