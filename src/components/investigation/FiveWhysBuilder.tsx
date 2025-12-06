import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Wand2, Sparkles, Loader2, ArrowDown } from "lucide-react";
import { useRCAAI } from "@/hooks/use-rca-ai";
import type { FiveWhyEntry } from "@/hooks/use-investigation";

interface FiveWhysBuilderProps {
  value: FiveWhyEntry[];
  onChange: (entries: FiveWhyEntry[]) => void;
  disabled?: boolean;
  incidentTitle?: string;
  incidentDescription?: string;
}

export function FiveWhysBuilder({ 
  value, 
  onChange, 
  disabled,
  incidentTitle,
  incidentDescription 
}: FiveWhysBuilderProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { rewriteText, suggestWhyAnswer, isLoading } = useRCAAI();
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [loadingAction, setLoadingAction] = useState<'rewrite' | 'suggest' | null>(null);

  const addWhy = () => {
    if (value.length >= 5) return;
    const defaultQuestion = getWhyLabel(value.length);
    onChange([...value, { why: defaultQuestion, answer: '' }]);
  };

  const removeWhy = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateWhy = (index: number, field: 'why' | 'answer', newValue: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange(updated);
  };

  const getWhyLabel = (index: number) => {
    const labels = [
      t('investigation.rca.why1', 'Why did this incident occur?'),
      t('investigation.rca.why2', 'Why did that occur?'),
      t('investigation.rca.why3', 'Why was that the case?'),
      t('investigation.rca.why4', 'Why did that happen?'),
      t('investigation.rca.why5', 'What is the root cause?'),
    ];
    return labels[index] || `Why #${index + 1}`;
  };

  const handleRewriteAnswer = async (index: number) => {
    const currentAnswer = value[index]?.answer;
    if (!currentAnswer?.trim()) return;

    setLoadingIndex(index);
    setLoadingAction('rewrite');

    const result = await rewriteText(
      currentAnswer,
      `This is the answer to "Why #${index + 1}" in a 5-Whys root cause analysis for the incident: ${incidentTitle}`
    );

    if (result) {
      updateWhy(index, 'answer', result);
    }

    setLoadingIndex(null);
    setLoadingAction(null);
  };

  const handleSuggestAnswer = async (index: number) => {
    setLoadingIndex(index);
    setLoadingAction('suggest');

    const rcaData = {
      five_whys: value.map((entry, i) => ({
        question: entry.why,
        answer: entry.answer,
      })),
      incident_title: incidentTitle,
      incident_description: incidentDescription,
    };

    const result = await suggestWhyAnswer(rcaData, index + 1);

    if (result) {
      updateWhy(index, 'answer', result);
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
        <h4 className="font-medium text-foreground">
          {t('investigation.rca.fiveWhys', '5 Whys Analysis')}
        </h4>
        {value.length < 5 && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addWhy}
          >
            <Plus className="h-4 w-4 me-1" />
            {t('investigation.rca.addWhy', 'Add Why')}
          </Button>
        )}
      </div>

      {value.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>{t('investigation.rca.noWhysYet', 'No "Why" questions added yet.')}</p>
            <p className="text-sm mt-1">
              {t('investigation.rca.fiveWhysExplanation', 'Start the 5-Whys analysis to dig deeper into root causes.')}
            </p>
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={addWhy}
              >
                <Plus className="h-4 w-4 me-1" />
                {t('investigation.rca.startAnalysis', 'Start Analysis')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {value.map((entry, index) => (
            <div key={index} className="relative">
              <Card className="relative overflow-hidden">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    {/* Step indicator */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-sm">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      {/* Question */}
                      <div>
                        <label className="text-sm font-medium text-foreground">
                          {t('investigation.rca.whyQuestion', 'Why Question')}
                        </label>
                        <Input
                          value={entry.why}
                          onChange={(e) => updateWhy(index, 'why', e.target.value)}
                          placeholder={getWhyLabel(index)}
                          disabled={disabled}
                          className="mt-1"
                        />
                      </div>
                      
                      {/* Answer with AI buttons */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-foreground">
                            {t('investigation.rca.answer', 'Answer')}
                          </label>
                          {!disabled && (
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleRewriteAnswer(index)}
                                disabled={isLoading || !entry.answer?.trim()}
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
                                onClick={() => handleSuggestAnswer(index)}
                                disabled={isLoading}
                              >
                                {isButtonLoading(index, 'suggest') ? (
                                  <Loader2 className="h-3 w-3 me-1 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3 w-3 me-1" />
                                )}
                                {t('investigation.rca.ai.suggest', 'AI Suggest')}
                              </Button>
                            </div>
                          )}
                        </div>
                        <Textarea
                          value={entry.answer}
                          onChange={(e) => updateWhy(index, 'answer', e.target.value)}
                          placeholder={t('investigation.rca.answerPlaceholder', 'Enter the answer based on investigation findings...')}
                          disabled={disabled}
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                    </div>
                    
                    {/* Delete button */}
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive flex-shrink-0"
                        onClick={() => removeWhy(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Arrow connector between cards */}
              {index < value.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {value.length > 0 && value.length < 5 && !disabled && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            {t('investigation.rca.whysRemaining', '{{count}} more "Why" questions can be added', { count: 5 - value.length })}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addWhy}
          >
            <Plus className="h-4 w-4 me-1" />
            {t('investigation.rca.addNextWhy', 'Add Why #{{num}}', { num: value.length + 1 })}
          </Button>
        </div>
      )}
    </div>
  );
}
