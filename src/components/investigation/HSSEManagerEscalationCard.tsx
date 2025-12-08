import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowUp, Ban, Loader2, AlertTriangle, MessageSquare } from "lucide-react";
import { useHSSEManagerEscalation } from "@/hooks/use-hsse-workflow";
import { useUserRoles } from "@/hooks/use-user-roles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface HSSEManagerEscalationCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

type ExtendedIncident = IncidentWithDetails & {
  manager_rejection_reason?: string;
  reporter_dispute_notes?: string;
  reporter_disputes_rejection?: boolean;
};

export function HSSEManagerEscalationCard({ incident, onComplete }: HSSEManagerEscalationCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [justification, setJustification] = useState("");
  const [selectedDecision, setSelectedDecision] = useState<'override' | 'maintain' | null>(null);
  
  const { hasRole } = useUserRoles();
  const escalation = useHSSEManagerEscalation();
  
  const isHSSEManager = hasRole('hsse_manager') || hasRole('admin');
  
  if (!isHSSEManager) {
    return null;
  }
  
  const extendedIncident = incident as ExtendedIncident;
  const isDisputeEscalation = extendedIncident.reporter_disputes_rejection;
  const isManagerRejection = !!extendedIncident.manager_rejection_reason;
  
  const handleDecision = () => {
    if (!selectedDecision || !justification.trim()) return;
    
    escalation.mutate({
      incidentId: incident.id,
      decision: selectedDecision,
      justification,
    }, {
      onSuccess: onComplete,
    });
  };

  return (
    <Card className="border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">{t('workflow.escalation.title', 'HSSE Manager Decision Required')}</CardTitle>
          </div>
          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
            {t('workflow.escalation.escalated', 'Escalated')}
          </Badge>
        </div>
        <CardDescription>
          {isDisputeEscalation 
            ? t('workflow.escalation.disputeDescription', 'The reporter has disputed the rejection of their event report.')
            : t('workflow.escalation.managerDescription', 'The department manager has rejected the investigation. Review and make final decision.')
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show rejection reason or dispute notes */}
        {isManagerRejection && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('workflow.escalation.managerReason', 'Manager Rejection Reason')}:</strong>
              <p className="mt-1">{extendedIncident.manager_rejection_reason}</p>
            </AlertDescription>
          </Alert>
        )}
        
        {isDisputeEscalation && extendedIncident.reporter_dispute_notes && (
          <Alert>
            <MessageSquare className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('workflow.escalation.disputeNotes', 'Reporter Dispute')}:</strong>
              <p className="mt-1">{extendedIncident.reporter_dispute_notes}</p>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Decision Selection */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={selectedDecision === 'override' ? 'default' : 'outline'}
            className={selectedDecision === 'override' ? 'bg-green-600 hover:bg-green-700' : ''}
            onClick={() => setSelectedDecision('override')}
            disabled={escalation.isPending}
          >
            <ArrowUp className="h-4 w-4 me-2" />
            {t('workflow.escalation.override', 'Override - Proceed')}
          </Button>
          
          <Button
            variant={selectedDecision === 'maintain' ? 'destructive' : 'outline'}
            onClick={() => setSelectedDecision('maintain')}
            disabled={escalation.isPending}
          >
            <Ban className="h-4 w-4 me-2" />
            {t('workflow.escalation.maintain', 'Maintain - Close')}
          </Button>
        </div>
        
        {selectedDecision && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="justification" className="text-destructive">
                {t('workflow.escalation.justification', 'Justification')} *
              </Label>
              <Textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder={
                  selectedDecision === 'override'
                    ? t('workflow.escalation.overridePlaceholder', 'Explain why the investigation should proceed...')
                    : t('workflow.escalation.maintainPlaceholder', 'Explain why the rejection should be maintained...')
                }
                rows={3}
              />
            </div>
            
            <Button
              onClick={handleDecision}
              disabled={!justification.trim() || escalation.isPending}
              className={selectedDecision === 'override' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={selectedDecision === 'maintain' ? 'destructive' : 'default'}
            >
              {escalation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : null}
              {selectedDecision === 'override'
                ? t('workflow.escalation.confirmOverride', 'Confirm Override')
                : t('workflow.escalation.confirmMaintain', 'Confirm Closure')
              }
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
