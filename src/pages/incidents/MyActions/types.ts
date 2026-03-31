export interface ActionForDialog {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  due_date?: string | null;
  priority?: string | null;
  incident_id?: string | null;
  session_id?: string | null;
  source?: 'incident' | 'inspection';
  assigned_to?: string | null;
  source_type?: string | null;
  reference_id?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_date?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
  rejection_notes?: string | null;
  return_count?: number | null;
  last_return_reason?: string | null;
  last_returned_at?: string | null;
  progress_notes?: string | null;
  completion_notes?: string | null;
  overdue_justification?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- broad prop bag consumed by layout
export interface MyActionsViewProps {
  [key: string]: any;
}
