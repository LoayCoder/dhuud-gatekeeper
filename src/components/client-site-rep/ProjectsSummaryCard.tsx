import { FolderKanban, PlayCircle, Calendar, CheckCircle2, PauseCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { ClientSiteRepProjectSummary } from "@/hooks/contractor-management/use-client-site-rep-data";

interface ProjectsSummaryCardProps {
  summary: ClientSiteRepProjectSummary;
}

export function ProjectsSummaryCard({ summary }: ProjectsSummaryCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleStatusClick = (status: string) => {
    navigate(`/contractors/projects?status=${status}`);
  };

  // Show empty state if no projects
  if (summary.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderKanban className="h-5 w-5 text-primary" />
            {t("clientSiteRep.projects", "Projects")}
            <span className="text-muted-foreground font-normal">(0)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            {t("clientSiteRep.noProjectsAssigned", "No projects assigned")}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      label: t("clientSiteRep.active", "Active"),
      value: summary.active,
      icon: PlayCircle,
      color: "text-green-600 dark:text-green-400",
      status: "active",
    },
    {
      label: t("clientSiteRep.planned", "Planned"),
      value: summary.planned,
      icon: Calendar,
      color: "text-blue-600 dark:text-blue-400",
      status: "planned",
    },
    {
      label: t("clientSiteRep.completed", "Completed"),
      value: summary.completed,
      icon: CheckCircle2,
      color: "text-gray-600 dark:text-gray-400",
      status: "completed",
    },
    {
      label: t("clientSiteRep.onHold", "On Hold"),
      value: summary.on_hold,
      icon: PauseCircle,
      color: "text-yellow-600 dark:text-yellow-400",
      status: "on_hold",
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
              className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleStatusClick(stat.status)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleStatusClick(stat.status)}
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
