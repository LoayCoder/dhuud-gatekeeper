import { FolderKanban, PlayCircle, Calendar, CheckCircle2, PauseCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import type { ClientSiteRepProjectSummary } from "@/hooks/contractor-management/use-client-site-rep-data";

interface ProjectsSummaryCardProps {
  summary: ClientSiteRepProjectSummary;
}

export function ProjectsSummaryCard({ summary }: ProjectsSummaryCardProps) {
  const { t } = useTranslation();

  const stats = [
    {
      label: t("clientSiteRep.active", "Active"),
      value: summary.active,
      icon: PlayCircle,
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: t("clientSiteRep.planned", "Planned"),
      value: summary.planned,
      icon: Calendar,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: t("clientSiteRep.completed", "Completed"),
      value: summary.completed,
      icon: CheckCircle2,
      color: "text-gray-600 dark:text-gray-400",
    },
    {
      label: t("clientSiteRep.onHold", "On Hold"),
      value: summary.on_hold,
      icon: PauseCircle,
      color: "text-yellow-600 dark:text-yellow-400",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FolderKanban className="h-5 w-5 text-primary" />
          {t("clientSiteRep.projects", "Projects")}
          <span className="text-muted-foreground font-normal">({summary.total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 p-2"
            >
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
