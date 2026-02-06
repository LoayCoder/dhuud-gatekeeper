import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PublicVehiclePlateInputProps {
  letters: string;
  numbers: string;
  onLettersChange: (value: string) => void;
  onNumbersChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function PublicVehiclePlateInput({
  letters,
  numbers,
  onLettersChange,
  onNumbersChange,
  disabled = false,
  className,
}: PublicVehiclePlateInputProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  // Handle letters input - allow Arabic and Latin letters, max 3
  const handleLettersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Zأ-ي]/g, "")
      .slice(0, 3);
    onLettersChange(value);
  };

  // Handle numbers input - digits only, max 4
  const handleNumbersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    onNumbersChange(value);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm">
        {isRTL ? "لوحة المركبة" : "Vehicle Plate"}
      </Label>
      
      <div className="flex items-center gap-2">
        {/* Plate Preview Box */}
        <div className="flex items-center justify-center bg-muted border-2 border-border rounded-lg px-3 py-2 min-w-[140px] h-12">
          <div className="flex items-center gap-2 font-mono font-bold text-lg tracking-wider">
            <span className={cn(
              "text-foreground",
              !letters && "text-muted-foreground"
            )}>
              {letters || (isRTL ? "أ ب ج" : "ABC")}
            </span>
            <span className="text-muted-foreground">|</span>
            <span className={cn(
              "text-foreground",
              !numbers && "text-muted-foreground"
            )}>
              {numbers || "1234"}
            </span>
          </div>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">
            {isRTL ? "الحروف" : "Letters"}
          </Label>
          <Input
            value={letters}
            onChange={handleLettersChange}
            placeholder={isRTL ? "أ ب ج" : "ABC"}
            disabled={disabled}
            maxLength={3}
            className="h-10 mt-1 text-center font-mono uppercase tracking-widest"
            dir="ltr"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">
            {isRTL ? "الأرقام" : "Numbers"}
          </Label>
          <Input
            type="tel"
            value={numbers}
            onChange={handleNumbersChange}
            placeholder="1234"
            disabled={disabled}
            maxLength={4}
            className="h-10 mt-1 text-center font-mono tracking-widest"
            dir="ltr"
          />
        </div>
      </div>
    </div>
  );
}
