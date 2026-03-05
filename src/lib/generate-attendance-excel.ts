/**
 * Generate Excel file for attendance records export
 */
import { format } from 'date-fns';
import { AttendanceRecord } from '@/features/security';
import { exportToExcel, ExportColumn } from './export-utils';

export interface AttendanceExcelOptions {
  records: AttendanceRecord[];
  filename?: string;
  language?: 'en' | 'ar';
}

const LABELS_EN = {
  guardName: 'Guard Name',
  employeeId: 'Employee ID',
  date: 'Date',
  zone: 'Zone',
  checkIn: 'Check In',
  checkOut: 'Check Out',
  hoursWorked: 'Hours Worked',
  lateMinutes: 'Late (min)',
  overtimeMinutes: 'Overtime (min)',
  gpsValidated: 'GPS Validated',
  status: 'Status',
};

const LABELS_AR = {
  guardName: 'Ø§Ø³Ù… Ø§Ù„Ø­Ø§Ø±Ø³',
  employeeId: 'Ø±Ù‚Ù… Ø§Ù„Ù…ÙˆØ¸Ù',
  date: 'Ø§Ù„ØªØ§Ø±ÙŠØ®',
  zone: 'Ø§Ù„Ù…Ù†Ø·Ù‚Ø©',
  checkIn: 'ÙˆÙ‚Øª Ø§Ù„Ø¯Ø®ÙˆÙ„',
  checkOut: 'ÙˆÙ‚Øª Ø§Ù„Ø®Ø±ÙˆØ¬',
  hoursWorked: 'Ø³Ø§Ø¹Ø§Øª Ø§Ù„Ø¹Ù…Ù„',
  lateMinutes: 'Ø§Ù„ØªØ£Ø®ÙŠØ± (Ø¯Ù‚ÙŠÙ‚Ø©)',
  overtimeMinutes: 'Ø§Ù„Ø¹Ù…Ù„ Ø§Ù„Ø¥Ø¶Ø§ÙÙŠ (Ø¯Ù‚ÙŠÙ‚Ø©)',
  gpsValidated: 'ØªØ­Ù‚Ù‚ GPS',
  status: 'Ø§Ù„Ø­Ø§Ù„Ø©',
};

const STATUS_EN: Record<string, string> = {
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  approved: 'Approved',
  rejected: 'Rejected',
  no_show: 'No Show',
  pending: 'Pending',
};

const STATUS_AR: Record<string, string> = {
  checked_in: 'ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„',
  checked_out: 'ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬',
  approved: 'Ù…ÙˆØ§ÙÙ‚ Ø¹Ù„ÙŠÙ‡',
  rejected: 'Ù…Ø±ÙÙˆØ¶',
  no_show: 'Ù„Ù… ÙŠØ­Ø¶Ø±',
  pending: 'Ù‚ÙŠØ¯ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±',
};

export function generateAttendanceExcel(options: AttendanceExcelOptions): void {
  const { records, filename, language = 'en' } = options;
  
  const labels = language === 'ar' ? LABELS_AR : LABELS_EN;
  const statusLabels = language === 'ar' ? STATUS_AR : STATUS_EN;
  
  const columns: ExportColumn[] = [
    { 
      key: 'guard_name', 
      label: labels.guardName 
    },
    { 
      key: 'employee_id', 
      label: labels.employeeId,
      formatter: (v) => v ? String(v) : '-'
    },
    { 
      key: 'date', 
      label: labels.date,
      formatter: (v) => v ? format(new Date(v as string), 'PP') : '-'
    },
    { 
      key: 'zone_name', 
      label: labels.zone,
      formatter: (v) => v ? String(v) : '-'
    },
    { 
      key: 'check_in', 
      label: labels.checkIn,
      formatter: (v) => v ? String(v) : '-'
    },
    { 
      key: 'check_out', 
      label: labels.checkOut,
      formatter: (v) => v ? String(v) : '-'
    },
    { 
      key: 'hours_worked', 
      label: labels.hoursWorked,
      formatter: (v) => v !== null && v !== undefined ? `${v}h` : '-'
    },
    { 
      key: 'late_minutes', 
      label: labels.lateMinutes,
      formatter: (v) => String(v || 0)
    },
    { 
      key: 'overtime_minutes', 
      label: labels.overtimeMinutes,
      formatter: (v) => String(v || 0)
    },
    { 
      key: 'gps_validated', 
      label: labels.gpsValidated,
      formatter: (v) => v ? 'âœ“' : 'âœ—'
    },
    { 
      key: 'status', 
      label: labels.status,
      formatter: (v) => statusLabels[v as string] || String(v || '-')
    },
  ];
  
  const defaultFilename = `attendance-export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  
  exportToExcel(records, filename || defaultFilename, columns);
}

