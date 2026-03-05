export type InvestigationType = 'single' | 'team';
export type TaskType = 'evidence_collection' | 'witness_interview' | 'property_assessment' | 'injury_documentation' | 'environmental_assessment' | 'other';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface AssignInvestigationTeamInput { incidentId: string; investigationType: InvestigationType; investigatorId?: string; teamLeaderId?: string; teamMemberIds?: string[]; assignmentNotes?: string; }
export interface AssignTeamTaskInput { investigationId: string; assignedTo: string; taskType: TaskType; taskDescription: string; targetArea?: string; dueDate?: string; priority?: TaskPriority; }
export interface CompleteTaskInput { taskId: string; completionNotes?: string; }

export interface InvestigationTeamTask {
    id: string; investigation_id: string; assigned_to: string; assigned_by: string;
    task_type: TaskType; task_description: string; target_area: string | null;
    status: TaskStatus; notes: string | null; completion_notes: string | null;
    completed_at: string | null; due_date: string | null; priority: TaskPriority;
    created_at: string; assignee?: { id: string; full_name: string }; assigner?: { id: string; full_name: string };
}
