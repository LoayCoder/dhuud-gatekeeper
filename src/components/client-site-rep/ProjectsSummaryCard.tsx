import { useState, useMemo } from "react";
import { FolderKanban, PlayCircle, Calendar, CheckCircle2, PauseCircle, ChevronDown, ChevronUp, Building2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { ClientSiteRepProjectSummary, ClientSiteRepProjectDetail } from "@/hooks/contractor-management/use-client-site-rep-data";

interface ProjectsSummaryCardProps {
  summary: ClientSiteRepProjectSummary;
  allProjects?: ClientSiteRepProjectDetail[];
}

const ITEMS_PER_PAGE = 10;

export function ProjectsSummaryCard({ summary, allProjects = [] }: ProjectsSummaryCardProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const handleStatusClick = (e: React.MouseEvent, status: string) => {
    e.stopPropagation();
    if (activeFilter === status) {
      setActiveFilter(null);
    } else {
      setActiveFilter(status);
    }
    setIsExpanded(true);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setVisibleCount(ITEMS_PER_PAGE);
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "planned": return "secondary";
      case "completed": return "outline";
      case "on_hold":
      case "suspended": return "destructive";
      default: return "secondary";
    }
  };

  // Filter projects based on active filter
  const filteredProjects = useMemo(() => {
    if (!activeFilter) return allProjects;
    // Handle on_hold which also includes suspended
    if (activeFilter === "on_hold") {
      return allProjects.filter(p => p.status === "on_hold" || p.status === "suspended");
    }
    return allProjects.filter(p => p.status === activeFilter);
  }, [allProjects, activeFilter]);

  const visibleProjects = filteredProjects.slice(0, visibleCount);
  const hasMore = filteredProjects.length > visibleCount;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-primary" />
                {t("clientSiteRep.projects", "Projects")}
                <span className="text-muted-foreground font-normal">({summary.total})</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-all ${
                  activeFilter === stat.status ? "ring-2 ring-primary ring-offset-2 bg-muted/50" : ""
                }`}
                onClick={(e) => handleStatusClick(e, stat.status)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleStatusClick(e as unknown as React.MouseEvent, stat.status)}
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

        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-3 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">
                {activeFilter 
                  ? t("clientSiteRep.showingFilteredProjects", "Showing {{status}} projects ({{count}})", { 
                      status: activeFilter.replace(/_/g, " "), 
                      count: filteredProjects.length 
                    })
                  : t("clientSiteRep.allProjects", "All Projects ({{count}})", { count: allProjects.length })
                }
              </p>
              {activeFilter && (
                <Button variant="ghost" size="sm" onClick={clearFilter} className="h-8 px-2">
                  <X className="h-4 w-4 me-1" />
                  {t("common.clearFilter", "Clear Filter")}
                </Button>
              )}
            </div>
            
            {visibleProjects.length > 0 ? (
              visibleProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{project.project_name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate">{project.company_name}</span>
                    </div>
                    {project.start_date && (
                      <p className="text-xs text-muted-foreground">
                        {t("clientSiteRep.startDate", "Start")}: {format(new Date(project.start_date), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="ms-3">
                    <Badge variant={getStatusBadgeVariant(project.status)}>
                      {project.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {activeFilter 
                  ? t("clientSiteRep.noProjectsMatchFilter", "No projects match this filter")
                  : t("clientSiteRep.noProjectsFound", "No projects found")
                }
              </p>
            )}

            {hasMore && (
              <Button 
                variant="outline" 
                className="w-full mt-3"
                onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
              >
                {t("common.loadMore", "Load More")} ({filteredProjects.length - visibleCount} {t("common.remaining", "remaining")})
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
