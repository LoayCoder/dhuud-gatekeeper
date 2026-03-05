import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  MapPin,
  Camera,
  ArrowUp,
  X,
  Play,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useEmergencyProtocols,
  useProtocolExecution,
  useStartProtocolExecution,
  useCompleteProtocolStep,
  useEscalateProtocol,
  useCloseProtocol,
  ProtocolStep,
  StepCompletion,
} from '@/hooks/use-emergency-protocols';

interface EmergencyAlert {
  id: string;
  alert_type: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  status: string;
  source_type?: string;
  source_name?: string;
  guard_id?: string;
}

interface EmergencyProtocolExecutionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: EmergencyAlert | null;
}

export function EmergencyProtocolExecution({
  open,
  onOpenChange,
  alert,
}: EmergencyProtocolExecutionProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [notes, setNotes] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [showEscalation, setShowEscalation] = useState(false);

  const { data: protocols } = useEmergencyProtocols(alert?.alert_type);
  const { data: execution, isLoading: executionLoading } = useProtocolExecution(alert?.id || '');
  
  const startProtocol = useStartProtocolExecution();
  const completeStep = useCompleteProtocolStep();
  const escalateProtocol = useEscalateProtocol();
  const closeProtocol = useCloseProtocol();

  const protocol = protocols?.[0];
  const steps = (protocol?.steps as ProtocolStep[]) || getDefaultSteps(alert?.alert_type);
  const completedSteps = (execution?.steps_completed as StepCompletion[]) || [];

  const isStepCompleted = (stepOrder: number) => 
    completedSteps.some(s => s.step_order === stepOrder);

  const allRequiredCompleted = steps
    .filter(s => s.is_required)
    .every(s => isStepCompleted(s.order));

  const canClose = allRequiredCompleted || showEscalation;

  const handleStart = async () => {
    if (!alert) return;
    await startProtocol.mutateAsync({
      alertId: alert.id,
      protocolId: protocol?.id,
    });
  };

  const handleStepToggle = async (stepOrder: number, checked: boolean) => {
    if (!execution || !alert || !checked) return;
    await completeStep.mutateAsync({
      executionId: execution.id,
      alertId: alert.id,
      stepOrder,
    });
  };

  const handleEscalate = async () => {
    if (!execution || !alert || !escalationReason.trim()) return;
    await escalateProtocol.mutateAsync({
      executionId: execution.id,
      alertId: alert.id,
      reason: escalationReason,
    });
    onOpenChange(false);
  };

  const handleClose = async () => {
    if (!execution || !alert) return;
    await closeProtocol.mutateAsync({
      executionId: execution.id,
      alertId: alert.id,
      notes,
    });
    onOpenChange(false);
  };

  if (!alert) return null;

  const statusColors = {
    new: 'bg-destructive text-destructive-foreground',
    in_progress: 'bg-amber-500 text-white',
    escalated: 'bg-orange-500 text-white',
    closed: 'bg-green-500 text-white',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {isRTL ? 'بروتوكول الطوارئ' : 'Emergency Protocol'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {alert.alert_type} - {format(new Date(alert.created_at), 'PPp')}
                </p>
              </div>
            </div>
            <Badge className={cn(statusColors[execution?.status || 'new'])}>
              {execution?.status || 'new'}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 py-4">
          {/* Alert Info Card */}
          <Card className="mb-4 border-destructive/50 bg-destructive/5">
            <CardContent className="pt-4 grid gap-3 sm:grid-cols-2">
              {alert.source_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">{isRTL ? 'المصدر:' : 'Source:'}</span>{' '}
                    {alert.source_name}
                  </span>
                </div>
              )}
              {alert.latitude && alert.longitude && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                  </span>
                </div>
              )}
              {alert.description && (
                <p className="text-sm col-span-full">{alert.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Protocol Steps */}
          {!execution ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="font-semibold mb-2">
                {isRTL ? 'ابدأ بروتوكول الاستجابة' : 'Start Response Protocol'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isRTL 
                  ? 'اضغط لبدء تنفيذ بروتوكول الطوارئ' 
                  : 'Click to begin emergency protocol execution'}
              </p>
              <Button 
                onClick={handleStart} 
                disabled={startProtocol.isPending}
                className="gap-2"
              >
                {startProtocol.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isRTL ? 'بدء البروتوكول' : 'Start Protocol'}
              </Button>
            </div>
          ) : execution.status === 'closed' ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="font-semibold mb-2">
                {isRTL ? 'تم إغلاق البروتوكول' : 'Protocol Closed'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {execution.completed_at && format(new Date(execution.completed_at), 'PPp')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {isRTL ? 'خطوات الاستجابة' : 'Response Steps'}
              </h3>
              
              {steps.map((step) => {
                const isCompleted = isStepCompleted(step.order);
                const completionInfo = completedSteps.find(s => s.step_order === step.order);
                
                return (
                  <div
                    key={step.order}
                    className={cn(
                      'p-3 rounded-lg border transition-colors',
                      isCompleted 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                        : 'bg-muted/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`step-${step.order}`}
                        checked={isCompleted}
                        disabled={isCompleted || completeStep.isPending}
                        onCheckedChange={(checked) => handleStepToggle(step.order, !!checked)}
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`step-${step.order}`}
                          className={cn(
                            'font-medium cursor-pointer flex items-center gap-2',
                            isCompleted && 'line-through text-muted-foreground'
                          )}
                        >
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                            {step.order}
                          </span>
                          {isRTL ? step.title_ar || step.title : step.title}
                          {step.is_required && (
                            <Badge variant="outline" className="text-xs">
                              {isRTL ? 'مطلوب' : 'Required'}
                            </Badge>
                          )}
                          {step.photo_required && (
                            <Camera className="h-3 w-3 text-muted-foreground" />
                          )}
                        </label>
                        {(step.description || step.description_ar) && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {isRTL ? step.description_ar || step.description : step.description}
                          </p>
                        )}
                        {isCompleted && completionInfo && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {format(new Date(completionInfo.completed_at), 'HH:mm:ss')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Closure Notes */}
              <div className="pt-4 space-y-3">
                <Label>{isRTL ? 'ملاحظات الإغلاق' : 'Closure Notes'}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isRTL ? 'أضف ملاحظات...' : 'Add notes...'}
                  rows={3}
                />
              </div>

              {/* Escalation Section */}
              {showEscalation && (
                <div className="pt-4 space-y-3 p-4 border border-orange-300 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <Label className="text-orange-700 dark:text-orange-400">
                    {isRTL ? 'سبب التصعيد' : 'Escalation Reason'} *
                  </Label>
                  <Textarea
                    value={escalationReason}
                    onChange={(e) => setEscalationReason(e.target.value)}
                    placeholder={isRTL ? 'اشرح سبب التصعيد...' : 'Explain why escalation is needed...'}
                    rows={3}
                    className="border-orange-300"
                  />
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {execution && execution.status !== 'closed' && (
          <DialogFooter className="border-t pt-4 gap-2">
            {!showEscalation ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowEscalation(true)}
                  className="gap-2"
                >
                  <ArrowUp className="h-4 w-4" />
                  {isRTL ? 'تصعيد' : 'Escalate'}
                </Button>
                <Button
                  onClick={handleClose}
                  disabled={!allRequiredCompleted || closeProtocol.isPending}
                  className="gap-2"
                >
                  {closeProtocol.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {isRTL ? 'إغلاق البروتوكول' : 'Close Protocol'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowEscalation(false)}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleEscalate}
                  disabled={!escalationReason.trim() || escalateProtocol.isPending}
                  className="gap-2"
                >
                  {escalateProtocol.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                  {isRTL ? 'تأكيد التصعيد' : 'Confirm Escalation'}
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Default protocol steps when no custom protocol is defined
function getDefaultSteps(alertType?: string): ProtocolStep[] {
  const baseSteps: ProtocolStep[] = [
    { order: 1, title: 'Assess the situation', title_ar: 'تقييم الموقف', is_required: true },
    { order: 2, title: 'Secure the area', title_ar: 'تأمين المنطقة', is_required: true },
    { order: 3, title: 'Contact emergency services if needed', title_ar: 'الاتصال بخدمات الطوارئ إذا لزم الأمر', is_required: false },
    { order: 4, title: 'Document the incident', title_ar: 'توثيق الحادث', is_required: true, photo_required: true },
    { order: 5, title: 'Notify management', title_ar: 'إخطار الإدارة', is_required: true },
    { order: 6, title: 'Complete incident report', title_ar: 'إكمال تقرير الحادث', is_required: true },
  ];

  if (alertType === 'panic') {
    return [
      { order: 1, title: 'Locate the person in distress', title_ar: 'تحديد موقع الشخص', is_required: true },
      { order: 2, title: 'Assess immediate danger', title_ar: 'تقييم الخطر الفوري', is_required: true },
      { order: 3, title: 'Provide assistance or call for backup', title_ar: 'تقديم المساعدة أو طلب الدعم', is_required: true },
      { order: 4, title: 'Document the situation', title_ar: 'توثيق الموقف', is_required: true, photo_required: true },
      { order: 5, title: 'Notify security supervisor', title_ar: 'إخطار مشرف الأمن', is_required: true },
      { order: 6, title: 'Complete follow-up report', title_ar: 'إكمال تقرير المتابعة', is_required: true },
    ];
  }

  return baseSteps;
}
