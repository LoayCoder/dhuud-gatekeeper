import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS } from './helpers';

export const StepIndicator = ({ currentStep, goToStep, t }: { currentStep: number; goToStep: (step: number) => void; t: (key: string) => string }) => (
  <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 overflow-x-auto px-2">
    {WIZARD_STEPS.map((step, index) => {
      const isCompleted = currentStep > step.id;
      const isCurrent = currentStep === step.id;

      return (
        <div key={step.id} className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => goToStep(step.id)}
            className={cn(
              "flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all text-xs sm:text-sm",
              isCurrent && "bg-primary text-primary-foreground",
              isCompleted && "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30",
              !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
            )}
            disabled={!isCompleted && !isCurrent}
          >
            <span className={cn(
              "flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs sm:text-sm font-medium",
              isCurrent && "bg-primary-foreground text-primary",
              isCompleted && "bg-primary text-primary-foreground",
              !isCurrent && !isCompleted && "bg-muted-foreground/20 text-muted-foreground"
            )}>
              {isCompleted ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : step.id}
            </span>
            <span className="hidden sm:inline font-medium">{t(step.labelKey)}</span>
          </button>
          {index < WIZARD_STEPS.length - 1 && (
            <ChevronRight className={cn(
              "h-4 w-4 sm:h-5 sm:w-5 mx-1 sm:mx-2 rtl:rotate-180",
              isCompleted ? "text-primary" : "text-muted-foreground/50"
            )} />
          )}
        </div>
      );
    })}
  </div>
);

// Event Type Selector Component