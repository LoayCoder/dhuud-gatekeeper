/**
 * Shared types for the investigation domain.
 * Extends IncidentWithDetails with fields accessed across violation cards,
 * workflow trackers, and approval components.
 */

import type { IncidentWithDetails } from '@/features/incidents';

/**
 * Extended incident fields used across investigation components.
 * Cast incident props to this type once at component top instead of inline `as any`.
 */
export interface ViolationIncidentFields extends IncidentWithDetails {
  // --- Violation fields ---
  violation_type_id: string | null;
  violation_occurrence: number | null;
  violation_penalty_type: string | null;
  violation_fine_amount: number | null;
  violation_fine_currency: string | null;
  violation_action_description: string | null;
  violation_final_status: string | null;
  violation_notes: string | null;
  violation_category: string | null;
  violation_severity: string | null;

  // --- Violation approval trail ---
  violation_dept_manager_decision: string | null;
  violation_dept_manager_approved_at: string | null;
  violation_contract_controller_decision: string | null;
  violation_contract_controller_approved_at: string | null;
  violation_contractor_rep_decision: string | null;
  violation_contractor_rep_acknowledged_at: string | null;
  violation_hsse_decision: string | null;
  violation_hsse_decided_at: string | null;
  violation_finalized_at: string | null;
  violation_identified: boolean | null;

  // --- Severity fallback (severity already exists on base; severity_level is extra) ---
  severity_level: string | null;

  // --- Incident type (HSSE category) ---
  incident_type: string | null;

  // --- Workflow timestamp fields ---
  consultant_screened_at: string | null;
  dept_rep_acknowledged_at: string | null;
  dept_rep_notes: string | null;
  hsse_expert_reviewed_at: string | null;
  expert_screened_at: string | null;
  site_client_approved_at: string | null;
  contractor_actions_completed_at: string | null;
  contractor_implemented_at: string | null;
  hsse_enforced_at: string | null;

  // --- Reporter correction fields ---
  return_reason: string | null;
  return_instructions: string | null;
  resubmission_count: number | null;

  // --- Rejection fields ---
  expert_rejection_reason: string | null;
  expert_resubmission_count: number | null;
  expert_screening_notes: string | null;

  // --- Manager escalation fields ---
  manager_rejection_reason: string | null;
  reporter_dispute_notes: string | null;
  reporter_disputes_rejection: boolean | null;

  // --- No-investigation fields ---
  no_investigation_justification: string | null;

  // --- Environmental fields ---
  has_environmental_impact: boolean | null;
  ai_detected_environmental: boolean | null;

  // --- Clinic/injury fields ---
  injury_info: string | null;
}

/**
 * RCA update record for upsert operations.
 */
export interface RCAUpsertRecord {
  incident_id: string;
  tenant_id: string;
  updated_at: string;
  five_whys?: unknown;
  root_causes?: unknown;
  contributing_factors?: unknown;
  immediate_causes?: string[];
  underlying_causes?: string[];
}
