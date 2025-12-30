import { useTranslation } from 'react-i18next';
import { 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Languages, 
  Timer,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { AnalysisResult, ValidationState } from '@/hooks/use-observation-ai-validator';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { ClarityScoreIndicator } from './ClarityScoreIndicator';

interface AIAnalysisPanelProps {
  validationState: ValidationState;
  analysisResult: AnalysisResult | null;
  processingTime: number;
  blockingReason: string | null;
  onConfirmTranslation: () => void;
  className?: string;
}

export function AIAnalysisPanel({
  validationState,
  analysisResult,
  processingTime,
  blockingReason,
  onConfirmTranslation,
  className
}: AIAnalysisPanelProps) {
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
        <p className="text-sm font-medium">{t('observations.ai.analyzing', 'Analyzing your observation...')}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Timer className="h-3 w-3" />
          <span>{processingTime}s</span>
          {processingTime > 10 && (
            <span className="text-amber-500">({t('observations.ai.takingLonger', 'Taking longer than usual')})</span>
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
            {t('observations.ai.translationDetected', 'Translation Required')}
          </p>
          <Badge variant="secondary" className="mt-1">
            {analysisResult?.originalLanguage} → English
          </Badge>
        </div>
      </div>
      
      <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {t('observations.ai.originalText', 'Original Text')}
          </p>
          <p className="text-sm" dir={direction}>{analysisResult?.originalText}</p>
        </div>
        <div className="border-t pt-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {t('observations.ai.translatedText', 'English Translation')}
          </p>
          <p className="text-sm">{analysisResult?.translatedText}</p>
        </div>
      </div>
      
      <Button 
        onClick={onConfirmTranslation} 
        className="w-full"
        size="sm"
      >
        <CheckCircle2 className="h-4 w-4 me-2" />
        {t('observations.ai.confirmTranslation', 'Confirm Translation')}
      </Button>
    </div>
  );

  const renderValidationFailed = () => (
    <div className="space-y-3 p-4">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-destructive">
            {blockingReason || t('observations.ai.validationFailed', 'Validation Failed')}
          </p>
        </div>
      </div>
      
      {analysisResult && (
        <>
          <ClarityScoreIndicator score={analysisResult.clarityScore} />
          
          {/* Validation Errors */}
          {analysisResult.validationErrors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-destructive">
                {t('observations.ai.issues', 'Issues')}:
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                {analysisResult.validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Ambiguous Terms */}
          {analysisResult.ambiguousTerms.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground">
                {t('observations.ai.ambiguousTerms', 'Ambiguous terms')}:
              </span>
              {analysisResult.ambiguousTerms.map((term, i) => (
                <Badge key={i} variant="outline" className="text-xs text-amber-600 border-amber-300">
                  {term}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Missing Sections */}
          {analysisResult.missingSections.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground">
                {t('observations.ai.missingSections', 'Missing')}:
              </span>
              {analysisResult.missingSections.map((section, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {section}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Improvement Suggestions */}
          {analysisResult.improvementSuggestions.length > 0 && (
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                    {t('observations.ai.suggestions', 'Suggestions')}
                  </p>
                  <ul className="text-xs text-amber-600 dark:text-amber-300 space-y-0.5">
                    {analysisResult.improvementSuggestions.slice(0, 3).map((suggestion, i) => (
                      <li key={i}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderValidated = () => (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          {t('observations.ai.analysisComplete', 'Analysis Complete')}
        </p>
        <Badge variant="secondary" className="ms-auto text-xs">
          {processingTime}s
        </Badge>
      </div>
      
      {analysisResult && (
        <>
          <ClarityScoreIndicator score={analysisResult.clarityScore} />
          
          {/* Auto-Selections with Confidence */}
          <div className="grid grid-cols-1 gap-2">
            <ConfidenceIndicator
              label={t('observations.ai.detectedType', 'Observation Type')}
              value={t(`incidents.observationTypes.${analysisResult.subtype.replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`, analysisResult.subtype)}
              confidence={analysisResult.subtypeConfidence}
            />
            <ConfidenceIndicator
              label={t('observations.ai.detectedSeverity', 'Severity')}
              value={t(`severity.${analysisResult.severity}.label`, analysisResult.severity)}
              confidence={analysisResult.severityConfidence}
            />
            <ConfidenceIndicator
              label={t('observations.ai.detectedLikelihood', 'Likelihood')}
              value={t(`observations.likelihood.${analysisResult.likelihood}`, analysisResult.likelihood)}
              confidence={analysisResult.likelihoodConfidence}
            />
          </div>
          
          {/* Key Risks - Collapsible */}
          {analysisResult.keyRisks.length > 0 && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="text-xs">
                    {t('observations.ai.keyRisks', 'Key Risks')} ({analysisResult.keyRisks.length})
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
        </>
      )}
    </div>
  );

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      validationState === 'analyzing' && "border-primary/50 bg-primary/5",
      validationState === 'awaiting_translation_confirm' && "border-blue-500/50 bg-blue-500/5",
      validationState === 'validation_failed' && "border-destructive/50 bg-destructive/5",
      validationState === 'validated' && "border-green-500/50 bg-green-500/5",
      className
    )}>
      {validationState === 'analyzing' && renderAnalyzingState()}
      {validationState === 'awaiting_translation_confirm' && renderTranslationConfirm()}
      {validationState === 'validation_failed' && renderValidationFailed()}
      {validationState === 'validated' && renderValidated()}
    </div>
  );
}
