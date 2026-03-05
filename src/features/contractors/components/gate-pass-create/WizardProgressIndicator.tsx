import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface WizardProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export function WizardProgressIndicator({
  currentStep,
  totalSteps,
  labels = [],
}: WizardProgressIndicatorProps) {
  return (
    <div className="w-full px-4 py-3">
      {/* Mobile: Simple dots */}
      <div className="flex items-center justify-center gap-2 sm:hidden">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-all duration-300",
              index < currentStep
                ? "bg-primary"
                : index === currentStep
                ? "bg-primary ring-4 ring-primary/20"
                : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>

      {/* Desktop: Full stepper with labels */}
      <div className="hidden sm:flex items-center justify-center">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div key={index} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 border-2",
                  index < currentStep
                    ? "bg-primary border-primary text-primary-foreground"
                    : index === currentStep
                    ? "border-primary text-primary bg-primary/10"
                    : "border-muted-foreground/30 text-muted-foreground bg-muted/50"
                )}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              {labels[index] && (
                <span
                  className={cn(
                    "mt-2 text-xs font-medium max-w-[80px] text-center leading-tight",
                    index <= currentStep ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {labels[index]}
                </span>
              )}
            </div>

            {/* Connector line */}
            {index < totalSteps - 1 && (
              <div
                className={cn(
                  "h-0.5 w-12 md:w-16 mx-2 transition-all duration-300",
                  index < currentStep ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
