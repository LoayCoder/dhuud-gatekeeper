import { RuleFormState } from './types';

export const getInitialFormState = (): RuleFormState => ({
  stakeholder_role: '',
  severity_from: 'level_1',
  severity_to: 'level_5',
  channels: [],
  condition_type: null,
  user_id: null,
  isUserSpecific: false,
  whatsapp_template_id: null,
  email_template_id: null,
  push_template_id: null,
  event_type: 'incident',
});

// Severity level colors following HSSA standards
export const SEVERITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  level_1: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Low' },
  level_2: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Moderate' },
  level_3: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'Serious' },
  level_4: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Major' },
  level_5: { bg: 'bg-red-200 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300', label: 'Catastrophic' },
};
