import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface RTLWrapperProps {
  children: React.ReactNode;
  className?: string;
}

// RTL languages list
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

export function RTLWrapper({ children, className }: RTLWrapperProps) {
  const { i18n } = useTranslation();
  
  // Determine direction based on current language
  const currentLang = i18n.language || 'ar';
  const direction = RTL_LANGUAGES.includes(currentLang.split('-')[0]) ? 'rtl' : 'ltr';

  return (
    <div
      dir={direction}
      className={cn("text-start", className)}
    >
      {children}
    </div>
  );
}
