import { StakeholderRole, EventType, NotificationMatrixRule } from '@/features/notifications';

export interface RuleFormState {
  stakeholder_role: StakeholderRole | '';
  severity_from: string;
  severity_to: string;
  channels: string[];
  condition_type: string | null;
  user_id: string | null;
  isUserSpecific: boolean;
  whatsapp_template_id: string | null;
  email_template_id: string | null;
  push_template_id: string | null;
  event_type: EventType;
}

