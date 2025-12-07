import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Minus, Camera, FileText, AlertTriangle, Scale } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { InspectionPhotoUpload } from './InspectionPhotoUpload';
import { NCClassificationDialog } from './NCClassificationDialog';
import { useSaveAuditResponse, type AuditTemplateItem, type AuditResponse } from '@/hooks/use-audit-sessions';
import { cn } from '@/lib/utils';

interface AuditChecklistItemProps {
  item: AuditTemplateItem;
  response?: AuditResponse;
  sessionId: string;
  tenantId: string;
  isLocked: boolean;
}

export function AuditChecklistItem({ 
  item, 
  response, 
  sessionId, 
  tenantId,
  isLocked 
}: AuditChecklistItemProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [result, setResult] = useState<'conforming' | 'non_conforming' | 'na' | null>(response?.result || null);
  const [objectiveEvidence, setObjectiveEvidence] = useState<string>(response?.objective_evidence || '');
  const [notes, setNotes] = useState<string>(response?.notes || '');
  const [photoCount, setPhotoCount] = useState<number>(response?.photo_paths?.length || 0);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showNCDialog, setShowNCDialog] = useState(false);
  const [selectedNCCategory, setSelectedNCCategory] = useState<'minor' | 'major' | 'critical'>(item.nc_category || 'minor');
  const [isSaving, setIsSaving] = useState(false);
  
  const saveResponse = useSaveAuditResponse();
  
  const question = i18n.language === 'ar' && item.question_ar ? item.question_ar : item.question;
  const instructions = i18n.language === 'ar' && item.instructions_ar ? item.instructions_ar : item.instructions;
  
  const saveDebounced = useMemo(() => {
    let timeout: NodeJS.Timeout;
    return (data: Parameters<typeof saveResponse.mutate>[0]) => {
      clearTimeout(timeout);
      setIsSaving(true);
      timeout = setTimeout(async () => {
        try {
          await saveResponse.mutateAsync(data);
        } finally {
          setIsSaving(false);
        }
      }, 1000);
    };
  }, [saveResponse]);
  
  // Auto-save when result changes
  useEffect(() => {
    if (result !== null && result !== response?.result && !isLocked) {
      saveDebounced({
        session_id: sessionId,
        template_item_id: item.id,
        result,
        objective_evidence: objectiveEvidence,
        notes,
        nc_category: result === 'non_conforming' ? selectedNCCategory : undefined,
      });
    }
  }, [result]);
  
  // Auto-save objective evidence
  useEffect(() => {
    if (objectiveEvidence !== (response?.objective_evidence || '') && !isLocked) {
      saveDebounced({
        session_id: sessionId,
        template_item_id: item.id,
        result: result || undefined,
        objective_evidence: objectiveEvidence,
        notes,
      });
    }
  }, [objectiveEvidence]);
  
  const handleResultClick = (newResult: 'conforming' | 'non_conforming' | 'na') => {
    if (isLocked) return;
    
    if (newResult === 'non_conforming' && result !== 'non_conforming') {
      setShowNCDialog(true);
    }
    setResult(newResult);
  };
  
  const handleNCConfirm = (category: 'minor' | 'major' | 'critical', evidence: string) => {
    setSelectedNCCategory(category);
    setObjectiveEvidence(evidence);
    setShowNCDialog(false);
  };
  
  const getResultColor = () => {
    if (result === 'conforming') return 'border-green-500 bg-green-500/5';
    if (result === 'non_conforming') return 'border-red-500 bg-red-500/5';
    if (result === 'na') return 'border-muted bg-muted/30';
    return '';
  };
  
  const getNCBadgeVariant = () => {
    if (selectedNCCategory === 'critical') return 'destructive';
    if (selectedNCCategory === 'major') return 'default';
    return 'secondary';
  };
  
  return (
    <>
      <Card className={cn(
        'transition-colors',
        getResultColor(),
        isLocked && 'opacity-75'
      )}>
        <CardContent className="p-4 space-y-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              {/* Clause Reference & Weight */}
              <div className="flex items-center gap-2 flex-wrap">
                {item.clause_reference && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {item.clause_reference}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Scale className="h-3 w-3" />
                  {t('audits.weight')}: {item.scoring_weight || 1}
                </Badge>
                {item.is_critical && (
                  <Badge variant="destructive" className="text-xs">
                    {t('audits.critical')}
                  </Badge>
                )}
                {item.is_required && (
                  <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                    {t('audits.required')}
                  </Badge>
                )}
              </div>
              
              {/* Question */}
              <p className="font-medium">{question}</p>
              
              {/* Instructions */}
              {instructions && (
                <p className="text-sm text-muted-foreground">{instructions}</p>
              )}
            </div>
            
            {/* Saving indicator */}
            {isSaving && (
              <span className="text-xs text-muted-foreground animate-pulse">
                {t('common.saving')}...
              </span>
            )}
          </div>
          
          {/* Result Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant={result === 'conforming' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                result === 'conforming' && 'bg-green-600 hover:bg-green-700'
              )}
              onClick={() => handleResultClick('conforming')}
              disabled={isLocked}
            >
              <Check className="h-4 w-4 me-1" />
              {t('audits.conforming')}
            </Button>
            
            <Button
              variant={result === 'non_conforming' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => handleResultClick('non_conforming')}
              disabled={isLocked}
            >
              <X className="h-4 w-4 me-1" />
              {t('audits.nonConforming')}
            </Button>
            
            <Button
              variant={result === 'na' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => handleResultClick('na')}
              disabled={isLocked}
            >
              <Minus className="h-4 w-4 me-1" />
              {t('audits.notApplicable')}
            </Button>
            
            {/* NC Category Badge */}
            {result === 'non_conforming' && (
              <Badge variant={getNCBadgeVariant()} className="ms-2">
                <AlertTriangle className="h-3 w-3 me-1" />
                {t(`audits.nc.${selectedNCCategory}`)}
              </Badge>
            )}
          </div>
          
          {/* Evidence Section */}
          <Collapsible open={showEvidence} onOpenChange={setShowEvidence}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <FileText className="h-4 w-4 me-2" />
                {t('audits.objectiveEvidence')}
                {objectiveEvidence && <Check className="h-3 w-3 ms-2 text-green-500" />}
                {photoCount > 0 && (
                  <Badge variant="secondary" className="ms-2">
                    <Camera className="h-3 w-3 me-1" />
                    {photoCount}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <Textarea
                value={objectiveEvidence}
                onChange={(e) => setObjectiveEvidence(e.target.value)}
                placeholder={t('audits.evidencePlaceholder')}
                rows={2}
                disabled={isLocked}
              />
              
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('audits.notesPlaceholder')}
                rows={2}
                disabled={isLocked}
              />
              
              {response?.id && (
                <InspectionPhotoUpload
                  responseId={response.id}
                  sessionId={sessionId}
                  tenantId={tenantId}
                  templateItemId={item.id}
                  onPhotoCountChange={setPhotoCount}
                  isLocked={isLocked}
                />
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
      
      {/* NC Classification Dialog */}
      <NCClassificationDialog
        open={showNCDialog}
        onOpenChange={setShowNCDialog}
        defaultCategory={item.nc_category || (item.is_critical ? 'critical' : 'minor')}
        onConfirm={handleNCConfirm}
      />
    </>
  );
}
