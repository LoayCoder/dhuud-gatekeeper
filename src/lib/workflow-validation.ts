
import { supabase } from '@/integrations/supabase/client';

export async function validateIncidentGate(incidentId: string): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // 1. Check Evidence - use explicit column selection to avoid type instantiation issues
  const { data: evidence, error: evError } = await supabase
    .from('incident_evidence')
    .select('id, is_soft_deleted')
    .eq('incident_id', incidentId)
    .eq('is_soft_deleted', false);

  if (evError || !evidence || evidence.length === 0) {
    errors.push('At least one piece of evidence is required.');
  }

  // 2. Check Witness Statements - select specific columns
  // Note: witness_statements table does not have a status column
  const { data: witness, error: witError } = await supabase
    .from('witness_statements')
    .select('id')
    .eq('incident_id', incidentId);

  // Note: Witness might not be mandatory for all, but if present, must be approved.
  // If mandatory:
  // if (!witness || witness.length === 0) errors.push('At least one witness statement is required.');

  // 3. Check RCA - use explicit column selection
  const { data: rca, error: rcaError } = await supabase
    .from('incident_rca')
    .select('id, is_locked')
    .eq('incident_id', incidentId)
    .maybeSingle();

  if (rcaError || !rca) {
    errors.push('Root Cause Analysis (RCA) must be completed.');
  } else if (!rca.is_locked) {
    errors.push('RCA must be finalized and locked.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export async function validateActionClosureGate(incidentId: string): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Check if all actions are closed - bypass deep type instantiation
  const result = await (supabase
    .from('corrective_actions' as never) as unknown)
    .select('id, status')
    .eq('source_id', incidentId);
  
  const actions = result.data as Array<{ id: string; status: string }> | null;
  const actError = result.error as Error | null;

  if (actError) {
    errors.push('Failed to fetch actions.');
    return { valid: false, errors };
  }

  const openActions = actions?.filter(a => a.status !== 'closed');
  if (openActions && openActions.length > 0) {
    errors.push(`${openActions.length} corrective actions are still open.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
