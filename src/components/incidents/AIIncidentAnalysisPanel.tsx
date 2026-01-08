import { useTranslation } from 'react-i18next';
import { 
  Loader2, 
  CheckCircle2, 
  Languages, 
  Timer,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Stethoscope,
  Wrench,
  Tags
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { IncidentAnalysisResult, IncidentValidationState } from '@/hooks/use-incident-ai-validator';
import { ConfidenceIndicator } from '@/components/observations/ConfidenceIndicator';
import { ClarityScoreIndicator } from '@/components/observations/ClarityScoreIndicator';
import { AITagsSelector } from '@/components/ai/AITagsSelector';
import type { AITag } from '@/hooks/use-ai-tags';

interface AIIncidentAnalysisPanelProps {
  validationState: IncidentValidationState;
  analysisResult: IncidentAnalysisResult | null;
  processingTime: number;
  onConfirmTranslation: () => void;
  onConfirmAnalysis: () => void;
  availableTags?: AITag[];
  selectedTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  className?: string;
}

export function AIIncidentAnalysisPanel({
  validationState,
  analysisResult,
  processingTime,
  onConfirmTranslation,
  onConfirmAnalysis,
  availableTags = [],
  selectedTags = [],
  onTagsChange,
  className
}: AIIncidentAnalysisPanelProps) {
  const { t, i18n } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const direction = i18n.dir();

  // Don't render if idle
  if (validationState === 'idle' && !analysisResult) {
    return null;
  }

  const renderAnalyzingState = () => (
    <div className="flex items-center gap-3 p-4">
      <div className="relative">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <Sparkles className="h-3 w-3 text-primary absolute -top-1 -end-1" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{t('incidents.ai.analyzingIncident', 'Analyzing your incident...')}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Timer className="h-3 w-3" />
          <span>{processingTime}s</span>
          {processingTime > 10 && (
            <span className="text-amber-500">({t('incidents.ai.takingLonger', 'Taking longer than usual')})</span>
          )}
        </div>
      </div>
    </div>
  );

  const renderTranslationConfirm = () => (
    <div className="space-y-3 p-4">
      <div className="flex items-start gap-2">
        <Languages className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
            {t('incidents.ai.translationDetected', 'Translation Required')}
          </p>
          <Badge variant="secondary" className="mt-1">
            {analysisResult?.originalLanguage} → English
          </Badge>
        </div>
      </div>
      
      <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {t('incidents.ai.originalText', 'Original Text')}
          </p>
          <p className="text-sm" dir={direction}>{analysisResult?.originalText?.slice(0, 200)}...</p>
        </div>
        <div className="border-t pt-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {t('incidents.ai.translatedText', 'English Translation')}
          </p>
          <p className="text-sm">{analysisResult?.translatedText?.slice(0, 200)}...</p>
        </div>
      </div>
      
      <Button 
        type="button"
        onClick={onConfirmTranslation} 
        className="w-full"
        size="sm"
      >
        <CheckCircle2 className="h-4 w-4 me-2" />
        {t('incidents.ai.confirmTranslation', 'Confirm Translation')}
      </Button>
    </div>
  );

  const renderAnalysisReady = () => (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-blue-500" />
        <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
          {t('incidents.ai.analysisReady', 'Analysis Ready')}
        </p>
        <Badge variant="secondary" className="ms-auto text-xs">
          {processingTime}s
        </Badge>
      </div>
      
      {analysisResult && (
        <>
          <ClarityScoreIndicator score={analysisResult.clarityScore} />
          
          <p className="text-xs text-muted-foreground">
            {t('incidents.ai.reviewSelections', 'Review the AI selections and confirm to continue')}
          </p>
          
          {/* Classification with Confidence */}
          <div className="grid grid-cols-1 gap-2">
            {analysisResult.incidentType && (
              <ConfidenceIndicator
                label={t('incidents.ai.detectedIncidentType', 'Incident Type')}
                value={t(`incidents.hsseEventTypes.${analysisResult.incidentType}`, analysisResult.incidentType)}
                confidence={analysisResult.incidentTypeConfidence}
              />
            )}
            <ConfidenceIndicator
              label={t('incidents.ai.detectedSubtype', 'Incident Subtype')}
              value={t(`incidents.subtypes.${analysisResult.subtype}`, analysisResult.subtype)}
              confidence={analysisResult.subtypeConfidence}
            />
            <ConfidenceIndicator
              label={t('incidents.ai.detectedSeverity', 'Severity')}
              value={t(`incidents.severityLevels.${analysisResult.severity}`, analysisResult.severity)}
              confidence={analysisResult.severityConfidence}
            />
          </div>
          
          {/* Injury/Damage Detection */}
          {(analysisResult.hasInjury || analysisResult.hasDamage) && (
            <div className="space-y-2">
              {analysisResult.hasInjury && (
                <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-lg">
                  <Stethoscope className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm">
                    <span className="font-medium text-destructive">
                      {t('incidents.ai.injuryDetected', 'Injury Detected')}
                    </span>
                    {analysisResult.injuryCount && (
                      <span className="text-muted-foreground">
                        {' '}- {analysisResult.injuryCount} {t('incidents.persons', 'person(s)')}
                      </span>
                    )}
                    {analysisResult.injuryDescription && (
                      <p className="text-xs text-muted-foreground mt-0.5">{analysisResult.injuryDescription}</p>
                    )}
                  </div>
                </div>
              )}
              {analysisResult.hasDamage && (
                <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg">
                  <Wrench className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm">
                    <span className="font-medium text-amber-600">
                      {t('incidents.ai.damageDetected', 'Damage Detected')}
                    </span>
                    {analysisResult.damageDescription && (
                      <p className="text-xs text-muted-foreground mt-0.5">{analysisResult.damageDescription}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Key Risks - Collapsible */}
          {analysisResult.keyRisks.length > 0 && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="text-xs">
                    {t('incidents.ai.keyRisks', 'Key Risks')} ({analysisResult.keyRisks.length})
                  </span>
                  {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-1 pt-1">
                  {analysisResult.keyRisks.map((risk, i) => (
                    <Badge key={i} variant="destructive" className="text-xs">
                      {risk}
                    </Badge>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          
          {/* Suggested Tags */}
          {analysisResult.suggestedTags.length > 0 && availableTags.length > 0 && onTagsChange && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">{t('incidents.ai.suggestedTags', 'Suggested Tags')}</span>
              </div>
              <AITagsSelector
                availableTags={availableTags}
                selectedTags={selectedTags}
                suggestedTags={analysisResult.suggestedTags}
                onTagsChange={onTagsChange}
              />
            </div>
          )}
          
          <Button 
            type="button"
            onClick={onConfirmAnalysis}
            className="w-full"
            size="sm"
          >
            <CheckCircle2 className="h-4 w-4 me-2" />
            {t('incidents.ai.confirmAnalysis', 'Confirm Analysis')}
          </Button>
        </>
      )}
    </div>
  );

  const renderValidated = () => (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          {t('incidents.ai.analysisComplete', 'Analysis Applied')}
        </p>
        <Badge variant="secondary" className="ms-auto text-xs">
          {processingTime}s
        </Badge>
      </div>
      
      {analysisResult && (
        <>
          <ClarityScoreIndicator score={analysisResult.clarityScore} size="sm" />
          
          {/* Summary of applied values */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {analysisResult.incidentType && (
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">{t('incidents.incidentType')}:</span>
                <p className="font-medium truncate">{t(`incidents.hsseEventTypes.${analysisResult.incidentType}`, analysisResult.incidentType)}</p>
              </div>
            )}
            <div className="p-2 bg-muted/30 rounded">
              <span className="text-muted-foreground">{t('incidents.subtype')}:</span>
              <p className="font-medium truncate">{t(`incidents.subtypes.${analysisResult.subtype}`, analysisResult.subtype)}</p>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <span className="text-muted-foreground">{t('incidents.severity')}:</span>
              <p className="font-medium">{t(`incidents.severityLevels.${analysisResult.severity}`, analysisResult.severity)}</p>
            </div>
            {selectedTags.length > 0 && (
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">{t('incidents.tags')}:</span>
                <p className="font-medium">{selectedTags.length} {t('common.selected')}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      validationState === 'analyzing' && "border-primary/50 bg-primary/5",
      validationState === 'awaiting_translation_confirm' && "border-blue-500/50 bg-blue-500/5",
      validationState === 'analysis_ready' && "border-blue-500/50 bg-blue-500/5",
      validationState === 'validated' && "border-green-500/50 bg-green-500/5",
      className
    )}>
      {validationState === 'analyzing' && renderAnalyzingState()}
      {validationState === 'awaiting_translation_confirm' && renderTranslationConfirm()}
      {validationState === 'analysis_ready' && renderAnalysisReady()}
      {validationState === 'validated' && renderValidated()}
    </div>
  );
}
