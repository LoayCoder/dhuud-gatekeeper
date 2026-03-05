export interface WizardProps {
  projectId?: string;
  contractorId?: string;
  onComplete?: (assessmentId: string) => void;
}
