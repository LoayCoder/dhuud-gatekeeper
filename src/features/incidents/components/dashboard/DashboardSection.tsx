import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultExpanded?: boolean;
  children: ReactNode;
  className?: string;
  badge?: ReactNode;
}

export function DashboardSection({
  title,
  icon: Icon,
  defaultExpanded = true,
  children,
  className,
  badge,
}: DashboardSectionProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("space-y-4", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full p-3 bg-muted/50 hover:bg-muted/70 rounded-lg transition-colors group"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {isExpanded 
              ? t('common.collapse', 'Collapse') 
              : t('common.expand', 'Expand')}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </button>
      
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
