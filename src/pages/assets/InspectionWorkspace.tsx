import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, ClipboardCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useInspection,
  useInspectionResponses,
  useTemplateItems,
  useSaveInspectionResponse,
  useCompleteInspection,
  useCancelInspection,
} from '@/features/incidents';
import { InspectionItemCard } from '@/features/incidents';
import i18n from '@/i18n';

export default function InspectionWorkspace() {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const { t } = useTranslation();
  const direction = i18n.dir();
  const navigate = useNavigate();

  const { data: inspection, isLoading: inspectionLoading } = useInspection(inspectionId);
  const { data: responses } = useInspectionResponses(inspectionId);
  const { data: templateItems } = useTemplateItems(inspection?.template_id);

  const saveResponse = useSaveInspectionResponse();
  const completeInspection = useCompleteInspection();
  const cancelInspection = useCancelInspection();

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [overallResult, setOverallResult] = useState<'pass' | 'fail' | 'partial'>('pass');
  const [summaryNotes, setSummaryNotes] = useState('');

  const isCompleted = inspection?.status === 'completed';
  const isCancelled = inspection?.status === 'cancelled';
  const isReadOnly = isCompleted || isCancelled;

  // Calculate progress
  const progress = useMemo(() => {
    if (!templateItems?.length) return 0;
    const answered = responses?.filter(r => r.result !== null).length || 0;
    return Math.round((answered / templateItems.length) * 100);
  }, [templateItems, responses]);

  // Check if all required items are answered
  const canComplete = useMemo(() => {
    if (!templateItems) return false;
    const requiredItems = templateItems.filter(item => item.is_required);
    return requiredItems.every(item => {
      const response = responses?.find(r => r.template_item_id === item.id);
      return response?.result !== null && response?.result !== undefined;
    });
  }, [templateItems, responses]);

  // Calculate suggested result
  const suggestedResult = useMemo(() => {
    if (!responses?.length) return 'pass';
    const failed = responses.filter(r => r.result === 'fail').length;
    if (failed > 0) {
      const criticalFailed = responses.some(r => {
        const item = templateItems?.find(i => i.id === r.template_item_id);
        return item?.is_critical && r.result === 'fail';
      });
      return criticalFailed ? 'fail' : 'partial';
    }
    return 'pass';
  }, [responses, templateItems]);

  const handleResponseChange = (templateItemId: string) => (data: {
    response_value?: string;
    result?: 'pass' | 'fail' | 'na';
    notes?: string;
  }) => {
    if (isReadOnly || !inspectionId) return;

    saveResponse.mutate({
      inspection_id: inspectionId,
      template_item_id: templateItemId,
      ...data,
    });
  };

  const handleComplete = async () => {
    if (!inspectionId) return;

    await completeInspection.mutateAsync({
      id: inspectionId,
      overall_result: overallResult,
      summary_notes: summaryNotes || undefined,
    } as unknown as Parameters<typeof completeInspection.mutateAsync>[0]);

    setCompleteDialogOpen(false);
  };

  const handleCancel = async () => {
    if (!inspectionId) return;
    await cancelInspection.mutateAsync(inspectionId);
    navigate(`/assets/${inspection?.asset_id}`);
  };

  if (inspectionLoading) {
    return (
      <div className="container mx-auto py-4 px-3 sm:py-6 sm:px-4 space-y-4" dir={direction}>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="container mx-auto py-6 px-3" dir={direction}>
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">{t('common.notFound')}</p>
          <Button variant="outline" asChild>
            <Link to="/assets">
              <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
              {t('common.back')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const answeredCount = responses?.filter(r => r.result !== null).length || 0;
  const totalCount = templateItems?.length || 0;

  return (
    <div className="container mx-auto py-4 px-3 sm:py-6 sm:px-4 space-y-4 sm:space-y-6" dir={direction}>
      {/* Header — Mobile-responsive */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" asChild>
            <Link to={`/assets/${inspection.asset_id}`}>
              <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{inspection.reference_id}</h1>
              {isCompleted && (
                <Badge className={
                  inspection.overall_result === 'pass' ? 'bg-success text-success-foreground' :
                    inspection.overall_result === 'fail' ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'
                }>
                  {t(`inspections.results.${inspection.overall_result}`)}
                </Badge>
              )}
              {isCancelled && <Badge variant="outline">{t('inspections.cancelled')}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {inspection?.asset?.name} • {inspection?.template?.name}
            </p>
          </div>
        </div>

        {/* Action Buttons — stacked on mobile */}
        {!isReadOnly && (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={handleCancel} 
              disabled={cancelInspection.isPending}
              className="w-full sm:w-auto"
            >
              {cancelInspection.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('inspections.cancelInspection')}
            </Button>
            <Button
              onClick={() => {
                setOverallResult(suggestedResult);
                setCompleteDialogOpen(true);
              }}
              disabled={!canComplete}
              className="w-full sm:w-auto"
            >
              <CheckCircle className="h-4 w-4 me-2" />
              {t('inspections.completeInspection')}
            </Button>
          </div>
        )}
      </div>

      {/* Progress Card */}
      {!isReadOnly && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('common.progress')}</span>
              <span className="text-sm font-semibold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2.5" />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {answeredCount} / {totalCount} {t('inspections.itemsCompleted')}
              </p>
              {!canComplete && totalCount > 0 && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {t('inspections.requiredItemsPending')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Notes (if completed) */}
      {isCompleted && inspection.summary_notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('inspections.summaryNotes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{inspection.summary_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Checklist Items */}
      {totalCount === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <ClipboardCheck className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">{t('inspections.noChecklistItems')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {templateItems?.map((item, index) => {
            const response = responses?.find(r => r.template_item_id === item.id);
            return (
              <div key={item.id} className="flex gap-3 sm:gap-4">
                <div className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-muted text-xs sm:text-sm font-medium shrink-0 mt-1">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <InspectionItemCard
                    item={item}
                    response={response}
                    onResponseChange={handleResponseChange(item.id)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent dir={direction} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              {t('inspections.confirmComplete')}
            </DialogTitle>
            <DialogDescription>
              {t('inspections.confirmCompleteDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Inspection Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{answeredCount}/{totalCount}</p>
                <p className="text-xs text-muted-foreground">{t('inspections.itemsCompleted')}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{progress}%</p>
                <p className="text-xs text-muted-foreground">{t('common.progress')}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('inspections.overallResult')}</Label>
              <Select value={overallResult} onValueChange={(v: 'pass' | 'fail' | 'partial') => setOverallResult(v)} dir={direction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      {t('inspections.results.pass')}
                    </div>
                  </SelectItem>
                  <SelectItem value="partial">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      {t('inspections.results.partial')}
                    </div>
                  </SelectItem>
                  <SelectItem value="fail">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      {t('inspections.results.fail')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('inspections.summaryNotes')}</Label>
              <Textarea
                value={summaryNotes}
                onChange={(e) => setSummaryNotes(e.target.value)}
                placeholder={t('inspections.summaryNotesPlaceholder')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleComplete} disabled={completeInspection.isPending} className="w-full sm:w-auto">
              {completeInspection.isPending ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 me-2" />
              )}
              {completeInspection.isPending ? t('common.saving') : t('inspections.completeInspection')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
