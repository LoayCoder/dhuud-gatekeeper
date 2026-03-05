import React from "react";
import { ChevronLeft, ChevronRight, Save, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WizardNavigation({ state }: { state: unknown }) {
  const { t, isRTL } = state;
  const {
    currentStep, setCurrentStep,
    saveAssessment, isSaving, canProceed
  } = state;

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        onClick={() => setCurrentStep((s: number) => Math.max(1, s - 1))}
        disabled={currentStep === 1}
      >
        {isRTL ? <ChevronRight className="h-4 w-4 me-2" /> : <ChevronLeft className="h-4 w-4 me-2" />}
        {t("common.back", "Back")}
      </Button>

      <div className="flex items-center gap-2">
        {currentStep === 5 ? (
          <>
            <Button
              variant="outline"
              onClick={() => saveAssessment("draft")}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 me-2" />
              {t("risk.saveAsDraft", "Save Draft")}
            </Button>
            <Button
              onClick={() => saveAssessment("under_review")}
              disabled={isSaving || !canProceed()}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 me-2" />
              )}
              {t("risk.submitForReview", "Submit for Review")}
            </Button>
          </>
        ) : (
          <Button
            onClick={() => setCurrentStep((s: number) => Math.min(5, s + 1))}
            disabled={!canProceed()}
          >
            {t("common.next", "Next")}
            {isRTL ? <ChevronLeft className="h-4 w-4 ms-2" /> : <ChevronRight className="h-4 w-4 ms-2" />}
          </Button>
        )}
      </div>
    </div>
  );
}
