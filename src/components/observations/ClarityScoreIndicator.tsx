import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface ClarityScoreIndicatorProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ClarityScoreIndicator({ 
  score, 
  showLabel = true,
  size = 'md',
  className 
}: ClarityScoreIndicatorProps) {
  const { t } = useTranslation();
  
  const getScoreColor = () => {
    if (score >= 70) return 'text-green-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-destructive';
  };
  
  const getProgressColor = () => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-destructive';
  };
  
  const getScoreLabel = () => {
    if (score >= 90) return t('observations.ai.clarityExcellent', 'Excellent');
    if (score >= 70) return t('observations.ai.clarityGood', 'Good');
    if (score >= 50) return t('observations.ai.clarityFair', 'Needs Improvement');
    return t('observations.ai.clarityPoor', 'Too Vague');
  };
  
  const getIcon = () => {
    if (score >= 70) return <CheckCircle2 className={cn("shrink-0", size === 'sm' ? "h-3 w-3" : "h-4 w-4")} />;
    if (score >= 50) return <AlertTriangle className={cn("shrink-0", size === 'sm' ? "h-3 w-3" : "h-4 w-4")} />;
    return <XCircle className={cn("shrink-0", size === 'sm' ? "h-3 w-3" : "h-4 w-4")} />;
  };
  
  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className={cn("font-medium", size === 'sm' ? "text-xs" : "text-sm")}>
            {t('observations.ai.clarityScore', 'Clarity Score')}
          </span>
          <div className={cn("flex items-center gap-1", getScoreColor())}>
            {getIcon()}
            <span className={cn("font-bold", size === 'sm' ? "text-xs" : "text-sm")}>
              {score}%
            </span>
          </div>
        </div>
      )}
      <div className="relative">
        <Progress 
          value={score} 
          className={cn("h-2", size === 'sm' && "h-1.5")}
        />
        <div 
          className={cn(
            "absolute top-0 h-full rounded-full transition-all",
            getProgressColor()
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabel && (
        <p className={cn("text-muted-foreground", size === 'sm' ? "text-[10px]" : "text-xs")}>
          {getScoreLabel()} {score < 70 && `(${t('observations.ai.min70Required', 'Minimum 70% required')})`}
        </p>
      )}
    </div>
  );
}
