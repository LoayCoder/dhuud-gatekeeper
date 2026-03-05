import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Wand2, Lightbulb, Loader2 } from "lucide-react";
import { useRCAAI } from "@/hooks/use-rca-ai";

export interface ContributingFactorEntry {
  id: string;
  text: string;
}

interface ContributingFactorsBuilderProps {
  value: ContributingFactorEntry[];
  onChange: (entries: ContributingFactorEntry[]) => void;
  disabled?: boolean;
  incidentTitle?: string;
  incidentDescription?: string;
  immediateCause?: string;
  underlyingCause?: string;
  rootCauses?: Array<{ id: string; text: string }>;
  // New props for progressive data flow
  fiveWhys?: Array<{ why: string; answer: string }>;
  severity?: string;
  eventType?: string;
  eventSubtype?: string;
  witnessStatements?: Array<{ name: string; statement: string }>;
  evidenceDescriptions?: string[];
}

export function ContributingFactorsBuilder({
  value,
  onChange,
  disabled,
  incidentTitle,
  incidentDescription,
  immediateCause,
  underlyingCause,
  rootCauses,
  fiveWhys,
  severity,
  eventType,
  eventSubtype,
  witnessStatements,
  evidenceDescriptions,
}: ContributingFactorsBuilderProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { rewriteText, generateContributingFactor, isLoading } = useRCAAI();
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const generateId = () => crypto.randomUUID();

  const addFactor = () => {
    onChange([
      ...value,
      { id: generateId(), text: '' },
    ]);
  };

  const removeFactor = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateFactor = (index: number, text: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], text };
    onChange(updated);
  };

  const handleRewrite = async (index: number) => {
    const currentText = value[index]?.text;
    if (!currentText?.trim()) return;

    setLoadingIndex(index);

    const result = await rewriteText(
      currentText,
      `This is a contributing factor in an HSSE incident investigation for: ${incidentTitle}`
    );

    if (result) {
      updateFactor(index, result);
    }

    setLoadingIndex(null);
  };

  const handleAISuggest = async () => {
    setIsSuggesting(true);

    const rcaData = {
      incident_title: incidentTitle,
      incident_description: incidentDescription,
      severity: severity,
      event_type: eventType,
      event_subtype: eventSubtype,
      five_whys: fiveWhys?.map((entry) => ({
        question: entry.why,
        answer: entry.answer,
      })),
      immediate_cause: immediateCause,
      underlying_cause: underlyingCause,
      root_causes: rootCauses,
      contributing_factors_list: value,
      witness_statements: witnessStatements,
      evidence_descriptions: evidenceDescriptions,
    };

    const result = await generateContributingFactor(rcaData);

    if (result) {
      onChange([
        ...value,
        { id: generateId(), text: result },
      ]);
    }

    setIsSuggesting(false);
  };

  // Check if root causes have been identified for dependency
  const hasRootCauses = rootCauses?.some(rc => rc.text?.trim());

  return (
    <Card dir={direction} className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">5</span>
              {t('investigation.rca.contributingFactors', 'Contributing Factors')}
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {t('common.optional', 'Optional')}
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t('investigation.rca.contributingFactorsDescription', 'Other factors that contributed to the incident')}
            </p>
          </div>
          {value.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {value.length} {value.length === 1 ? t('investigation.rca.factor', 'factor') : t('investigation.rca.factors', 'factors')}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 min-w-0 overflow-hidden">
        {value.length === 0 ? (
          <div className="text-center py-6 border border-dashed rounded-md">
            <p className="text-sm text-muted-foreground mb-3">{t('investigation.rca.noContributingFactors', 'No contributing factors added.')}</p>
            {!disabled && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFactor}
                >
                  <Plus className="h-4 w-4 me-1" />
                  {t('investigation.rca.addFactor', 'Add Factor')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAISuggest}
                  disabled={isSuggesting || !hasRootCauses}
                  title={!hasRootCauses ? t('investigation.rca.ai.completeRootCausesFirst', 'Identify at least one Root Cause first') : undefined}
                >
                  {isSuggesting ? (
                    <Loader2 className="h-4 w-4 me-1 animate-spin" />
                  ) : (
                    <Lightbulb className="h-4 w-4 me-1" />
                  )}
                  {t('investigation.rca.ai.suggest', 'AI Suggest')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {value.map((entry, index) => (
              <div key={entry.id} className="flex items-start gap-2 min-w-0">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium mt-1">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-end mb-1">
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleRewrite(index)}
                        disabled={isLoading || !entry.text?.trim()}
                      >
                        {isLoading && loadingIndex === index ? (
                          <Loader2 className="h-3 w-3 me-1 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3 me-1" />
                        )}
                        {t('investigation.rca.ai.rewrite', 'AI Rewrite')}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={entry.text}
                    onChange={(e) => updateFactor(index, e.target.value)}
                    placeholder={t('investigation.rca.contributingFactorPlaceholder', 'Describe the contributing factor...')}
                    disabled={disabled}
                    rows={2}
                  />
                </div>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive flex-shrink-0 mt-1"
                    onClick={() => removeFactor(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {value.length > 0 && !disabled && (
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAISuggest}
              disabled={isSuggesting || !hasRootCauses}
              title={!hasRootCauses ? t('investigation.rca.ai.completeRootCausesFirst', 'Identify at least one Root Cause first') : undefined}
            >
              {isSuggesting ? (
                <Loader2 className="h-4 w-4 me-1 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4 me-1" />
              )}
              {t('investigation.rca.ai.suggest', 'AI Suggest')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addFactor}
            >
              <Plus className="h-4 w-4 me-1" />
              {t('investigation.rca.addAnotherFactor', 'Add Another Factor')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
