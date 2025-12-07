import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Save } from 'lucide-react';
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
} from '@/hooks/use-inspections';
import { InspectionItemCard } from '@/components/inspections';
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
    const passed = responses.filter(r => r.result === 'pass').length;
    if (failed > 0) {
      // Check if any critical items failed
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
    });
    
    setCompleteDialogOpen(false);
  };
  
  const handleCancel = async () => {
    if (!inspectionId) return;
    await cancelInspection.mutateAsync(inspectionId);
    navigate(`/assets/${inspection?.asset_id}`);
  };
  
  if (inspectionLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6" dir={direction}>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (!inspection) {
    return (
      <div className="container mx-auto py-6" dir={direction}>
        <p className="text-center text-muted-foreground">{t('common.notFound')}</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/assets/${inspection.asset_id}`}>
              <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{inspection.reference_id}</h1>
              {isCompleted && (
                <Badge className={
                  inspection.overall_result === 'pass' ? 'bg-green-600' :
                  inspection.overall_result === 'fail' ? 'bg-red-600' : 'bg-yellow-600'
                }>
                  {t(`inspections.results.${inspection.overall_result}`)}
                </Badge>
              )}
              {isCancelled && <Badge variant="outline">{t('inspections.cancelled')}</Badge>}
            </div>
            <p className="text-muted-foreground">
              {(inspection.asset as any)?.name} • {(inspection.template as any)?.name}
            </p>
          </div>
        </div>
        
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={cancelInspection.isPending}>
              {t('inspections.cancelInspection')}
            </Button>
            <Button
              onClick={() => {
                setOverallResult(suggestedResult);
                setCompleteDialogOpen(true);
              }}
              disabled={!canComplete}
            >
              <CheckCircle className="h-4 w-4 me-2" />
              {t('inspections.completeInspection')}
            </Button>
          </div>
        )}
      </div>
      
      {/* Progress */}
      {!isReadOnly && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('common.progress')}</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {responses?.filter(r => r.result !== null).length || 0} / {templateItems?.length || 0} {t('inspections.itemsCompleted')}
            </p>
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
      <div className="space-y-4">
        {templateItems?.map((item, index) => {
          const response = responses?.find(r => r.template_item_id === item.id);
          return (
            <div key={item.id} className="flex gap-4">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-sm font-medium shrink-0">
                {index + 1}
              </div>
              <div className="flex-1">
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
      
      {/* Complete Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent dir={direction}>
          <DialogHeader>
            <DialogTitle>{t('inspections.confirmComplete')}</DialogTitle>
            <DialogDescription>
              {t('inspections.confirmCompleteDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('inspections.overallResult')}</Label>
              <Select value={overallResult} onValueChange={(v: any) => setOverallResult(v)} dir={direction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {t('inspections.results.pass')}
                    </div>
                  </SelectItem>
                  <SelectItem value="partial">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      {t('inspections.results.partial')}
                    </div>
                  </SelectItem>
                  <SelectItem value="fail">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
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
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleComplete} disabled={completeInspection.isPending}>
              {completeInspection.isPending ? t('common.saving') : t('inspections.completeInspection')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
