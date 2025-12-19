import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TopPerformerItem, ProjectPerformanceItem } from "@/hooks/ptw/use-ptw-analytics";
import { TrendingUp, User, Building2 } from "lucide-react";

interface TopPerformersTableProps {
  topPerformers: TopPerformerItem[];
  projectPerformance: ProjectPerformanceItem[];
  isLoading?: boolean;
}

export function TopPerformersTable({
  topPerformers,
  projectPerformance,
  isLoading,
}: TopPerformersTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Top Applicants */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">
              {t("ptw.analytics.topApplicants", "Top Applicants")}
            </CardTitle>
          </div>
          <CardDescription>
            {t("ptw.analytics.topApplicantsDesc", "Users with most permit requests")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name", "Name")}</TableHead>
                <TableHead className="text-end">{t("ptw.analytics.permits", "Permits")}</TableHead>
                <TableHead className="text-end">{t("ptw.analytics.avgDays", "Avg Days")}</TableHead>
                <TableHead className="text-end">{t("ptw.analytics.onTime", "On-Time")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPerformers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {t("common.noData", "No data available")}
                  </TableCell>
                </TableRow>
              ) : (
                topPerformers.map((performer, index) => (
                  <TableRow key={performer.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
                          {index + 1}
                        </Badge>
                        <span className="truncate max-w-[150px]">{performer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-end font-medium">{performer.permitCount}</TableCell>
                    <TableCell className="text-end">{performer.avgClosureTime}d</TableCell>
                    <TableCell className="text-end">
                      <Badge
                        variant={performer.onTimePercentage >= 80 ? "default" : performer.onTimePercentage >= 50 ? "secondary" : "destructive"}
                      >
                        {performer.onTimePercentage}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Projects */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">
              {t("ptw.analytics.topProjects", "Top Projects")}
            </CardTitle>
          </div>
          <CardDescription>
            {t("ptw.analytics.topProjectsDesc", "Projects with most permits")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.project", "Project")}</TableHead>
                <TableHead className="text-end">{t("ptw.analytics.total", "Total")}</TableHead>
                <TableHead className="text-end">{t("ptw.analytics.active", "Active")}</TableHead>
                <TableHead className="text-end">{t("ptw.analytics.avgDays", "Avg Days")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectPerformance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {t("common.noData", "No data available")}
                  </TableCell>
                </TableRow>
              ) : (
                projectPerformance.slice(0, 5).map((project, index) => (
                  <TableRow key={project.projectId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
                          {index + 1}
                        </Badge>
                        <div className="min-w-0">
                          <p className="truncate max-w-[120px] font-medium">{project.projectName}</p>
                          <p className="text-xs text-muted-foreground">{project.projectRef}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-end font-medium">{project.totalPermits}</TableCell>
                    <TableCell className="text-end">
                      <Badge variant="secondary">{project.activePermits}</Badge>
                    </TableCell>
                    <TableCell className="text-end">{project.avgProcessingDays}d</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
