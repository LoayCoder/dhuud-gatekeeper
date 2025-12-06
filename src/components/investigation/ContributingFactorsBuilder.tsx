import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, Wand2, ChevronDown, Loader2 } from "lucide-react";
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
}

export function ContributingFactorsBuilder({
  value,
  onChange,
  disabled,
  incidentTitle,
}: ContributingFactorsBuilderProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { rewriteText, isLoading } = useRCAAI();
  const [isOpen, setIsOpen] = useState(value.length > 0);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const generateId = () => crypto.randomUUID();

  const addFactor = () => {
    onChange([
      ...value,
      { id: generateId(), text: '' },
    ]);
    setIsOpen(true);
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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card dir={direction}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {t('investigation.rca.contributingFactors', 'Contributing Factors')}
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {t('common.optional', 'Optional')}
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('investigation.rca.contributingFactorsDescription', 'Other factors that contributed to the incident')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {value.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {value.length} {value.length === 1 ? 'factor' : 'factors'}
                  </span>
                )}
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {value.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground border border-dashed rounded-md">
                <p className="text-sm">{t('investigation.rca.noContributingFactors', 'No contributing factors added.')}</p>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={addFactor}
                  >
                    <Plus className="h-4 w-4 me-1" />
                    {t('investigation.rca.addFactor', 'Add Factor')}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {value.map((entry, index) => (
                  <div key={entry.id} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium mt-1">
                      {index + 1}
                    </span>
                    <div className="flex-1">
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
              <div className="flex justify-end mt-3">
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
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
