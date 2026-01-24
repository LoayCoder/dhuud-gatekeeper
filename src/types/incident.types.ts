/**
 * Incident Management Types
 * Types for incidents, investigations, corrective actions, and reporting
 */

// Incident severity levels
export type IncidentSeverity = 
  | 'minor'
  | 'moderate'
  | 'major'
  | 'critical'
  | 'catastrophic';

// Incident status
export type IncidentStatus = 
  | 'draft'
  | 'submitted'
  | 'under_investigation'
  | 'pending_action'
  | 'closed'
  | 'reopened';

// Incident types
export type IncidentType = 
  | 'injury'
  | 'near_miss'
  | 'property_damage'
  | 'environmental'
  | 'security'
  | 'fire'
  | 'chemical'
  | 'vehicle'
  | 'other';

// Investigation status
export type InvestigationStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'reviewed'
  | 'approved';

// Corrective action status
export type CorrectiveActionStatus = 
  | 'open'
  | 'in_progress'
  | 'pending_verification'
  | 'verified'
  | 'closed'
  | 'overdue';

// Corrective action priority
export type CorrectiveActionPriority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

// Root cause category
export type RootCauseCategory = 
  | 'human_factor'
  | 'equipment_failure'
  | 'process_failure'
  | 'environmental'
  | 'management_system'
  | 'external_factor';

// Incident core interface
export interface Incident {
  id: string;
  tenant_id: string;
  reference_id: string;
  incident_type: IncidentType;
  subtype?: string | null;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  
  // When & where
  incident_date: string;
  incident_time?: string | null;
  location_description?: string | null;
  site_id: string;
  branch_id: string;
  department_id: string;
  gps_lat?: number | null;
  gps_lng?: number | null;
  
  // People involved
  reporter_id: string;
  injured_person_id?: string | null;
  witness_ids?: string[] | null;
  
  // Classification
  is_recordable?: boolean;
  is_lost_time?: boolean;
  lost_days?: number | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  deleted_at?: string | null;
}

// Investigation
export interface Investigation {
  id: string;
  tenant_id: string;
  incident_id: string;
  lead_investigator_id: string;
  team_member_ids?: string[] | null;
  status: InvestigationStatus;
  
  // Findings
  root_cause_category?: RootCauseCategory | null;
  root_cause_description?: string | null;
  contributing_factors?: string[] | null;
  immediate_causes?: string[] | null;
  
  // Analysis
  methodology?: string | null;
  findings_summary?: string | null;
  recommendations?: string | null;
  
  // Timeline
  started_at?: string | null;
  completed_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  
  created_at: string;
  updated_at: string;
}

// Corrective Action (CAPA)
export interface CorrectiveAction {
  id: string;
  tenant_id: string;
  reference_id: string;
  source_type: 'incident' | 'inspection' | 'audit' | 'observation' | 'other';
  source_id?: string | null;
  
  title: string;
  description: string;
  action_type: 'corrective' | 'preventive';
  priority: CorrectiveActionPriority;
  status: CorrectiveActionStatus;
  
  // Assignment
  assigned_to: string;
  assigned_by?: string | null;
  due_date: string;
  
  // Completion
  completed_at?: string | null;
  completion_notes?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  
  // Escalation
  escalation_level?: number;
  last_escalated_at?: string | null;
  
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Incident statistics
export interface IncidentStatistics {
  totalIncidents: number;
  openIncidents: number;
  closedIncidents: number;
  bySeverity: Record<IncidentSeverity, number>;
  byType: Record<IncidentType, number>;
  byStatus: Record<IncidentStatus, number>;
  averageClosureTime: number; // in days
  recordableRate: number;
  lostTimeRate: number;
}

// Incident attachment
export interface IncidentAttachment {
  id: string;
  incident_id: string;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  mime_type?: string | null;
  attachment_type: 'photo' | 'document' | 'video' | 'audio';
  caption?: string | null;
  uploaded_by: string;
  uploaded_at: string;
}
