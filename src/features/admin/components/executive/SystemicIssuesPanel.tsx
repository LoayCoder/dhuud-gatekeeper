import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, AlertOctagon } from "lucide-react";
import { SystemicIssue } from "@/hooks/use-executive-ai-insights";

interface SystemicIssuesPanelProps {
  issues: SystemicIssue[];
  isLoading?: boolean;
}

export function SystemicIssuesPanel({ issues, isLoading }: SystemicIssuesPanelProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            {t('executiveReport.ai.systemicIssues')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!issues || issues.length === 0) {
    return null;
  }

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertOctagon className="h-5 w-5" />
          {t('executiveReport.ai.systemicIssues')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {issues.map((issue, index) => (
          <div 
            key={index}
            className="p-4 rounded-lg bg-background border border-destructive/20"
          >
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-destructive">{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{issue.pattern}</p>
                
                {issue.affected_areas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {issue.affected_areas.map((area, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="mt-3 p-2 rounded bg-muted/50">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('executiveReport.ai.recommendation')}:
                  </span>
                  <p className="text-sm mt-1">{issue.recommendation}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
