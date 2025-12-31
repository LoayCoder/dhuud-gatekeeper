import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardList, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Loader2,
  Plus
} from "lucide-react";
import { useDeptRepApproval, useCanApproveDeptRep } from "@/hooks/use-hsse-workflow";
import { ActionsPanel } from "./ActionsPanel";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface DeptRepApprovalCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

export function DeptRepApprovalCard({ incident, onComplete }: DeptRepApprovalCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [notes, setNotes] = useState("");
  const [showActions, setShowActions] = useState(false);
  
  // Use the new can_approve_dept_rep_observation RPC function for observations
  const { data: canApprove } = useCanApproveDeptRep(incident.id);
  const deptRepApproval = useDeptRepApproval();
  
  // Only show for observations in pending_dept_rep_approval status
  if (!canApprove || incident.event_type !== 'observation') {
    return null;
  }
  
  const handleApproveAndClose = () => {
    deptRepApproval.mutate({
      incidentId: incident.id,
      decision: 'approve',
      notes,
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleEscalateToInvestigation = () => {
    deptRepApproval.mutate({
      incidentId: incident.id,
      decision: 'escalate',
      notes,
    }, {
      onSuccess: onComplete,
    });
  };

  return (
    <div className="space-y-4" dir={direction}>
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">
                {t('workflow.deptRepApproval.title', 'Department Representative Review')}
              </CardTitle>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
              {t('workflow.deptRepApproval.pendingAction', 'Action Required')}
            </Badge>
          </div>
          <CardDescription>
            {t('workflow.deptRepApproval.description', 'Review this observation and assign corrective actions before approval')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Observation Summary */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{incident.reference_id}</span>
              <Badge variant="secondary">{incident.event_type}</Badge>
            </div>
            <h4 className="font-medium">{incident.title}</h4>
            <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
          </div>
          
          {/* Expert Screening Notes if available */}
          {(incident as IncidentWithDetails & { expert_screening_notes?: string }).expert_screening_notes && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm font-medium text-amber-800 mb-1">
                {t('workflow.deptRepApproval.expertNotes', 'HSSE Expert Notes')}:
              </p>
              <p className="text-sm text-amber-700">
                {(incident as IncidentWithDetails & { expert_screening_notes?: string }).expert_screening_notes}
              </p>
            </div>
          )}
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="dept-rep-notes">
              {t('workflow.deptRepApproval.notes', 'Review Notes')}
            </Label>
            <Textarea
              id="dept-rep-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('workflow.deptRepApproval.notesPlaceholder', 'Add notes about your review and actions...')}
              rows={3}
            />
          </div>
          
          {/* Toggle Actions Section */}
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setShowActions(!showActions)}
            >
              <Plus className="h-4 w-4" />
              {showActions 
                ? t('workflow.deptRepApproval.hideActions', 'Hide Corrective Actions')
                : t('workflow.deptRepApproval.manageActions', 'Manage Corrective Actions')
              }
            </Button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
              onClick={handleEscalateToInvestigation}
              disabled={deptRepApproval.isPending}
            >
              <AlertTriangle className="h-4 w-4" />
              {t('workflow.deptRepApproval.escalate', 'Escalate to Investigation')}
            </Button>
            
            <Button
              className="flex-1 flex items-center justify-center gap-2"
              onClick={handleApproveAndClose}
              disabled={deptRepApproval.isPending}
            >
              {deptRepApproval.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t('workflow.deptRepApproval.approveClose', 'Approve & Close')}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Corrective Actions Panel - shown when expanded */}
      {showActions && (
        <ActionsPanel incidentId={incident.id} />
      )}
    </div>
  );
}