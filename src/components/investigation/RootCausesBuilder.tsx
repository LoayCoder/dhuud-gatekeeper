import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Wand2, Sparkles, Loader2 } from "lucide-react";
import { useRCAAI } from "@/hooks/use-rca-ai";
import type { FiveWhyEntry } from "@/hooks/use-investigation";

export interface RootCauseEntry {
  id: string;
  text: string;
  added_at?: string;
  added_by?: string;
}

interface RootCausesBuilderProps {
  value: RootCauseEntry[];
  onChange: (entries: RootCauseEntry[]) => void;
  disabled?: boolean;
  fiveWhys?: FiveWhyEntry[];
  immediateCause?: string;
  underlyingCause?: string;
  incidentTitle?: string;
  incidentDescription?: string;
}

export function RootCausesBuilder({
  value,
  onChange,
  disabled,
  fiveWhys,
  immediateCause,
  underlyingCause,
  incidentTitle,
  incidentDescription,
}: RootCausesBuilderProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { rewriteText, suggestCause, isLoading } = useRCAAI();
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [loadingAction, setLoadingAction] = useState<'rewrite' | 'suggest' | null>(null);

  const generateId = () => crypto.randomUUID();

  const addRootCause = () => {
    onChange([
      ...value,
      {
        id: generateId(),
        text: '',
        added_at: new Date().toISOString(),
      },
    ]);
  };

  const removeRootCause = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateRootCause = (index: number, text: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], text };
    onChange(updated);
  };

  const handleRewrite = async (index: number) => {
    const currentText = value[index]?.text;
    if (!currentText?.trim()) return;

    setLoadingIndex(index);
    setLoadingAction('rewrite');

    const result = await rewriteText(
      currentText,
      `This is a root cause in an HSSE incident investigation for: ${incidentTitle}`
    );

    if (result) {
      updateRootCause(index, result);
    }

    setLoadingIndex(null);
    setLoadingAction(null);
  };

  const handleSuggest = async (index: number) => {
    setLoadingIndex(index);
    setLoadingAction('suggest');

    const rcaData = {
      five_whys: fiveWhys?.map((entry) => ({
        question: entry.why,
        answer: entry.answer,
      })),
      immediate_cause: immediateCause,
      underlying_cause: underlyingCause,
      root_causes: value.filter((_, i) => i !== index).map(rc => ({ id: rc.id, text: rc.text })),
      incident_title: incidentTitle,
      incident_description: incidentDescription,
    };

    const result = await suggestCause(rcaData);

    if (result) {
      updateRootCause(index, result);
    }

    setLoadingIndex(null);
    setLoadingAction(null);
  };

  const isButtonLoading = (index: number, action: 'rewrite' | 'suggest') => {
    return isLoading && loadingIndex === index && loadingAction === action;
  };

  return (
    <div className="space-y-4" dir={direction}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-foreground">
            {t('investigation.rca.rootCauses', 'Root Causes')}
          </h4>
          <p className="text-sm text-muted-foreground">
            {t('investigation.rca.rootCausesDescription', 'Identify all fundamental causes. You can add multiple root causes.')}
          </p>
        </div>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRootCause}
          >
            <Plus className="h-4 w-4 me-1" />
            {t('investigation.rca.addRootCause', 'Add Root Cause')}
          </Button>
        )}
      </div>

      {value.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-muted-foreground">
            <p>{t('investigation.rca.noRootCausesYet', 'No root causes identified yet.')}</p>
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={addRootCause}
              >
                <Plus className="h-4 w-4 me-1" />
                {t('investigation.rca.addFirstRootCause', 'Add First Root Cause')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {value.map((entry, index) => (
            <Card key={entry.id} className="relative">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  {/* Root cause number badge */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-foreground">
                        {t('investigation.rca.rootCauseNum', 'Root Cause #{{num}}', { num: index + 1 })}
                      </label>
                      {!disabled && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleRewrite(index)}
                            disabled={isLoading || !entry.text?.trim()}
                          >
                            {isButtonLoading(index, 'rewrite') ? (
                              <Loader2 className="h-3 w-3 me-1 animate-spin" />
                            ) : (
                              <Wand2 className="h-3 w-3 me-1" />
                            )}
                            {t('investigation.rca.ai.rewrite', 'AI Rewrite')}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleSuggest(index)}
                            disabled={isLoading}
                          >
                            {isButtonLoading(index, 'suggest') ? (
                              <Loader2 className="h-3 w-3 me-1 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3 me-1" />
                            )}
                            {t('investigation.rca.ai.suggestCause', 'AI Suggest')}
                          </Button>
                        </div>
                      )}
                    </div>
                    <Textarea
                      value={entry.text}
                      onChange={(e) => updateRootCause(index, e.target.value)}
                      placeholder={t('investigation.rca.rootCausePlaceholder', 'Describe the fundamental reason this incident occurred...')}
                      disabled={disabled}
                      rows={2}
                    />
                  </div>

                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive flex-shrink-0"
                      onClick={() => removeRootCause(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {value.length > 0 && !disabled && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRootCause}
          >
            <Plus className="h-4 w-4 me-1" />
            {t('investigation.rca.addAnotherRootCause', 'Add Another Root Cause')}
          </Button>
        </div>
      )}
    </div>
  );
}
