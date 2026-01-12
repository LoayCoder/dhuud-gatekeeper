/**
 * Security Operations Types
 * Types for patrols, shifts, gate management, and access control
 */

// Shift status
export type ShiftStatus = 
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

// Patrol status
export type PatrolStatus = 
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'missed'
  | 'partial';

// Checkpoint status
export type CheckpointStatus = 
  | 'pending'
  | 'completed'
  | 'skipped'
  | 'issue_reported';

// Access level
export type AccessLevel = 
  | 'public'
  | 'restricted'
  | 'confidential'
  | 'top_secret';

// Gate type
export type GateType = 
  | 'main'
  | 'emergency'
  | 'service'
  | 'pedestrian'
  | 'vehicle';

// Security shift
export interface SecurityShift {
  id: string;
  tenant_id: string;
  officer_id: string;
  site_id?: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: ShiftStatus;
  
  // Actual times
  check_in_time?: string | null;
  check_out_time?: string | null;
  check_in_location?: { lat: number; lng: number } | null;
  check_out_location?: { lat: number; lng: number } | null;
  
  // Notes
  handover_notes?: string | null;
  shift_summary?: string | null;
  
  created_at: string;
  updated_at: string;
}

// Patrol route
export interface PatrolRoute {
  id: string;
  tenant_id: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  site_id?: string | null;
  estimated_duration_minutes?: number | null;
  is_active: boolean;
  checkpoint_count: number;
  created_at: string;
  updated_at: string;
}

// Patrol checkpoint
export interface PatrolCheckpoint {
  id: string;
  route_id: string;
  tenant_id: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  sequence_order: number;
  gps_lat?: number | null;
  gps_lng?: number | null;
  qr_code?: string | null;
  nfc_tag?: string | null;
  required_actions?: string[] | null;
  is_mandatory: boolean;
}

// Patrol session
export interface PatrolSession {
  id: string;
  tenant_id: string;
  route_id: string;
  officer_id: string;
  shift_id?: string | null;
  status: PatrolStatus;
  
  // Timing
  scheduled_start?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  
  // Progress
  checkpoints_total: number;
  checkpoints_completed: number;
  issues_reported: number;
  
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// Checkpoint visit
export interface CheckpointVisit {
  id: string;
  patrol_session_id: string;
  checkpoint_id: string;
  tenant_id: string;
  status: CheckpointStatus;
  visited_at?: string | null;
  
  // Verification
  verification_method?: 'qr' | 'nfc' | 'gps' | 'manual';
  gps_lat?: number | null;
  gps_lng?: number | null;
  gps_accuracy?: number | null;
  
  // Issue reporting
  issue_description?: string | null;
  issue_severity?: 'low' | 'medium' | 'high' | 'critical';
  photo_paths?: string[] | null;
  
  notes?: string | null;
}

// Gate
export interface Gate {
  id: string;
  tenant_id: string;
  site_id?: string | null;
  name: string;
  name_ar?: string | null;
  gate_type: GateType;
  is_active: boolean;
  gps_lat?: number | null;
  gps_lng?: number | null;
  created_at: string;
}

// Visitor
export interface Visitor {
  id: string;
  tenant_id: string;
  full_name: string;
  full_name_ar?: string | null;
  company_name?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  phone_number?: string | null;
  email?: string | null;
  photo_url?: string | null;
  
  // Visit info
  purpose?: string | null;
  host_id?: string | null;
  badge_number?: string | null;
  
  // Timing
  expected_arrival?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  
  status: 'expected' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  created_at: string;
  updated_at: string;
}

// Security incident (quick report)
export interface SecurityIncident {
  id: string;
  tenant_id: string;
  reporter_id: string;
  incident_type: 'unauthorized_access' | 'theft' | 'vandalism' | 'suspicious_activity' | 'emergency' | 'other';
  description: string;
  location_description?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'investigating' | 'resolved' | 'escalated';
  reported_at: string;
  resolved_at?: string | null;
  resolution_notes?: string | null;
}

// Daily security summary
export interface DailySecuritySummary {
  date: string;
  siteId?: string;
  totalShifts: number;
  completedShifts: number;
  totalPatrols: number;
  completedPatrols: number;
  totalVisitors: number;
  incidentsReported: number;
  gateEntriesCount: number;
}
