import { z } from "zod";

export interface RootCause {
  id: string;
  text: string;
}

export interface ContributingFactor {
  id: string;
  text: string;
}

export const actionSchema = z.object({
  title: z.string().min(3, 'Title is required (min 3 characters)'),
  description: z.string().min(10, 'Description is required (min 10 characters)'),
  responsible_department_id: z.string().min(1, 'Department is required'),
  assigned_to: z.string().min(1, 'Assignee is required'),
  start_date: z.string().min(1, 'Start date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  action_type: z.enum(['corrective', 'preventive', 'improvement']),
  category: z.enum(['engineering', 'administrative', 'ppe', 'training', 'procedure_update']),
  linked_cause_type: z.enum(['root_cause', 'contributing_factor']).optional().nullable(),
  linked_root_cause_id: z.string().optional().nullable(),
}).refine((data) => {
  if (data.start_date && data.due_date) {
    return new Date(data.start_date) <= new Date(data.due_date);
  }
  return true;
}, { message: 'Start date must be before due date', path: ['due_date'] });

export type ActionFormValues = z.infer<typeof actionSchema>;

export interface ActionsPanelProps {
  incidentId: string;
  incidentStatus?: string | null;
  canEdit?: boolean;
  onActionChange?: () => void;
  openDialogTrigger?: boolean;
  onDialogTriggered?: () => void;
}
