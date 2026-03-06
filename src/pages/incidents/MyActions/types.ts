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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- broad prop bag consumed by layout
export interface MyActionsViewProps {
  [key: string]: any;
}
