import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { useDrilldownContextOptional } from "@/contexts/DrilldownContext";

export type DrillDownFilter = {
  eventType?: string;
  incidentType?: string;
  severity?: string;
  status?: string;
  branchId?: string;
  siteId?: string;
  departmentId?: string;
  incidentId?: string;
  rootCauseCategory?: string;
  customFilter?: 'overdue' | 'pending';
};

export function useDashboardDrilldown() {
  const navigate = useNavigate();

  // Optional context - returns null when outside DrilldownProvider
  const drilldownContext = useDrilldownContextOptional();

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

    // Map eventType to 'type' for IncidentList compatibility
    // For corrective actions, redirect to My Actions page
    if (filters.eventType === 'corrective_action') {
      if (filters.customFilter) params.set('filter', filters.customFilter);
      navigate(`/incidents/my-actions${params.toString() ? `?${params.toString()}` : ''}`);
      return;
    }

    if (filters.eventType) {
      // Map 'incident' to empty string if it's the default, or keep specific types
      // Actually IncidentList expects 'type' param
      params.set('type', filters.eventType);
    }

    // Map other filters
    if (filters.incidentType) params.set('incidentType', filters.incidentType);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.status) params.set('status', filters.status);
    if (filters.branchId) params.set('branch', filters.branchId); // IncidentList uses 'branch'
    if (filters.siteId) params.set('siteId', filters.siteId);
    if (filters.departmentId) params.set('departmentId', filters.departmentId);
    if (filters.rootCauseCategory) params.set('rootCauseCategory', filters.rootCauseCategory);

    const queryString = params.toString();
    // Point to IncidentList (/incidents) instead of investigation workspace
    navigate(`/incidents${queryString ? `?${queryString}` : ''}`);
  }, [navigate, drilldownContext]);

  const drillDownToActions = useCallback((filter?: 'overdue' | 'pending') => {
    // Use the unified drillDown function which handles the modal
    drillDown({
      eventType: 'corrective_action',
      customFilter: filter
    }, filter === 'overdue' ? 'Overdue Actions' : filter === 'pending' ? 'Pending Actions' : 'Corrective Actions');
  }, [drillDown]);

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
