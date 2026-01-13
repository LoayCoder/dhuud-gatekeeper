import { useState } from "react";
import { LucideIcon, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface SecuritySectionProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  status?: "enabled" | "disabled" | "warning" | null;
  statusLabel?: string;
  statusCount?: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SecuritySection({
  title,
  description,
  icon: Icon,
  status,
  statusLabel,
  statusCount,
  defaultExpanded = true,
  children,
  className,
}: SecuritySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  const getStatusBadgeVariant = () => {
    switch (status) {
      case "enabled":
        return "default";
      case "disabled":
        return "secondary";
      case "warning":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "enabled":
        return "text-green-600 bg-green-500/10";
      case "disabled":
        return "text-muted-foreground bg-muted";
      case "warning":
        return "text-amber-600 bg-amber-500/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        "rounded-lg border bg-card/50 overflow-hidden transition-all duration-200",
        isOpen && "shadow-sm",
        className
      )}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between p-4 text-start transition-colors hover:bg-muted/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("rounded-lg p-2", getStatusColor())}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{title}</span>
                {status && statusLabel && (
                  <Badge 
                    variant={getStatusBadgeVariant()} 
                    className="h-5 text-[10px] font-medium uppercase tracking-wide"
                  >
                    {statusLabel}
                  </Badge>
                )}
                {statusCount !== undefined && statusCount > 0 && (
                  <Badge variant="outline" className="h-5 text-[10px]">
                    {statusCount}
                  </Badge>
                )}
              </div>
              {description && (
                <span className="text-xs text-muted-foreground">{description}</span>
              )}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180",
              "rtl:rotate-180 rtl:data-[state=open]:rotate-0"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="border-t px-4 py-4 space-y-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
