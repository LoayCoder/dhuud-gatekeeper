import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface RTLWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function RTLWrapper({ children, className }: RTLWrapperProps) {
  const { i18n } = useTranslation();
  const direction = i18n.dir();

  return (
    <div
      dir={direction}
      className={cn("text-start", className)}
    >
      {children}
    </div>
  );
}
