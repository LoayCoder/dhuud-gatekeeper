import { useState } from "react";
import { ChevronDown, LucideIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ProfileCollapsibleCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}

export function ProfileCollapsibleCard({
  title,
  description,
  icon: Icon,
  defaultExpanded = false,
  children,
  className,
  badge,
}: ProfileCollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("w-full", className)}>
      <div className="border border-border/50 bg-card/80 shadow-sm backdrop-blur-sm rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center justify-between w-full px-4 py-3 sm:px-5 sm:py-4 text-start",
              "hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              {Icon && (
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-full shrink-0">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm sm:text-base tracking-tight truncate">
                    {title}
                  </h3>
                  {badge}
                </div>
                {description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground transition-transform duration-200 ms-2",
                isOpen && "rotate-180",
                "rtl:rotate-180 rtl:[&.rotate-180]:rotate-0"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
