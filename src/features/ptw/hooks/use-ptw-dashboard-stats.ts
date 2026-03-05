import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePTWPermits, PTWPermit } from "./use-ptw-permits";
import { usePTWProjects } from "./use-ptw-projects";

export interface PTWDashboardStats {
  // Core stats
  totalPermits: number;
  activePermits: number;
  pendingPermits: number;
  closedPermits: number;
  suspendedPermits: number;
  cancelledPermits: number;
  
  // Projects
  totalProjects: number;
  activeProjects: number;
  pendingMobilization: number;
  
  // Expiring
  expiringToday: number;
  expiringThisWeek: number;
  
  // Extended
  extendedPermits: number;
  
  // Status breakdown for charts
  statusBreakdown: { name: string; value: number; color: string }[];
  
  // Type distribution for charts
  typeDistribution: { name: string; value: number; color: string }[];
  
  // Trend data (last 7 days)
  weeklyTrend: { date: string; requested: number; closed: number; active: number }[];
  
  // Recent permits expiring soon
  expiringPermits: PTWPermit[];
}

const STATUS_COLORS: Record<string, string> = {
  requested: "hsl(var(--warning))",
  endorsed: "hsl(var(--chart-4))",
  issued: "hsl(var(--chart-2))",
  activated: "hsl(var(--success))",
  suspended: "hsl(var(--destructive))",
  closed: "hsl(var(--muted-foreground))",
  cancelled: "hsl(var(--muted))",
};

const TYPE_COLORS: Record<string, string> = {
  hot_work: "hsl(0, 72%, 51%)",        // Red
  lifting: "hsl(25, 95%, 53%)",        // Orange
  confined_space: "hsl(280, 65%, 60%)", // Purple
  electrical: "hsl(217, 91%, 60%)",    // Blue
  excavation: "hsl(30, 41%, 44%)",     // Brown
  radiography: "hsl(263, 70%, 50%)",   // Violet
  general: "hsl(var(--muted-foreground))",
};

export function usePTWDashboardStats(): {
  stats: PTWDashboardStats | null;
  isLoading: boolean;
} {
  const { t, i18n } = useTranslation();
  const { data: permits, isLoading: permitsLoading } = usePTWPermits();
  const { data: projects, isLoading: projectsLoading } = usePTWProjects();

  const stats = useMemo(() => {
    if (!permits || !projects) return null;

    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Core permit counts by status
    const statusCounts: Record<string, number> = {
      requested: 0,
      endorsed: 0,
      issued: 0,
      activated: 0,
      suspended: 0,
      closed: 0,
      cancelled: 0,
    };

    permits.forEach(p => {
      if (statusCounts[p.status] !== undefined) {
        statusCounts[p.status]++;
      }
    });

    // Type distribution
    const typeCounts: Record<string, { name: string; count: number; code: string }> = {};
    permits.forEach(p => {
      const typeCode = p.permit_type?.code || "general";
      const typeName = p.permit_type?.name || "General";
      if (!typeCounts[typeCode]) {
        typeCounts[typeCode] = { name: typeName, count: 0, code: typeCode };
      }
      typeCounts[typeCode].count++;
    });

    // Expiring permits
    const expiringToday = permits.filter(p => {
      if (!["issued", "activated"].includes(p.status)) return false;
      const endTime = p.extended_until || p.planned_end_time;
      if (!endTime) return false;
      const endDate = new Date(endTime);
      return endDate <= todayEnd && endDate >= now;
    });

    const expiringThisWeek = permits.filter(p => {
      if (!["issued", "activated"].includes(p.status)) return false;
      const endTime = p.extended_until || p.planned_end_time;
      if (!endTime) return false;
      const endDate = new Date(endTime);
      return endDate <= weekEnd && endDate > todayEnd;
    });

    // Extended permits
    const extendedPermits = permits.filter(p => p.extension_count > 0).length;

    // Weekly trend (last 7 days)
    const weeklyTrend: { date: string; requested: number; closed: number; active: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const requested = permits.filter(p => {
        const reqDate = p.requested_at ? new Date(p.requested_at) : new Date(p.created_at);
        return reqDate >= dayStart && reqDate <= dayEnd;
      }).length;

      const closed = permits.filter(p => {
        if (!p.closed_at) return false;
        const closeDate = new Date(p.closed_at);
        return closeDate >= dayStart && closeDate <= dayEnd;
      }).length;

      const active = permits.filter(p => {
        const activatedDate = p.activated_at ? new Date(p.activated_at) : null;
        const closedDate = p.closed_at ? new Date(p.closed_at) : null;
        if (!activatedDate || activatedDate > dayEnd) return false;
        if (closedDate && closedDate < dayStart) return false;
        return true;
      }).length;

      // Format date for display based on locale
      const displayDate = new Intl.DateTimeFormat(i18n.language, { 
        weekday: 'short' 
      }).format(date);

      weeklyTrend.push({ date: displayDate, requested, closed, active });
    }

    // Status breakdown for chart
    const statusBreakdown = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: t(`ptw.status.${status}`, status),
        value: count,
        color: STATUS_COLORS[status] || "hsl(var(--muted))",
      }));

    // Type distribution for chart
    const typeDistribution = Object.values(typeCounts)
      .filter(t => t.count > 0)
      .map(t => ({
        name: t.name,
        value: t.count,
        color: TYPE_COLORS[t.code] || "hsl(var(--muted-foreground))",
      }));

    // Project stats
    const activeProjects = projects.filter(p => p.status === "active").length;
    const pendingMobilization = projects.filter(p => p.status === "pending_clearance").length;

    return {
      totalPermits: permits.length,
      activePermits: statusCounts.activated + statusCounts.issued,
      pendingPermits: statusCounts.requested + statusCounts.endorsed,
      closedPermits: statusCounts.closed,
      suspendedPermits: statusCounts.suspended,
      cancelledPermits: statusCounts.cancelled,
      
      totalProjects: projects.length,
      activeProjects,
      pendingMobilization,
      
      expiringToday: expiringToday.length,
      expiringThisWeek: expiringThisWeek.length,
      
      extendedPermits,
      
      statusBreakdown,
      typeDistribution,
      weeklyTrend,
      
      expiringPermits: [...expiringToday, ...expiringThisWeek].slice(0, 5),
    };
  }, [permits, projects, t, i18n.language]);

  return {
    stats,
    isLoading: permitsLoading || projectsLoading,
  };
}
