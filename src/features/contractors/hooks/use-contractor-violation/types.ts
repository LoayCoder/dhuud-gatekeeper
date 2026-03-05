export interface ViolationDetails {
    occurrence: number; occurrence_label: string; action_type: string | null;
    fine_amount: number | null; action_description: string | null; is_fine_only: boolean;
    violation_type: { id: string; name: string; name_ar: string | null; severity_level: string; category: string | null; };
}
export type DeptManagerViolationDecision = 'approved' | 'rejected';
export type ContractControllerDecision = 'approved' | 'rejected';
export type ContractorSiteRepDecision = 'acknowledged' | 'rejected';
export type HSSEViolationDecision = 'enforce' | 'modify' | 'cancel';
