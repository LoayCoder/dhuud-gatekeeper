import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FolderKanban, ChevronDown, ChevronUp, X, CheckCircle, Clock, PlayCircle, PauseCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface ProjectStatusCardProps {
  active: number;
  planned: number;
  completed: number;
  suspended: number;
  total: number;
}

type FilterType = "active" | "planned" | "completed" | "suspended" | null;

const ITEMS_PER_PAGE = 5;

export function ProjectStatusCard({ 
  active, 
  planned, 
  completed, 
  suspended, 
  total 
}: ProjectStatusCardProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["contractor-dashboard-projects", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data } = await supabase
        .from("contractor_projects")
        .select(`
          id, 
          project_name, 
          reference_id, 
          status, 
          start_date, 
          end_date,
          company:contractor_companies(company_name),
          site:sites(name)
        `)
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!profile?.tenant_id && isExpanded,
  });

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter(activeFilter === filter ? null : filter);
    setIsExpanded(true);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const filteredProjects = useMemo(() => {
    if (!activeFilter) return projects;
    
    return projects.filter((p) => {
      switch (activeFilter) {
        case "active":
          return p.status === "active";
        case "planned":
          return p.status === "planned";
        case "completed":
          return p.status === "completed";
        case "suspended":
          return p.status === "suspended" || p.status === "on_hold";
        default:
          return true;
      }
    });
  }, [projects, activeFilter]);

  const visibleProjects = filteredProjects.slice(0, visibleCount);

  const statusCards = [
    {
      key: "active" as FilterType,
      label: t("contractors.dashboard.active", "Active"),
      count: active,
      icon: PlayCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      key: "planned" as FilterType,
      label: t("contractors.dashboard.planned", "Planned"),
      count: planned,
      icon: Clock,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      key: "completed" as FilterType,
      label: t("contractors.dashboard.completed", "Completed"),
      count: completed,
      icon: CheckCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      key: "suspended" as FilterType,
      label: t("contractors.dashboard.suspended", "Suspended"),
      count: suspended,
      icon: PauseCircle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "outline" | "secondary" | "destructive"; className?: string }> = {
      active: { variant: "outline", className: "border-success text-success" },
      planned: { variant: "outline", className: "border-info text-info" },
      completed: { variant: "secondary" },
      suspended: { variant: "outline", className: "border-warning text-warning" },
      on_hold: { variant: "outline", className: "border-warning text-warning" },
    };
    const config = statusConfig[status] || { variant: "secondary" as const };
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              {t("contractors.dashboard.projectStatus", "Project Status")}
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {statusCards.map((card) => (
              <button
                key={card.key}
                onClick={() => handleFilterClick(card.key)}
                className={cn(
                  "p-3 rounded-lg text-center transition-all cursor-pointer",
                  card.bgColor,
                  activeFilter === card.key && "ring-2 ring-primary ring-offset-2"
                )}
              >
                <card.icon className={cn("h-4 w-4 mx-auto mb-1", card.color)} />
                <p className="text-lg font-bold">{card.count}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </button>
            ))}
          </div>

          <CollapsibleContent className="space-y-3">
            {/* Active Filter */}
            {activeFilter && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <span className="text-sm">
                  {t("contractors.dashboard.showingFiltered", "Showing {{status}} projects only", {
                    status: statusCards.find((s) => s.key === activeFilter)?.label,
                  })}
                </span>
                <Button variant="ghost" size="sm" onClick={clearFilter}>
                  <X className="h-4 w-4 me-1" />
                  {t("common.clearFilter", "Clear")}
                </Button>
              </div>
            )}

            {/* Projects List */}
            {visibleProjects.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {t("contractors.dashboard.noProjectsMatch", "No projects match this filter")}
              </div>
            ) : (
              <div className="space-y-2">
                {visibleProjects.map((project) => (
                  <div
                    key={project.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{project.project_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {project.company?.company_name} • {project.site?.name || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {project.start_date && format(new Date(project.start_date), "dd/MM/yyyy")}
                          {project.end_date && ` - ${format(new Date(project.end_date), "dd/MM/yyyy")}`}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(project.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {filteredProjects.length > visibleCount && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
              >
                {t("common.loadMore", "Load More")}
              </Button>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
