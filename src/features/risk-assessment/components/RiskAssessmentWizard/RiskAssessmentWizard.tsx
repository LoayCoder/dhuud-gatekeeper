import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WizardProps } from "./types";
import { useRiskAssessmentForm } from "./hooks/useRiskAssessmentForm";
import { STEPS } from "./constants";
import { WizardStep1 } from "./components/WizardStep1";
import { WizardStep2 } from "./components/WizardStep2";
import { WizardStep3 } from "./components/WizardStep3";
import { WizardStep4 } from "./components/WizardStep4";
import { WizardStep5 } from "./components/WizardStep5";
import { WizardNavigation } from "./components/WizardNavigation";

export function RiskAssessmentWizard({ projectId, contractorId, onComplete }: WizardProps) {
  const state = useRiskAssessmentForm(projectId, contractorId, onComplete);
  const { t, currentStep, progress } = state;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                {t("risk.wizard.title", "Risk Assessment")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(`risk.wizard.step${currentStep}`, `Step ${currentStep}`)}
              </p>
            </div>
            <Badge variant="outline">
              {currentStep} / {STEPS.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />

          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isComplete = step.id < currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    isActive ? "text-primary" : isComplete ? "text-green-600" : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isComplete
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {currentStep === 1 && <WizardStep1 state={state} />}
      {currentStep === 2 && <WizardStep2 state={state} />}
      {currentStep === 3 && <WizardStep3 state={state} />}
      {currentStep === 4 && <WizardStep4 state={state} />}
      {currentStep === 5 && <WizardStep5 state={state} />}

      <WizardNavigation state={state} />
    </div>
  );
}

