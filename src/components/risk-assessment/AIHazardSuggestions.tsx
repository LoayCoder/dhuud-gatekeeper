import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Brain, Plus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface SuggestedHazard {
  description: string;
  description_ar?: string;
  category: string;
  likelihood: number;
  severity: number;
  suggested_controls: string[];
  confidence: number;
  data_source?: string;
}

interface AIHazardSuggestionsProps {
  suggestions: SuggestedHazard[];
  isLoading?: boolean;
  onAddHazard: (hazard: SuggestedHazard) => void;
  onAddAll?: () => void;
}

export function AIHazardSuggestions({
  suggestions,
  isLoading,
  onAddHazard,
  onAddAll,
}: AIHazardSuggestionsProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const handleAdd = (hazard: SuggestedHazard, index: number) => {
    onAddHazard(hazard);
    setAddedIds((prev) => new Set([...prev, index]));
  };

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <Brain className="h-8 w-8 text-blue-600 animate-pulse" />
              <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-1 -end-1 animate-bounce" />
            </div>
            <div className="text-sm text-muted-foreground">
              {t("risk.ai.analyzing", "AI is analyzing activity patterns...")}
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            {t("risk.ai.suggestedHazards", "AI-Suggested Hazards")}
            <Badge variant="secondary" className="ms-2">
              {suggestions.length}
            </Badge>
          </CardTitle>
          {onAddAll && suggestions.length > 1 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddAll}
              className="text-xs"
            >
              <Plus className="h-3 w-3 me-1" />
              {t("risk.ai.addAll", "Add All")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((hazard, index) => {
          const isAdded = addedIds.has(index);
          const description = isRTL && hazard.description_ar 
            ? hazard.description_ar 
            : hazard.description;

          return (
            <div
              key={index}
              className={`border rounded-lg p-3 transition-all ${
                isAdded 
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20" 
                  : "bg-background hover:border-blue-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{description}</div>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {hazard.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      L{hazard.likelihood} × S{hazard.severity} = {hazard.likelihood * hazard.severity}
                    </span>
                  </div>

                  {/* Confidence indicator */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {t("risk.ai.confidence", "Confidence")}:
                    </span>
                    <Progress 
                      value={hazard.confidence * 100} 
                      className="h-1.5 w-20" 
                    />
                    <span className="text-xs font-medium">
                      {Math.round(hazard.confidence * 100)}%
                    </span>
                  </div>

                  {/* Suggested controls preview */}
                  {hazard.suggested_controls.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">
                        {t("risk.ai.suggestedControls", "Controls")}:
                      </span>{" "}
                      {hazard.suggested_controls.slice(0, 2).join(", ")}
                      {hazard.suggested_controls.length > 2 && (
                        <span> +{hazard.suggested_controls.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant={isAdded ? "secondary" : "default"}
                  onClick={() => handleAdd(hazard, index)}
                  disabled={isAdded}
                  className="shrink-0"
                >
                  {isAdded ? (
                    t("risk.ai.added", "Added")
                  ) : (
                    <>
                      <Plus className="h-3 w-3 me-1" />
                      {t("risk.ai.add", "Add")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
