// Investigation edit access hook stub
import { useAuth } from '@/contexts/AuthContext';

export function useInvestigationEditAccess(investigation: any) {
  const { user } = useAuth();
  
  const canEdit = !!(
    investigation &&
    user &&
    (investigation.investigator_id === user.id || investigation.status !== 'approved')
  );
  
  return { canEdit, reason: canEdit ? null : 'No edit access' };
}
