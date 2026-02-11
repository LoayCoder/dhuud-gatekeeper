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

  // Mapping for Arabic letters display (approximation)
  const getArabicLetters = (text: string) => {
    return text.split('').join(' ');
  };

  const getEnglishLetters = (text: string) => {
    return text.split('').join(' ');
  }

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

  const getArabicDigit = (d: string) => {
    const map: Record<string, string> = { '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩' };
    return map[d] || d;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Label className="text-sm font-medium">
        {isRTL ? "معلومات المركبة" : "Vehicle Information"}
      </Label>

      <div className="flex justify-center">
        {/* Realistic Saudi Plate Visualization */}
        <div className="w-full max-w-sm aspect-[2/1] sm:aspect-[3/1] bg-white border-4 border-black rounded-lg flex flex-row overflow-hidden shadow-sm">

          {/* Number Section */}
          <div className="flex-1 flex flex-col border-r-2 border-black">
            <div className="flex-1 flex items-center justify-center text-2xl sm:text-3xl font-bold font-mono pt-2 leading-none">
              {numbers ? numbers.split('').map(n => getArabicDigit(n)).join(' ') : '١ ٢ ٣ ٤'}
            </div>
            <div className="flex-1 flex items-center justify-center text-2xl sm:text-3xl font-bold font-mono pb-2 leading-none">
              {numbers ? numbers.split('').join(' ') : '1 2 3 4'}
            </div>
          </div>

          {/* Letters Section */}
          <div className="flex-1 flex flex-col border-r-2 border-black">
            <div className="flex-1 flex items-center justify-center text-2xl sm:text-3xl font-bold pt-2 leading-none">
              {letters ? getArabicLetters(letters) : 'أ ب ج'}
            </div>
            <div className="flex-1 flex items-center justify-center text-2xl sm:text-3xl font-bold font-mono pb-2 leading-none">
              {letters ? getEnglishLetters(letters) : 'A B C'}
            </div>
          </div>

          {/* KSA Section */}
          <div className="w-16 sm:w-20 bg-white flex flex-col items-center justify-center py-2 gap-1 text-[10px] sm:text-xs font-bold leading-tight">
            <div className="text-center transform scale-y-150">KSA</div>
            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full border border-green-600 flex items-center justify-center my-1">
              <span className="text-green-600 text-lg leading-none">🌴</span>
            </div>
            <div className="text-center transform scale-y-150">السعودية</div>
          </div>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {isRTL ? "الحروف (إنجليزي أو عربي)" : "Letters (Eng or Ar)"}
          </Label>
          <Input
            value={letters}
            onChange={handleLettersChange}
            placeholder={isRTL ? "أ ب ج" : "ABC"}
            disabled={disabled}
            maxLength={3}
            className="h-11 text-center font-mono uppercase tracking-[0.2em] text-lg"
            dir="ltr"
          />
        </div>
        <div className="space-y-1.5">
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
            className="h-11 text-center font-mono tracking-[0.2em] text-lg"
            dir="ltr"
          />
        </div>
      </div>
    </div>
  );
}
