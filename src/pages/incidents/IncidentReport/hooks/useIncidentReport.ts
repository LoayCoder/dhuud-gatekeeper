import { useIncidentReportState } from './useIncidentReportState';
import { useIncidentReportData } from './useIncidentReportData';
import { useIncidentReportSubmit } from './useIncidentReportSubmit';

export function useIncidentReport() {
  const state = useIncidentReportState();
  const data = useIncidentReportData(state);
  const submit = useIncidentReportSubmit(state, data);

  return {
    ...state,
    ...data,
    ...submit
  };
}