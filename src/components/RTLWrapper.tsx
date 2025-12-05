import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface RTLWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const RTL_LANGUAGES = ["ar", "ur"];

export function RTLWrapper({ children, className }: RTLWrapperProps) {
  const { i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={cn("text-start", className)}
    >
      {children}
    </div>
  );
}
