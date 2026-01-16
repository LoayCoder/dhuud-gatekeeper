import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, XCircle, ShieldCheck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

export type StepStatus = 'completed' | 'current' | 'pending' | 'skipped' | 'rejected' | 'enforced';

interface WorkflowStepNodeProps {
  label: string;
  description?: string;
  status: StepStatus;
  icon: React.ReactNode;
  actorName?: string | null;
  timestamp?: string | null;
  isLast?: boolean;
  variant?: 'horizontal' | 'vertical' | 'compact';
}

export function WorkflowStepNode({
  label,
  description,
  status,
  icon,
  actorName,
  timestamp,
  isLast = false,
  variant = 'horizontal',
}: WorkflowStepNodeProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, HH:mm', { locale: isRTL ? ar : enUS });
    } catch {
      return null;
    }
  };

  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return {
          circle: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-500',
          line: 'bg-green-500',
          text: 'text-foreground',
        };
      case 'current':
        return {
          circle: 'bg-primary/10 text-primary border-primary animate-pulse',
          line: 'bg-muted-foreground/30',
          text: 'text-primary font-semibold',
        };
      case 'rejected':
        return {
          circle: 'bg-destructive/10 text-destructive border-destructive',
          line: 'bg-destructive/50',
          text: 'text-destructive',
        };
      case 'enforced':
        return {
          circle: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-500',
          line: 'bg-amber-500',
          text: 'text-amber-700 dark:text-amber-400 font-semibold',
        };
      default:
        return {
          circle: 'bg-muted text-muted-foreground border-muted-foreground/30',
          line: 'bg-muted-foreground/20',
          text: 'text-muted-foreground',
        };
    }
  };

  const styles = getStatusStyles();

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'enforced':
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return icon;
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full border-2",
          styles.circle
        )}>
          {status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : 
           status === 'current' ? <Circle className="h-3 w-3 fill-current" /> : 
           <Circle className="h-3 w-3" />}
        </div>
        <span className={cn("text-sm", styles.text)}>{label}</span>
        {!isLast && (
          <div className={cn("h-0.5 w-4 rounded-full", styles.line)} />
        )}
      </div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className="flex flex-col items-center">
        <div className="flex items-center">
          {/* Step Circle */}
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
            styles.circle
          )}>
            {getStatusIcon()}
          </div>
          
          {/* Connector Line */}
          {!isLast && (
            <div className={cn(
              "h-1 w-12 sm:w-16 md:w-20 rounded-full mx-1",
              styles.line
            )} />
          )}
        </div>
        
        {/* Label */}
        <div className="mt-2 text-center max-w-[80px] sm:max-w-[100px]">
          <p className={cn("text-xs font-medium leading-tight", styles.text)}>
            {label}
          </p>
          {actorName && status === 'completed' && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {actorName}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Vertical variant
  return (
    <div className="flex gap-4">
      {/* Step Icon and Line */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
          styles.circle
        )}>
          {getStatusIcon()}
        </div>
        {!isLast && (
          <div className={cn("w-0.5 h-12 mt-1", styles.line)} />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={cn("font-medium", styles.text)}>{label}</p>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
            {actorName && (status === 'completed' || status === 'current') && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span>{actorName}</span>
                {timestamp && (
                  <span className="text-muted-foreground/70">• {formatDate(timestamp)}</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
