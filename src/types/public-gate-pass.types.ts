/**
 * Public Gate Pass Types
 * Types for public (unauthenticated) gate pass submissions and tracking
 */

// Public gate pass status in workflow
export type PublicGatePassStatus =
  | 'pending_management'
  | 'pending_security_approval'
  | 'approved'
  | 'rejected'
  | 'used'
  | 'expired'
  | 'cancelled';

// Pass type (direction)
export type GatePassDirection = 'in' | 'out' | 'in_out';

// Workflow step for status tracking
export interface WorkflowStep {
  step: number;
  label: string;
  isComplete: boolean;
}

// Public tenant info (minimal info for public pages)
export interface PublicTenantInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  allow_public_gate_pass_requests: boolean;
}

// Public branch info
export interface PublicBranchInfo {
  id: string;
  name: string;
  address: string | null;
  google_maps_url: string | null;
}

// Public gate pass submission form data
export interface PublicGatePassFormData {
  tenant_slug: string;
  branch_id: string;
  material_description: string;
  quantity?: string;
  pass_date: string;
  time_window_start?: string;
  time_window_end?: string;
  pass_type: GatePassDirection;
  vehicle_plate?: string;
  driver_name?: string;
  driver_id?: string;
  // Public requester info
  public_requester_name: string;
  public_requester_phone: string;
  public_requester_email?: string;
  public_requester_company?: string;
  // Attachments
  attachment_urls?: string[];
}

// Response from submission
export interface PublicGatePassSubmitResponse {
  success: boolean;
  reference_number?: string;
  public_access_token?: string;
  tracking_url?: string;
  error?: string;
}

// Public gate pass status response
export interface PublicGatePassStatusData {
  id: string;
  reference_number: string;
  status: PublicGatePassStatus;
  pass_date: string;
  time_window_start: string | null;
  time_window_end: string | null;
  material_description: string;
  quantity: string | null;
  pass_type: GatePassDirection;
  vehicle_plate: string | null;
  driver_name: string | null;
  public_requester_name: string;
  public_requester_company: string | null;
  branch: PublicBranchInfo | null;
  tenant: {
    name: string;
    logo_url: string | null;
    brand_color: string | null;
  } | null;
  // QR code for approved passes
  qr_code_token: string | null;
  qr_generated_at: string | null;
  // Approval info
  approved_at: string | null;
  approved_by_name: string | null;
  rejection_reason: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface PublicGatePassStatusResponse {
  success: boolean;
  data?: PublicGatePassStatusData;
  workflow_steps?: WorkflowStep[];
  error?: string;
}

// Phone validation helper type
export interface PhoneValidationResult {
  isValid: boolean;
  formattedNumber: string;
  countryCode: string;
  error?: string;
}
