
import { Database } from "@/integrations/supabase/types";

// Re-export specific database types if needed
export type Incident = Database['public']['Tables']['incidents']['Row'];
export type InvestigationRecord = Database['public']['Tables']['investigations']['Row'];

// Domain specific types
export enum WorkflowStage {
    Triage = 'triage',
    Assignment = 'assignment',
    DataCollection = 'data_collection',
    Analysis = 'analysis', // RCA
    ActionPlanning = 'action_planning',
    Review = 'review',
    Closure = 'closure',
    ReadOnly = 'read_only' // For closed cases or insufficient permissions
}

export enum InvestigationRole {
    Reporter = 'reporter',
    Investigator = 'investigator',
    LeadInvestigator = 'lead_investigator',
    DeptRep = 'dept_rep',
    Manager = 'manager',
    HSSEManager = 'hsse_manager',
    HSSEExpert = 'hsse_expert',
    Consultant = 'consultant',
    Viewer = 'viewer'
}

export interface InvestigationContextType {
    incidentId: string | null;
    incident: Incident | null;
    investigation: InvestigationRecord | null;
    isLoading: boolean;
    error: Error | null;

    // Workflow State
    // Workflow State
    currentStage: WorkflowStage;
    userRole: InvestigationRole;
    allowedActions: string[];
    userPermissions: UserPermissions;

    // Actions
    refresh: () => void;
}

export interface UserPermissions {
    canAssignInvestigator: boolean;
}

export interface FiveWhyEntry {
    why: string;
    answer: string;
}

export interface RootCauseEntry {
    id: string;
    text: string;
    category?: string;
    added_at?: string;
}

// Extends the base InvestigationRecord with parsed JSON fields
export interface EnhancedInvestigation extends Omit<InvestigationRecord, 'five_whys' | 'root_causes'> {
    five_whys: FiveWhyEntry[] | null;
    root_causes: RootCauseEntry[] | null;
}
