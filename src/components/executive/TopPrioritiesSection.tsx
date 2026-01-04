import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { TopPriority } from "@/hooks/use-executive-ai-insights";
import { cn } from "@/lib/utils";

interface TopPrioritiesSectionProps {
  priorities: TopPriority[];
  isLoading?: boolean;
}

const severityConfig = {
  critical: { 
    icon: AlertCircle, 
    color: 'text-destructive', 
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    badge: 'destructive'
  },
  high: { 
    icon: AlertTriangle, 
    color: 'text-orange-500', 
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    badge: 'default'
  },
  medium: { 
    icon: Info, 
    color: 'text-yellow-600', 
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    badge: 'secondary'
  },
  low: { 
    icon: CheckCircle2, 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    badge: 'outline'
  },
};

export function TopPrioritiesSection({ priorities, isLoading }: TopPrioritiesSectionProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('executiveReport.ai.topPriorities')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!priorities || priorities.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          {t('executiveReport.ai.topPriorities')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {priorities.slice(0, 5).map((priority) => {
          const config = severityConfig[priority.severity] || severityConfig.medium;
          const SeverityIcon = config.icon;
          
          return (
            <div 
              key={priority.rank}
              className={cn(
                "p-4 rounded-lg border-s-4",
                config.bg,
                config.border
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border font-bold text-sm shrink-0">
                  {priority.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold">{priority.title}</h4>
                    <Badge variant={config.badge as any} className="text-xs">
                      {t(`executiveReport.ai.severity.${priority.severity}`)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {priority.description}
                  </p>
                  
                  {priority.recommended_actions.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        {t('executiveReport.ai.recommendedActions')}:
                      </div>
                      <ul className="text-sm space-y-1">
                        {priority.recommended_actions.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {priority.expected_impact && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">{t('executiveReport.ai.expectedImpact')}:</span>{' '}
                      {priority.expected_impact}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
