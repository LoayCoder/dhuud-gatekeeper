/**
 * Field selector component for ID card front/back fields
 */
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { FIELD_LABELS, type FrontFieldKey, type BackFieldKey } from "@/types/id-card.types";
import { cn } from "@/lib/utils";

interface FieldSelectorProps {
  title: string;
  availableFields: (FrontFieldKey | BackFieldKey)[];
  selectedFields: (FrontFieldKey | BackFieldKey)[];
  onChange: (fields: (FrontFieldKey | BackFieldKey)[]) => void;
  disabled?: boolean;
  className?: string;
}

export function FieldSelector({
  title,
  availableFields,
  selectedFields,
  onChange,
  disabled = false,
  className,
}: FieldSelectorProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const lang = isRTL ? 'ar' : 'en';

  const handleToggle = (field: FrontFieldKey | BackFieldKey, checked: boolean) => {
    if (checked) {
      onChange([...selectedFields, field]);
    } else {
      onChange(selectedFields.filter(f => f !== field));
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-sm font-medium">{title}</Label>
      <div className="grid grid-cols-2 gap-2">
        {availableFields.map((field) => {
          const isSelected = selectedFields.includes(field);
          const label = FIELD_LABELS[field]?.[lang] || field;

          return (
            <div
              key={field}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md border transition-colors",
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Checkbox
                id={`field-${field}`}
                checked={isSelected}
                onCheckedChange={(checked) => handleToggle(field, !!checked)}
                disabled={disabled}
              />
              <Label
                htmlFor={`field-${field}`}
                className={cn(
                  "text-sm cursor-pointer flex-1",
                  disabled && "cursor-not-allowed"
                )}
              >
                {label}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
