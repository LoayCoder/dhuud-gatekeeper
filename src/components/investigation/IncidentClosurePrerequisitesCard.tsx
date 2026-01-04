/**
 * Incident Closure Prerequisites Card
 * 
 * Visual checklist showing all requirements that must be met before an incident
 * can be closed. Displays blocking reasons if any prerequisites are not met.
 */

import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, AlertTriangle, ClipboardCheck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIncidentClosurePrerequisites } from '@/hooks/use-hsse-incident-validation';
import { cn } from '@/lib/utils';

interface IncidentClosurePrerequisitesCardProps {
  incidentId: string | null;
  className?: string;
}

export function IncidentClosurePrerequisitesCard({ incidentId, className }: IncidentClosurePrerequisitesCardProps) {
  const { t } = useTranslation();
  const { data: prerequisites, isLoading } = useIncidentClosurePrerequisites(incidentId);
  
  if (!incidentId) return null;
  
  if (isLoading) {
    return (
      <Card className={cn("border border-border", className)}>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (!prerequisites?.success) {
    return null;
  }
  
  const { checks, blocking_reasons, ready_for_closure } = prerequisites;
  
  const checkItems = [
    { key: 'investigation_complete', label: t('investigation.prerequisites.investigationComplete', 'Investigation Completed') },
    { key: 'root_cause_documented', label: t('investigation.prerequisites.rootCauseDocumented', 'Root Cause Documented') },
    { key: 'immediate_cause_documented', label: t('investigation.prerequisites.immediateCauseDocumented', 'Immediate Cause Documented') },
    { key: 'all_actions_completed', label: t('investigation.prerequisites.actionsCompleted', 'All Actions Completed') },
    { key: 'all_actions_verified', label: t('investigation.prerequisites.actionsVerified', 'All Actions Verified') },
    { key: 'violation_finalized', label: t('investigation.prerequisites.violationFinalized', 'Violation Finalized (if applicable)') },
    { key: 'hsse_validated', label: t('investigation.prerequisites.hsseValidated', 'HSSE Validated') },
  ];
  
  const completedCount = checkItems.filter(item => checks[item.key as keyof typeof checks]).length;
  const totalCount = checkItems.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  
  return (
    <Card className={cn(
      "border-2",
      ready_for_closure ? "border-success/50" : "border-warning/50",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className={cn("h-5 w-5", ready_for_closure ? "text-success" : "text-warning")} />
            <CardTitle className="text-lg">
              {t('investigation.prerequisites.title', 'Closure Prerequisites')}
            </CardTitle>
          </div>
          <Badge variant={ready_for_closure ? "default" : "secondary"} className={ready_for_closure ? "bg-success" : ""}>
            {completedCount}/{totalCount}
          </Badge>
        </div>
        <CardDescription>
          {ready_for_closure 
            ? t('investigation.prerequisites.readyDescription', 'All prerequisites met. Incident is ready for closure.')
            : t('investigation.prerequisites.pendingDescription', 'Complete all items before the incident can be closed.')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500",
                ready_for_closure ? "bg-success" : "bg-warning"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-end">
            {progressPercent}% {t('common.complete', 'complete')}
          </p>
        </div>
        
        {/* Checklist */}
        <div className="space-y-2">
          {checkItems.map((item) => {
            const isChecked = checks[item.key as keyof typeof checks];
            return (
              <div 
                key={item.key}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md transition-colors",
                  isChecked ? "bg-success/10" : "bg-muted/50"
                )}
              >
                {isChecked ? (
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <span className={cn(
                  "text-sm",
                  isChecked ? "text-foreground" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Blocking Reasons */}
        {!ready_for_closure && blocking_reasons.length > 0 && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">
                {t('investigation.prerequisites.blockingReasons', 'Blocking Reasons:')}
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {blocking_reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
