import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ConfidenceIndicatorProps {
  label: string;
  value: string;
  confidence: number;
  onOverride?: () => void;
  className?: string;
}

export function ConfidenceIndicator({ 
  label, 
  value, 
  confidence,
  onOverride,
  className 
}: ConfidenceIndicatorProps) {
  const { t } = useTranslation();
  
  const getConfidenceColor = () => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-amber-500';
    return 'bg-orange-500';
  };
  
  const getConfidenceLabel = () => {
    if (confidence >= 90) return t('observations.ai.confidenceHigh', 'High');
    if (confidence >= 70) return t('observations.ai.confidenceMedium', 'Medium');
    return t('observations.ai.confidenceLow', 'Low');
  };
  
  return (
    <div className={cn("p-2 bg-muted/30 rounded-lg", className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Badge variant="outline" className="text-xs px-1.5 py-0">
          {confidence}% {getConfidenceLabel()}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium flex-1 truncate">{value}</span>
        {onOverride && (
          <button
            type="button"
            onClick={onOverride}
            className="text-xs text-primary hover:underline shrink-0"
          >
            {t('observations.ai.override', 'Override')}
          </button>
        )}
      </div>
      <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", getConfidenceColor())}
          style={{ width: `${confidence}%` }}
        />
      </div>
    </div>
  );
}
