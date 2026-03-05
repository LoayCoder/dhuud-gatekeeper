import { format } from 'date-fns';

export interface ManhourFormData {
  period_date: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  employee_hours: number;
  contractor_hours: number;
  employee_count: number;
  contractor_count: number;
  hours_per_day: number;
  working_days: number;
  calculation_mode: 'manual' | 'auto';
  branch_id: string;
  site_id: string;
  department_id: string;
  notes: string;
}

export interface ImportRow {
  period_date: string;
  period_type: string;
  employee_hours: number;
  contractor_hours: number;
  employee_count?: number;
  contractor_count?: number;
  hours_per_day?: number;
  working_days?: number;
  branch_name?: string;
  site_name?: string;
  notes?: string;
  isValid: boolean;
  errors: string[];
}

export const getDefaultWorkingDays = (periodType: 'daily' | 'weekly' | 'monthly') => {
  switch (periodType) {
    case 'daily': return 1;
    case 'weekly': return 5;
    case 'monthly': return 22;
    default: return 22;
  }
};

// Work schedule presets
export interface WorkSchedulePreset {
  id: string;
  label: string;
  hoursPerDay: number;
  workingDays: number;
  description: string;
}

export const workSchedulePresets: WorkSchedulePreset[] = [
  { id: 'standard_5day', label: 'Standard 5-Day Week', hoursPerDay: 8, workingDays: 22, description: '8h × 22 days' },
  { id: 'standard_6day', label: 'Standard 6-Day Week', hoursPerDay: 8, workingDays: 26, description: '8h × 26 days' },
  { id: 'shift_12h', label: '12-Hour Shift', hoursPerDay: 12, workingDays: 15, description: '12h × 15 days' },
  { id: 'shift_10h', label: '10-Hour Shift (4-Day)', hoursPerDay: 10, workingDays: 18, description: '10h × 18 days' },
  { id: 'part_time', label: 'Part-Time', hoursPerDay: 4, workingDays: 22, description: '4h × 22 days' },
  { id: 'custom', label: 'Custom', hoursPerDay: 8, workingDays: 22, description: 'Custom schedule' },
];

export const defaultFormData: ManhourFormData = {
  period_date: format(new Date(), 'yyyy-MM-dd'),
  period_type: 'monthly',
  employee_hours: 0,
  contractor_hours: 0,
  employee_count: 0,
  contractor_count: 0,
  hours_per_day: 8,
  working_days: 22,
  calculation_mode: 'manual',
  branch_id: '',
  site_id: '',
  department_id: '',
  notes: '',
};

