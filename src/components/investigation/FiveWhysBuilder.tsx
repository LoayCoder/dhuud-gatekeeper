import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type { FiveWhyEntry } from "@/hooks/use-investigation";

interface FiveWhysBuilderProps {
  value: FiveWhyEntry[];
  onChange: (entries: FiveWhyEntry[]) => void;
  disabled?: boolean;
}

export function FiveWhysBuilder({ value, onChange, disabled }: FiveWhysBuilderProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const addWhy = () => {
    if (value.length >= 5) return;
    onChange([...value, { why: '', answer: '' }]);
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
      t('investigation.rca.why1', 'Why did this happen?'),
      t('investigation.rca.why2', 'Why did that occur?'),
      t('investigation.rca.why3', 'Why was that the case?'),
      t('investigation.rca.why4', 'Why did that happen?'),
      t('investigation.rca.why5', 'What is the root cause?'),
    ];
    return labels[index] || `Why #${index + 1}`;
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
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={addWhy}
              >
                <Plus className="h-4 w-4 me-1" />
                {t('investigation.rca.startAnalysis', 'Start Analysis')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {value.map((entry, index) => (
            <Card key={index} className="relative">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-foreground">
                        {getWhyLabel(index)}
                      </label>
                      <Input
                        value={entry.why}
                        onChange={(e) => updateWhy(index, 'why', e.target.value)}
                        placeholder={t('investigation.rca.whyPlaceholder', 'Enter the question...')}
                        disabled={disabled}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">
                        {t('investigation.rca.answer', 'Answer')}
                      </label>
                      <Textarea
                        value={entry.answer}
                        onChange={(e) => updateWhy(index, 'answer', e.target.value)}
                        placeholder={t('investigation.rca.answerPlaceholder', 'Enter the answer...')}
                        disabled={disabled}
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  </div>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeWhy(index)}
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

      {value.length > 0 && value.length < 5 && !disabled && (
        <p className="text-sm text-muted-foreground">
          {t('investigation.rca.whysRemaining', '{{count}} more "Why" questions can be added', { count: 5 - value.length })}
        </p>
      )}
    </div>
  );
}
