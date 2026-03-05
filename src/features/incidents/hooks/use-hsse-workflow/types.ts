import { type SeverityLevelV2 } from "@/lib/hsse-severity-levels";

export type ExpertRecommendation = 'investigate' | 'no_investigation' | 'return' | 'reject' | 'assign_actions';
export type ManagerDecision = 'approved' | 'rejected' | 'reject_severity_approve_investigation';
export type HSSEManagerDecision = 'override' | 'maintain';
export type DeptRepDecision = 'approve' | 'escalate';

export interface ExpertScreeningInput {
    incidentId: string; recommendation: ExpertRecommendation; notes?: string;
    returnReason?: string; returnInstructions?: string; rejectionReason?: string;
    noInvestigationJustification?: string; newSeverity?: SeverityLevelV2;
}

export interface DeptRepApprovalInput { incidentId: string; decision: DeptRepDecision; notes?: string; }
export interface ManagerApprovalInput { incidentId: string; decision: ManagerDecision; rejectionReason?: string; }
export interface HSSEManagerEscalationInput { incidentId: string; decision: HSSEManagerDecision; justification: string; }
export interface ReporterResponseInput { incidentId: string; action: 'resubmit' | 'resubmit_to_expert' | 'confirm_rejection' | 'dispute_rejection'; disputeNotes?: string; }
