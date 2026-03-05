import React from 'react';
import { useIncidentReport } from './hooks/useIncidentReport';
import { IncidentReportForm } from './IncidentReportForm';

export default function IncidentReport() {
  const viewProps = useIncidentReport();
  return <IncidentReportForm viewProps={viewProps} />;
}
