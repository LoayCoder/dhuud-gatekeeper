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
}

export interface MyActionsViewProps {
  t?: (key: string, fallback?: string) => string;
  isLoading?: boolean;
  allActions?: ActionForDialog[];
  [key: string]: unknown;
}
