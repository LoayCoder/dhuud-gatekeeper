import { useNavigate } from "react-router-dom";
import { useCallback, useContext } from "react";
import { useDrilldownContext } from "@/contexts/DrilldownContext";

export type DrillDownFilter = {
  eventType?: string;
  severity?: string;
  status?: string;
  branchId?: string;
  siteId?: string;
  departmentId?: string;
  incidentId?: string;
};

export function useDashboardDrilldown() {
  const navigate = useNavigate();
  
  // Try to get drilldown context (may not be available outside provider)
  let drilldownContext: ReturnType<typeof useDrilldownContext> | null = null;
  try {
    drilldownContext = useDrilldownContext();
  } catch {
    // Not within DrilldownProvider, will use navigation fallback
  }

  const drillDown = useCallback((filters: DrillDownFilter, title?: string) => {
    if (filters.incidentId) {
      // Navigate directly to investigation workspace with incident selected
      navigate(`/incidents/investigate?incidentId=${filters.incidentId}`);
      return;
    }

    // If we have drilldown context, use the modal
    if (drilldownContext) {
      const modalTitle = title || generateFilterTitle(filters);
      drilldownContext.openDrilldown(filters, modalTitle);
      return;
    }

    // Fallback to navigation
    const params = new URLSearchParams();
    if (filters.eventType) params.set('eventType', filters.eventType);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.status) params.set('status', filters.status);
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.siteId) params.set('siteId', filters.siteId);
    if (filters.departmentId) params.set('departmentId', filters.departmentId);

    const queryString = params.toString();
    navigate(`/incidents/investigate${queryString ? `?${queryString}` : ''}`);
  }, [navigate, drilldownContext]);

  const drillDownToActions = useCallback((filter?: 'overdue' | 'pending') => {
    const params = filter ? `?filter=${filter}` : '';
    navigate(`/my-actions${params}`);
  }, [navigate]);

  return { drillDown, drillDownToActions };
}

function generateFilterTitle(filters: DrillDownFilter): string {
  if (filters.eventType) {
    const types: Record<string, string> = {
      observation: 'Observations',
      incident: 'Incidents',
      near_miss: 'Near Miss Events',
      security_event: 'Security Events',
      environmental_event: 'Environmental Events',
    };
    return types[filters.eventType] || 'Events';
  }
  if (filters.severity) {
    return `${filters.severity.charAt(0).toUpperCase() + filters.severity.slice(1)} Severity Events`;
  }
  if (filters.status) {
    const statuses: Record<string, string> = {
      submitted: 'Submitted Events',
      expert_screening: 'Events Under Screening',
      pending_manager_approval: 'Pending Approval',
      investigation_in_progress: 'Active Investigations',
      pending_closure: 'Pending Closure',
      closed: 'Closed Events',
      returned: 'Returned Events',
      rejected: 'Rejected Events',
    };
    return statuses[filters.status] || 'Events';
  }
  return 'Filtered Events';
}
