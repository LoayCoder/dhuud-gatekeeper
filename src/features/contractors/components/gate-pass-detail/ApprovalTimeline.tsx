import { useTranslation } from "react-i18next";
import { Check, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type ApprovalStep = {
  key: string;
  label: string;
  status: "completed" | "current" | "pending";
  actor?: string;
  timestamp?: string;
};

interface ApprovalTimelineProps {
  steps: ApprovalStep[];
  className?: string;
}

export function ApprovalTimeline({ steps, className }: ApprovalTimelineProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop horizontal timeline */}
      <div className="hidden sm:flex items-center justify-center gap-0">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  step.status === "completed"
                    ? "bg-success border-success text-success-foreground"
                    : step.status === "current"
                    ? "bg-primary/10 border-primary text-primary animate-pulse"
                    : "bg-muted border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {step.status === "completed" ? (
                  <Check className="h-5 w-5" />
                ) : step.status === "current" ? (
                  <Clock className="h-5 w-5" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center max-w-[80px] leading-tight",
                  step.status === "completed"
                    ? "text-success"
                    : step.status === "current"
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {step.actor && (
                <span className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[80px]">
                  {step.actor}
                </span>
              )}
            </div>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 md:w-12 mx-1 transition-all duration-300",
                  step.status === "completed" ? "bg-success" : "bg-muted-foreground/30"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Mobile vertical timeline */}
      <div className="sm:hidden space-y-3">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-start gap-3">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center border-2 flex-shrink-0",
                  step.status === "completed"
                    ? "bg-success border-success text-success-foreground"
                    : step.status === "current"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {step.status === "completed" ? (
                  <Check className="h-4 w-4" />
                ) : step.status === "current" ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>
              {/* Vertical connector */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 h-6 mt-1",
                    step.status === "completed" ? "bg-success" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 min-w-0 pt-1">
              <p
                className={cn(
                  "font-medium text-sm",
                  step.status === "completed"
                    ? "text-success"
                    : step.status === "current"
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              {step.actor && (
                <p className="text-xs text-muted-foreground truncate">{step.actor}</p>
              )}
              {step.timestamp && (
                <p className="text-xs text-muted-foreground/70">{step.timestamp}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
