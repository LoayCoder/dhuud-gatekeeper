import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { LogIn, LogOut, ArrowLeftRight, Check } from "lucide-react";

export type PassTypeValue = "in" | "out" | "in_out";

interface PassTypeSelectorProps {
  value: PassTypeValue;
  onChange: (value: PassTypeValue) => void;
  disabled?: boolean;
}

const PASS_TYPE_OPTIONS: {
  value: PassTypeValue;
  labelKey: string;
  descriptionKey: string;
  icon: typeof LogIn;
  color: string;
}[] = [
  {
    value: "in",
    labelKey: "gatePasses.passType.in",
    descriptionKey: "gatePasses.passType.inDesc",
    icon: LogIn,
    color: "text-success",
  },
  {
    value: "out",
    labelKey: "gatePasses.passType.out",
    descriptionKey: "gatePasses.passType.outDesc",
    icon: LogOut,
    color: "text-warning",
  },
  {
    value: "in_out",
    labelKey: "gatePasses.passType.in_out",
    descriptionKey: "gatePasses.passType.inOutDesc",
    icon: ArrowLeftRight,
    color: "text-primary",
  },
];

export function PassTypeSelector({
  value,
  onChange,
  disabled = false,
}: PassTypeSelectorProps) {
  const { t } = useTranslation();

  const handleSelect = (type: PassTypeValue) => {
    if (disabled) return;
    onChange(type);
    
    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {PASS_TYPE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            disabled={disabled}
            className={cn(
              "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200",
              "min-h-[100px] touch-manipulation",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              isSelected
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/50 hover:bg-muted/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 end-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
            )}

            {/* Icon */}
            <div
              className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center mb-2 transition-colors",
                isSelected ? "bg-primary/10" : "bg-muted"
              )}
            >
              <Icon className={cn("h-6 w-6", isSelected ? option.color : "text-muted-foreground")} />
            </div>

            {/* Label */}
            <span
              className={cn(
                "font-semibold text-sm text-center",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {t(option.labelKey, option.value)}
            </span>

            {/* Description */}
            <span className="text-xs text-muted-foreground text-center mt-1 hidden sm:block">
              {t(option.descriptionKey, "")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
