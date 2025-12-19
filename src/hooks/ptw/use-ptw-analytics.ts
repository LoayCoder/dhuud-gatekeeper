import { useMemo } from "react";
import { usePTWPermits, PTWPermit } from "./use-ptw-permits";
import { usePTWProjects } from "./use-ptw-projects";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  differenceInHours,
  differenceInDays,
  format,
  isAfter,
  isBefore,
  parseISO,
  isWithinInterval,
} from "date-fns";

export interface PTWAnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  projectIds?: string[];
  siteIds?: string[];
  typeIds?: string[];
}

export interface MonthlyTrendItem {
  month: string;
  monthLabel: string;
  total: number;
  activated: number;
  closed: number;
  cancelled: number;
}

export interface ProcessingTimeItem {
  stage: string;
  stageKey: string;
  avgHours: number;
  minHours: number;
  maxHours: number;
  count: number;
}

export interface ComplianceMetrics {
  completionRate: number;
  onTimeRate: number;
  extensionRate: number;
  simopsConflictRate: number;
}

export interface ProjectPerformanceItem {
  projectId: string;
  projectName: string;
  projectRef: string;
  totalPermits: number;
  activePermits: number;
  closedPermits: number;
  avgProcessingDays: number;
}

export interface SiteDistributionItem {
  siteId: string;
  siteName: string;
  count: number;
  percentage: number;
}

export interface TypeDistributionItem {
  typeId: string;
  typeName: string;
  typeCode: string;
  color: string;
  count: number;
  percentage: number;
}

export interface RiskLevelItem {
  level: string;
  count: number;
  color: string;
}

export interface TopPerformerItem {
  id: string;
  name: string;
  type: "applicant" | "project" | "site";
  permitCount: number;
  avgClosureTime: number;
  onTimePercentage: number;
}

export interface PTWAnalyticsData {
  // Summary KPIs
  totalPermits: number;
  activePermits: number;
  closedPermits: number;
  cancelledPermits: number;
  avgLifecycleDays: number;
  monthlyAverage: number;

  // Compliance
  compliance: ComplianceMetrics;

  // Trends
  monthlyTrends: MonthlyTrendItem[];
  processingTimes: ProcessingTimeItem[];

  // Distributions
  projectPerformance: ProjectPerformanceItem[];
  siteDistribution: SiteDistributionItem[];
  typeDistribution: TypeDistributionItem[];
  riskLevels: RiskLevelItem[];

  // Top performers
  topPerformers: TopPerformerItem[];
}

const DEFAULT_ANALYTICS: PTWAnalyticsData = {
  totalPermits: 0,
  activePermits: 0,
  closedPermits: 0,
  cancelledPermits: 0,
  avgLifecycleDays: 0,
  monthlyAverage: 0,
  compliance: {
    completionRate: 0,
    onTimeRate: 0,
    extensionRate: 0,
    simopsConflictRate: 0,
  },
  monthlyTrends: [],
  processingTimes: [],
  projectPerformance: [],
  siteDistribution: [],
  typeDistribution: [],
  riskLevels: [],
  topPerformers: [],
};

export function usePTWAnalytics(filters: PTWAnalyticsFilters = {}) {
  const { data: allPermits, isLoading: permitsLoading } = usePTWPermits();
  const { data: projects, isLoading: projectsLoading } = usePTWProjects();

  const analytics = useMemo<PTWAnalyticsData>(() => {
    if (!allPermits || allPermits.length === 0) return DEFAULT_ANALYTICS;

    // Apply date filters
    let permits = allPermits;
    if (filters.startDate) {
      permits = permits.filter((p) => isAfter(parseISO(p.created_at), filters.startDate!));
    }
    if (filters.endDate) {
      permits = permits.filter((p) => isBefore(parseISO(p.created_at), filters.endDate!));
    }
    if (filters.projectIds?.length) {
      permits = permits.filter((p) => filters.projectIds!.includes(p.project_id));
    }
    if (filters.siteIds?.length) {
      permits = permits.filter((p) => p.site_id && filters.siteIds!.includes(p.site_id));
    }
    if (filters.typeIds?.length) {
      permits = permits.filter((p) => filters.typeIds!.includes(p.type_id));
    }

    const totalPermits = permits.length;
    if (totalPermits === 0) return DEFAULT_ANALYTICS;

    // Core counts
    const activePermits = permits.filter((p) =>
      ["activated", "issued", "endorsed", "requested"].includes(p.status)
    ).length;
    const closedPermits = permits.filter((p) => p.status === "closed").length;
    const cancelledPermits = permits.filter((p) => p.status === "cancelled").length;
    const extendedPermits = permits.filter((p) => p.extension_count > 0).length;
    const simopsConflicts = permits.filter((p) =>
      p.simops_status && p.simops_status !== "clear"
    ).length;

    // Calculate lifecycle days for closed permits
    const closedWithTimes = permits.filter(
      (p) => p.status === "closed" && p.requested_at && p.closed_at
    );
    const totalLifecycleDays = closedWithTimes.reduce((acc, p) => {
      return acc + differenceInDays(parseISO(p.closed_at!), parseISO(p.requested_at!));
    }, 0);
    const avgLifecycleDays = closedWithTimes.length > 0
      ? Math.round(totalLifecycleDays / closedWithTimes.length)
      : 0;

    // On-time closures
    const onTimeClosures = permits.filter((p) => {
      if (p.status !== "closed" || !p.closed_at || !p.planned_end_time) return false;
      return isBefore(parseISO(p.closed_at), parseISO(p.planned_end_time));
    }).length;

    // Compliance metrics
    const nonCancelledCount = totalPermits - cancelledPermits;
    const compliance: ComplianceMetrics = {
      completionRate: nonCancelledCount > 0
        ? Math.round((closedPermits / nonCancelledCount) * 100)
        : 0,
      onTimeRate: closedPermits > 0
        ? Math.round((onTimeClosures / closedPermits) * 100)
        : 0,
      extensionRate: nonCancelledCount > 0
        ? Math.round((extendedPermits / nonCancelledCount) * 100)
        : 0,
      simopsConflictRate: totalPermits > 0
        ? Math.round((simopsConflicts / totalPermits) * 100)
        : 0,
    };

    // Monthly trends (last 12 months)
    const monthlyTrends: MonthlyTrendItem[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(subMonths(new Date(), i));
      const monthPermits = permits.filter((p) => {
        const created = parseISO(p.created_at);
        return isWithinInterval(created, { start: monthStart, end: monthEnd });
      });

      monthlyTrends.push({
        month: format(monthStart, "yyyy-MM"),
        monthLabel: format(monthStart, "MMM yyyy"),
        total: monthPermits.length,
        activated: monthPermits.filter((p) => p.status === "activated").length,
        closed: monthPermits.filter((p) => p.status === "closed").length,
        cancelled: monthPermits.filter((p) => p.status === "cancelled").length,
      });
    }

    const monthlyAverage = Math.round(
      monthlyTrends.reduce((acc, m) => acc + m.total, 0) / 12
    );

    // Processing times
    const processingTimes: ProcessingTimeItem[] = [];
    const stages = [
      { key: "request_to_endorse", label: "Request → Endorsed", from: "requested_at", to: "endorsed_at" },
      { key: "endorse_to_issue", label: "Endorsed → Issued", from: "endorsed_at", to: "issued_at" },
      { key: "issue_to_activate", label: "Issued → Activated", from: "issued_at", to: "activated_at" },
      { key: "activate_to_close", label: "Activated → Closed", from: "activated_at", to: "closed_at" },
    ];

    stages.forEach((stage) => {
      const stagePermits = permits.filter(
        (p) => p[stage.from as keyof PTWPermit] && p[stage.to as keyof PTWPermit]
      );
      if (stagePermits.length > 0) {
        const hours = stagePermits.map((p) =>
          differenceInHours(
            parseISO(p[stage.to as keyof PTWPermit] as string),
            parseISO(p[stage.from as keyof PTWPermit] as string)
          )
        );
        processingTimes.push({
          stage: stage.label,
          stageKey: stage.key,
          avgHours: Math.round(hours.reduce((a, b) => a + b, 0) / hours.length),
          minHours: Math.min(...hours),
          maxHours: Math.max(...hours),
          count: stagePermits.length,
        });
      }
    });

    // Project performance
    const projectMap = new Map<string, PTWPermit[]>();
    permits.forEach((p) => {
      if (!projectMap.has(p.project_id)) projectMap.set(p.project_id, []);
      projectMap.get(p.project_id)!.push(p);
    });

    const projectPerformance: ProjectPerformanceItem[] = Array.from(projectMap.entries())
      .map(([projectId, projectPermits]) => {
        const project = projects?.find((pr) => pr.id === projectId);
        const closed = projectPermits.filter((p) => p.status === "closed");
        const avgDays = closed.length > 0
          ? closed.reduce((acc, p) => {
              if (p.requested_at && p.closed_at) {
                return acc + differenceInDays(parseISO(p.closed_at), parseISO(p.requested_at));
              }
              return acc;
            }, 0) / closed.length
          : 0;

        return {
          projectId,
          projectName: project?.name || "Unknown",
          projectRef: project?.reference_id || "",
          totalPermits: projectPermits.length,
          activePermits: projectPermits.filter((p) =>
            ["activated", "issued", "endorsed", "requested"].includes(p.status)
          ).length,
          closedPermits: closed.length,
          avgProcessingDays: Math.round(avgDays),
        };
      })
      .sort((a, b) => b.totalPermits - a.totalPermits)
      .slice(0, 10);

    // Site distribution
    const siteMap = new Map<string, { name: string; count: number }>();
    permits.forEach((p) => {
      const siteId = p.site_id || "unknown";
      const siteName = p.site?.name || "Unknown Site";
      if (!siteMap.has(siteId)) {
        siteMap.set(siteId, { name: siteName, count: 0 });
      }
      siteMap.get(siteId)!.count++;
    });

    const siteDistribution: SiteDistributionItem[] = Array.from(siteMap.entries())
      .map(([siteId, data]) => ({
        siteId,
        siteName: data.name,
        count: data.count,
        percentage: Math.round((data.count / totalPermits) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Type distribution
    const typeMap = new Map<string, { name: string; code: string; color: string; count: number }>();
    permits.forEach((p) => {
      const typeId = p.type_id;
      if (!typeMap.has(typeId)) {
        typeMap.set(typeId, {
          name: p.permit_type?.name || "Unknown",
          code: p.permit_type?.code || "",
          color: p.permit_type?.color || "#6b7280",
          count: 0,
        });
      }
      typeMap.get(typeId)!.count++;
    });

    const typeDistribution: TypeDistributionItem[] = Array.from(typeMap.entries())
      .map(([typeId, data]) => ({
        typeId,
        typeName: data.name,
        typeCode: data.code,
        color: data.color,
        count: data.count,
        percentage: Math.round((data.count / totalPermits) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Risk levels (based on permit type)
    const riskLevels: RiskLevelItem[] = [
      { level: "High", count: permits.filter((p) => 
        ["hot_work", "confined_space", "radiography"].includes(p.permit_type?.code || "")
      ).length, color: "hsl(var(--destructive))" },
      { level: "Medium", count: permits.filter((p) =>
        ["electrical", "lifting", "excavation"].includes(p.permit_type?.code || "")
      ).length, color: "hsl(var(--warning))" },
      { level: "Low", count: permits.filter((p) =>
        ["general"].includes(p.permit_type?.code || "")
      ).length, color: "hsl(var(--success))" },
    ];

    // Top performers (applicants)
    const applicantMap = new Map<string, { name: string; permits: PTWPermit[] }>();
    permits.forEach((p) => {
      const applicantId = p.applicant_id;
      const applicantName = p.applicant?.full_name || "Unknown";
      if (!applicantMap.has(applicantId)) {
        applicantMap.set(applicantId, { name: applicantName, permits: [] });
      }
      applicantMap.get(applicantId)!.permits.push(p);
    });

    const topPerformers: TopPerformerItem[] = Array.from(applicantMap.entries())
      .map(([id, data]) => {
        const closed = data.permits.filter((p) => p.status === "closed");
        const onTime = closed.filter((p) => {
          if (!p.closed_at || !p.planned_end_time) return false;
          return isBefore(parseISO(p.closed_at), parseISO(p.planned_end_time));
        });
        const avgDays = closed.length > 0
          ? closed.reduce((acc, p) => {
              if (p.requested_at && p.closed_at) {
                return acc + differenceInDays(parseISO(p.closed_at), parseISO(p.requested_at));
              }
              return acc;
            }, 0) / closed.length
          : 0;

        return {
          id,
          name: data.name,
          type: "applicant" as const,
          permitCount: data.permits.length,
          avgClosureTime: Math.round(avgDays),
          onTimePercentage: closed.length > 0 ? Math.round((onTime.length / closed.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.permitCount - a.permitCount)
      .slice(0, 5);

    return {
      totalPermits,
      activePermits,
      closedPermits,
      cancelledPermits,
      avgLifecycleDays,
      monthlyAverage,
      compliance,
      monthlyTrends,
      processingTimes,
      projectPerformance,
      siteDistribution,
      typeDistribution,
      riskLevels,
      topPerformers,
    };
  }, [allPermits, projects, filters]);

  return {
    data: analytics,
    permits: allPermits,
    projects,
    isLoading: permitsLoading || projectsLoading,
  };
}
