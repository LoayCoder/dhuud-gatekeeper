/**
 * TypeScript types for the Public Gate Pass System
 */

// Status types for public gate passes
export type PublicGatePassStatus =
  | 'pending_mgmt'      // Initial status - waiting for management acknowledgment
  | 'acknowledged'      // Management has acknowledged the request
  | 'pending_pm'        // Waiting for PM approval (legacy compatibility)
  | 'pending_safety'    // Waiting for safety approval (legacy compatibility)
  | 'approved'          // Fully approved - pass is valid
  | 'rejected'          // Request was rejected
  | 'used'              // Pass has been used (entry recorded)
  | 'expired'           // Pass date has passed without use
  | 'cancelled'         // Request was cancelled
  | 'completed';        // Entry and exit both recorded

// Pass type
export type GatePassType = 'in' | 'out' | 'in_out';

// Tenant information for public display
export interface PublicTenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string;
  allow_public_gate_pass_requests: boolean;
  public_gate_pass_instructions: string | null;
  public_gate_pass_instructions_ar: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_name?: string | null;
}

// Branch information for public display
export interface PublicBranch {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_phone: string | null;
  contact_email: string | null;
}

// Form data for submitting a public gate pass request
export interface PublicGatePassFormData {
  // Requester information
  requester_name: string;
  requester_phone: string;      // E.164 format: +966501234567
  requester_email?: string;
  requester_company?: string;

  // Location
  branch_id?: string;

  // Pass details
  pass_type: GatePassType;
  material_description: string;
  quantity?: string;

  // Vehicle & Driver
  vehicle_plate?: string;
  driver_name?: string;
  driver_mobile?: string;

  // Schedule
  pass_date: string;            // YYYY-MM-DD
  time_window_start?: string;   // HH:MM
  time_window_end?: string;     // HH:MM

  // Notification preferences
  notify_whatsapp?: boolean;
  notify_email?: boolean;
  notify_sms?: boolean;
}

// API submission payload
export interface PublicGatePassSubmission extends PublicGatePassFormData {
  tenant_slug: string;
}

// API response from submission
export interface PublicGatePassSubmissionResult {
  success: boolean;
  error?: string;
  gate_pass_id?: string;
  reference_number?: string;
  public_access_token?: string;
  tracking_url?: string;
}

// Gate pass status data (returned from API)
export interface PublicGatePassStatusData {
  id: string;
  reference_number: string;
  status: PublicGatePassStatus;
  pass_type: GatePassType;
  pass_date: string;
  time_window_start: string | null;
  time_window_end: string | null;
  material_description: string;
  quantity: string | null;
  vehicle_plate: string | null;
  driver_name: string | null;
  driver_mobile: string | null;
  requester_name: string;
  requester_phone: string;
  requester_company: string | null;
  created_at: string;
  pm_approved_at: string | null;
  safety_approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  entry_time: string | null;
  exit_time: string | null;
}

// Full status response including tenant and branch info
export interface PublicGatePassStatusResponse {
  success: boolean;
  error?: string;
  gate_pass?: PublicGatePassStatusData;
  branch?: {
    name: string;
    location: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
  };
  tenant?: {
    name: string;
    logo_url: string | null;
    brand_color: string;
    instructions: string | null;
    instructions_ar: string | null;
  };
}

// Status step configuration for stepper component
export interface StatusStepConfig {
  label: string;
  labelAr: string;
  color: string;
  icon: string;
  step: number;
}

// Notification event types
export type PublicGatePassNotificationEvent =
  | 'submitted'
  | 'acknowledged'
  | 'approved'
  | 'rejected';

// Notification payload (for edge function)
export interface PublicGatePassNotificationPayload {
  gate_pass_id: string;
  tenant_id: string;
  branch_id?: string;
  reference_number: string;
  requester_name: string;
  requester_phone: string;
  requester_email?: string;
  requester_company?: string;
  material_description: string;
  pass_date: string;
  tracking_url: string;
  event_type: PublicGatePassNotificationEvent;
  rejection_reason?: string;
}

// Rate limit error response
export interface RateLimitError {
  success: false;
  error: 'Rate limit exceeded. Please try again later.';
}

// Validation error
export interface ValidationError {
  success: false;
  error: string;
  field?: string;
}

// Generic API error
export interface PublicGatePassApiError {
  success: false;
  error: string;
}

// Union type for all possible errors
export type PublicGatePassError = RateLimitError | ValidationError | PublicGatePassApiError;

// Helper type guard for checking if response is an error
export function isPublicGatePassError(
  response: PublicGatePassSubmissionResult | PublicGatePassStatusResponse | PublicGatePassError
): response is PublicGatePassError {
  return !response.success;
}

// Status display configuration
export const PUBLIC_GATE_PASS_STATUS_CONFIG: Record<PublicGatePassStatus, StatusStepConfig> = {
  pending_mgmt: {
    label: 'Submitted',
    labelAr: 'تم التقديم',
    color: 'bg-blue-500',
    icon: 'Clock',
    step: 1,
  },
  acknowledged: {
    label: 'Acknowledged',
    labelAr: 'تم الاستلام',
    color: 'bg-amber-500',
    icon: 'CheckCircle2',
    step: 2,
  },
  pending_pm: {
    label: 'Under Review',
    labelAr: 'قيد المراجعة',
    color: 'bg-amber-500',
    icon: 'Clock',
    step: 2,
  },
  pending_safety: {
    label: 'Safety Review',
    labelAr: 'مراجعة السلامة',
    color: 'bg-amber-500',
    icon: 'Clock',
    step: 2,
  },
  approved: {
    label: 'Approved',
    labelAr: 'تمت الموافقة',
    color: 'bg-green-500',
    icon: 'CheckCircle2',
    step: 3,
  },
  rejected: {
    label: 'Rejected',
    labelAr: 'مرفوض',
    color: 'bg-red-500',
    icon: 'XCircle',
    step: -1,
  },
  used: {
    label: 'Used',
    labelAr: 'مستخدم',
    color: 'bg-gray-500',
    icon: 'CheckCircle2',
    step: 4,
  },
  expired: {
    label: 'Expired',
    labelAr: 'منتهي الصلاحية',
    color: 'bg-gray-500',
    icon: 'AlertTriangle',
    step: -1,
  },
  cancelled: {
    label: 'Cancelled',
    labelAr: 'ملغي',
    color: 'bg-gray-500',
    icon: 'XCircle',
    step: -1,
  },
  completed: {
    label: 'Completed',
    labelAr: 'مكتمل',
    color: 'bg-green-600',
    icon: 'CheckCircle2',
    step: 4,
  },
};

// Helper function to get status config
export function getStatusConfig(status: string): StatusStepConfig {
  return PUBLIC_GATE_PASS_STATUS_CONFIG[status as PublicGatePassStatus] ||
    PUBLIC_GATE_PASS_STATUS_CONFIG.pending_mgmt;
}

// Helper function to check if status is terminal (no more changes expected)
export function isTerminalStatus(status: PublicGatePassStatus): boolean {
  return ['rejected', 'expired', 'cancelled', 'completed', 'used'].includes(status);
}

// Helper function to check if pass is currently valid for entry
export function isPassValidForEntry(status: PublicGatePassStatus): boolean {
  return status === 'approved';
}
