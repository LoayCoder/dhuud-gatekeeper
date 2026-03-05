import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import type { TopReporter } from "@/hooks/use-top-reporters";

interface Props {
  reporters: TopReporter[];
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="w-5 h-5 flex items-center justify-center text-sm text-muted-foreground">#{rank}</span>;
  }
}

export function ReporterLeaderboard({ reporters }: Props) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          {t('hsseDashboard.topReporters')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reporters.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('hsseDashboard.noReporters')}</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {reporters.map((reporter) => (
              <div 
                key={reporter.reporter_id} 
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  reporter.rank === 1 
                    ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800' 
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex-shrink-0">
                  {getRankIcon(reporter.rank)}
                </div>
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src={reporter.avatar_url || undefined} />
                  <AvatarFallback>
                    {reporter.reporter_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{reporter.reporter_name}</p>
                    {reporter.rank === 1 && (
                      <Badge variant="default" className="bg-yellow-500 text-yellow-950 text-xs">
                        {t('hsseDashboard.safetyChampion')}
                      </Badge>
                    )}
                  </div>
                  {reporter.department_name && (
                    <p className="text-xs text-muted-foreground truncate">{reporter.department_name}</p>
                  )}
                </div>

                <div className="flex flex-col items-end text-sm">
                  <span className="font-semibold">{reporter.total_reports}</span>
                  <span className="text-xs text-muted-foreground">{t('hsseDashboard.reports')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
