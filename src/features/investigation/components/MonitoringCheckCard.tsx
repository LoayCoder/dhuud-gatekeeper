import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, Calendar, CheckCircle, AlertTriangle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, differenceInDays, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { 
  useMonitoringChecks, 
  useCompleteMonitoringCheck,
  type MonitoringCheck 
} from "@/hooks/use-effectiveness-monitoring";

interface MonitoringCheckCardProps {
  incident: {
    id: string;
    reference_id?: string | null;
    title: string;
    status?: string | null;
    monitoring_period_days?: number | null;
    monitoring_started_at?: string | null;
    monitoring_due_at?: string | null;
    recurrence_detected?: boolean | null;
  };
  onComplete?: () => void;
}

export function MonitoringCheckCard({ incident, onComplete }: MonitoringCheckCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const dateLocale = isRTL ? ar : enUS;

  const [selectedCheck, setSelectedCheck] = useState<MonitoringCheck | null>(null);
  const [findings, setFindings] = useState("");
  const [recurrenceFound, setRecurrenceFound] = useState(false);

  const { data: checks, isLoading: loadingChecks } = useMonitoringChecks(incident.id);
  const { mutate: completeCheck, isPending } = useCompleteMonitoringCheck();

  // Only show for incidents in monitoring status
  const isMonitoring = ['monitoring_30_day', 'monitoring_60_day', 'monitoring_90_day'].includes(incident.status || '');
  if (!isMonitoring) {
    return null;
  }

  const handleSubmit = () => {
    if (!selectedCheck || !findings.trim()) return;

    completeCheck({
      checkId: selectedCheck.id,
      findings,
      recurrenceFound,
    }, {
      onSuccess: () => {
        setSelectedCheck(null);
        setFindings("");
        setRecurrenceFound(false);
        onComplete?.();
      },
    });
  };

  // Calculate progress
  const completedChecks = checks?.filter(c => c.status === 'completed').length || 0;
  const totalChecks = checks?.length || 0;
  const progress = totalChecks > 0 ? (completedChecks / totalChecks) * 100 : 0;

  // Days remaining
  const daysRemaining = incident.monitoring_due_at 
    ? differenceInDays(parseISO(incident.monitoring_due_at), new Date())
    : 0;

  // Find next pending check
  const pendingChecks = checks?.filter(c => c.status === 'pending' || c.status === 'overdue')
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()) || [];

  if (loadingChecks) {
    return (
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <Eye className="h-5 w-5" />
            {t('workflow.monitoring.title', 'Effectiveness Monitoring')}
          </CardTitle>
          <Badge variant="outline" className="border-blue-300 text-blue-700">
            {incident.monitoring_period_days} {t('workflow.monitoring.days', 'days')}
          </Badge>
        </div>
        <CardDescription>
          {t('workflow.monitoring.description', 'Verify that corrective actions remain effective and no recurrence has occurred.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('workflow.monitoring.progress', 'Monitoring Progress')}
            </span>
            <span className="font-medium">{completedChecks} / {totalChecks} {t('workflow.monitoring.checksCompleted', 'checks')}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {incident.monitoring_started_at && format(parseISO(incident.monitoring_started_at), 'PP', { locale: dateLocale })}
            </span>
            <span className={`font-medium ${daysRemaining < 7 ? 'text-amber-600' : 'text-blue-600'}`}>
              {daysRemaining > 0 
                ? t('workflow.monitoring.daysRemaining', '{{days}} days remaining', { days: daysRemaining })
                : t('workflow.monitoring.overdue', 'Overdue')
              }
            </span>
          </div>
        </div>

        {/* Recurrence Alert */}
        {incident.recurrence_detected && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {t('workflow.monitoring.recurrenceAlert', 'Recurrence has been detected during monitoring. Additional investigation may be required.')}
            </AlertDescription>
          </Alert>
        )}

        {/* Check List */}
        <div className="space-y-2">
          <Label>{t('workflow.monitoring.scheduledChecks', 'Scheduled Checks')}</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {checks?.map((check) => {
              const isOverdue = check.status === 'overdue';
              const isCompleted = check.status === 'completed';
              const isPending = check.status === 'pending';
              
              return (
                <div
                  key={check.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    isCompleted ? 'bg-green-50 border-green-200 dark:bg-green-900/20' :
                    isOverdue ? 'bg-red-50 border-red-200 dark:bg-red-900/20' :
                    selectedCheck?.id === check.id ? 'bg-blue-100 border-blue-300 dark:bg-blue-900/30' :
                    'hover:bg-muted/50 cursor-pointer'
                  }`}
                  onClick={() => !isCompleted && setSelectedCheck(check)}
                >
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : isOverdue ? (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    ) : (
                      <RefreshCw className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {format(parseISO(check.scheduled_date), 'PP', { locale: dateLocale })}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {check.check_type === 'final' 
                          ? t('workflow.monitoring.finalCheck', 'Final Check')
                          : t('workflow.monitoring.periodicCheck', 'Periodic Check')
                        }
                      </p>
                    </div>
                  </div>
                  <Badge variant={isCompleted ? 'default' : isOverdue ? 'destructive' : 'outline'}>
                    {isCompleted ? t('common.completed', 'Completed') :
                     isOverdue ? t('common.overdue', 'Overdue') :
                     t('common.pending', 'Pending')}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Complete Check Form */}
        {selectedCheck && (
          <div className="space-y-4 pt-4 border-t">
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                {t('workflow.monitoring.completingCheck', 'Completing check for')} {format(parseISO(selectedCheck.scheduled_date), 'PP', { locale: dateLocale })}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="check-findings">
                {t('workflow.monitoring.findings', 'Findings')}
                <span className="text-destructive ms-1">*</span>
              </Label>
              <Textarea
                id="check-findings"
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder={t('workflow.monitoring.findingsPlaceholder', 'Document your observations during this monitoring check...')}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="recurrence-found"
                checked={recurrenceFound}
                onCheckedChange={(checked) => setRecurrenceFound(checked === true)}
              />
              <Label htmlFor="recurrence-found" className="text-sm font-normal cursor-pointer">
                {t('workflow.monitoring.recurrenceFound', 'Recurrence or similar issue detected')}
              </Label>
            </div>

            {recurrenceFound && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('workflow.monitoring.recurrenceWarning', 'Marking recurrence will flag this incident for additional review.')}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCheck(null);
                  setFindings("");
                  setRecurrenceFound(false);
                }}
                className="flex-1"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!findings.trim() || isPending}
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                    {t('common.saving', 'Saving...')}
                  </>
                ) : (
                  t('workflow.monitoring.completeCheck', 'Complete Check')
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
