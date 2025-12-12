import { useNavigate } from "react-router-dom";
import { useCallback } from "react";

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

  const drillDown = useCallback((filters: DrillDownFilter) => {
    const params = new URLSearchParams();
    
    if (filters.incidentId) {
      // Navigate directly to investigation workspace with incident selected
      navigate(`/incidents/investigate?incidentId=${filters.incidentId}`);
      return;
    }

    if (filters.eventType) params.set('eventType', filters.eventType);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.status) params.set('status', filters.status);
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.siteId) params.set('siteId', filters.siteId);
    if (filters.departmentId) params.set('departmentId', filters.departmentId);

    const queryString = params.toString();
    navigate(`/incidents/investigate${queryString ? `?${queryString}` : ''}`);
  }, [navigate]);

  const drillDownToActions = useCallback((filter?: 'overdue' | 'pending') => {
    const params = filter ? `?filter=${filter}` : '';
    navigate(`/my-actions${params}`);
  }, [navigate]);

  return { drillDown, drillDownToActions };
}
