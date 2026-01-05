// Training guide type definitions

export type RoleCategory = 'reporter' | 'department' | 'management' | 'hsse' | 'admin';

export interface BilingualText {
  en: string;
  ar: string;
}

export interface Responsibility {
  id: string;
  title: BilingualText;
  description: BilingualText;
  priority: 'critical' | 'high' | 'medium';
}

export interface WorkflowStep {
  status: string;
  statusLabel: BilingualText;
  action: BilingualText;
  howTo: BilingualText;
  nextStep?: string;
  timeLimit?: string;
}

export interface MyActionsTabGuide {
  tab: string;
  tabLabel: BilingualText;
  description: BilingualText;
  actions: BilingualText[];
}

export interface FAQ {
  question: BilingualText;
  answer: BilingualText;
}

export interface QuickReference {
  keyPages: BilingualText[];
  shortcuts: BilingualText[];
  tips: BilingualText[];
}

export interface RoleTrainingGuide {
  roleCode: string;
  roleName: BilingualText;
  category: RoleCategory;
  icon: string;
  color: string;
  overview: BilingualText;
  responsibilities: Responsibility[];
  incidentWorkflow: WorkflowStep[];
  observationWorkflow: WorkflowStep[];
  myActionsGuide: MyActionsTabGuide[];
  faqs: FAQ[];
  quickReference: QuickReference;
}
