import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Wand2, Languages, Loader2, Copy, Check } from "lucide-react";
import { useRCAAI } from "@/hooks/use-rca-ai";
import type { FiveWhyEntry } from "@/hooks/use-investigation";
import type { RootCauseEntry } from "./RootCausesBuilder";

interface AISummaryPanelProps {
  value: string;
  onChange: (summary: string) => void;
  disabled?: boolean;
  fiveWhys?: FiveWhyEntry[];
  immediateCause?: string;
  underlyingCause?: string;
  rootCauses?: RootCauseEntry[];
  contributingFactors?: string;
  incidentTitle?: string;
  incidentDescription?: string;
  generatedAt?: string | null;
  generatedLanguage?: string | null;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'ur', label: 'اردو (Urdu)' },
  { code: 'fil', label: 'Filipino' },
];

export function AISummaryPanel({
  value,
  onChange,
  disabled,
  fiveWhys,
  immediateCause,
  underlyingCause,
  rootCauses,
  contributingFactors,
  incidentTitle,
  incidentDescription,
  generatedAt,
  generatedLanguage,
}: AISummaryPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { generateSummary, rewriteText, translateSummary, isLoading } = useRCAAI();
  
  const [loadingAction, setLoadingAction] = useState<'generate' | 'rewrite' | 'translate' | null>(null);
  const [translateLang, setTranslateLang] = useState<string>('ar');
  const [copied, setCopied] = useState(false);

  const handleGenerateSummary = async () => {
    setLoadingAction('generate');

    const rcaData = {
      five_whys: fiveWhys?.map((entry) => ({
        question: entry.why,
        answer: entry.answer,
      })),
      immediate_cause: immediateCause,
      underlying_cause: underlyingCause,
      root_causes: rootCauses?.map(rc => ({ id: rc.id, text: rc.text })),
      contributing_factors: contributingFactors,
      incident_title: incidentTitle,
      incident_description: incidentDescription,
    };

    const result = await generateSummary(rcaData);

    if (result) {
      onChange(result);
    }

    setLoadingAction(null);
  };

  const handleRewrite = async () => {
    if (!value?.trim()) return;
    
    setLoadingAction('rewrite');

    const result = await rewriteText(
      value,
      'This is an RCA summary for an HSSE incident investigation. Improve clarity while maintaining ISO 45001/OSHA alignment.'
    );

    if (result) {
      onChange(result);
    }

    setLoadingAction(null);
  };

  const handleTranslate = async () => {
    if (!value?.trim() || !translateLang) return;
    
    setLoadingAction('translate');

    const result = await translateSummary(value, translateLang);

    if (result) {
      onChange(result);
    }

    setLoadingAction(null);
  };

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isActionLoading = (action: 'generate' | 'rewrite' | 'translate') => {
    return isLoading && loadingAction === action;
  };

  // Check if we have enough data to generate a summary
  const hasEnoughData = 
    (fiveWhys && fiveWhys.length > 0) || 
    immediateCause?.trim() || 
    underlyingCause?.trim() || 
    (rootCauses && rootCauses.length > 0);

  return (
    <Card dir={direction} className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t('investigation.rca.aiSummary', 'AI-Powered RCA Summary')}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t('investigation.rca.aiSummaryDescription', 'Generate an ISO 45001/OSHA aligned summary of your root cause analysis.')}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 min-w-0 overflow-hidden">
        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleGenerateSummary}
            disabled={isLoading || disabled || !hasEnoughData}
          >
            {isActionLoading('generate') ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 me-2" />
            )}
            {t('investigation.rca.ai.generateSummary', 'Generate Summary')}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRewrite}
            disabled={isLoading || disabled || !value?.trim()}
          >
            {isActionLoading('rewrite') ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 me-2" />
            )}
            {t('investigation.rca.ai.rewriteClarity', 'Rewrite for Clarity')}
          </Button>

          <div className="flex items-center gap-1 w-full sm:w-auto sm:ms-auto">
            <Select value={translateLang} onValueChange={setTranslateLang} disabled={disabled}>
              <SelectTrigger className="w-full sm:w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir={direction}>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTranslate}
              disabled={isLoading || disabled || !value?.trim()}
            >
              {isActionLoading('translate') ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <Languages className="h-4 w-4 me-2" />
              )}
              {t('investigation.rca.ai.translate', 'Translate')}
            </Button>
          </div>
        </div>

        {/* Summary textarea */}
        <div className="relative">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              hasEnoughData
                ? t('investigation.rca.summaryPlaceholder', 'Click "Generate Summary" to create an AI-powered RCA summary...')
                : t('investigation.rca.needMoreData', 'Complete the 5-Whys analysis and identify causes first...')
            }
            disabled={disabled}
            rows={8}
            className="resize-none"
          />
          
          {/* Copy button */}
          {value?.trim() && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 end-2 h-8 w-8"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Generation info */}
        {generatedAt && (
          <p className="text-xs text-muted-foreground">
            {t('investigation.rca.generatedAt', 'Generated on {{date}}', {
              date: new Date(generatedAt).toLocaleString(i18n.language),
            })}
            {generatedLanguage && ` • ${LANGUAGES.find(l => l.code === generatedLanguage)?.label || generatedLanguage}`}
          </p>
        )}

        {!hasEnoughData && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t('investigation.rca.completeAnalysisFirst', 'Complete the 5-Whys analysis and identify at least one cause to generate a summary.')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
