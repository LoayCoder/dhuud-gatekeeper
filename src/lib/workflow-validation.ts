
import { supabase } from '@/integrations/supabase/client';

export async function validateIncidentGate(incidentId: string): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // 1. Check Evidence
  const { data: evidence, error: evError } = await supabase
    .from('incident_evidence')
    .select('*')
    .eq('incident_id', incidentId)
    .eq('is_soft_deleted', false);

  if (evError || !evidence || evidence.length === 0) {
    errors.push('At least one piece of evidence is required.');
  }

  // 2. Check Witness Statements
  const { data: witness, error: witError } = await supabase
    .from('witness_statements')
    .select('*')
    .eq('incident_id', incidentId)
    .eq('status', 'approved'); // Must be approved

  // Note: Witness might not be mandatory for all, but if present, must be approved.
  // If mandatory:
  // if (!witness || witness.length === 0) errors.push('At least one witness statement is required.');

  // 3. Check RCA
  const { data: rca, error: rcaError } = await supabase
    .from('incident_rca')
    .select('*')
    .eq('incident_id', incidentId)
    .single();

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

  // Check if all actions are closed
  const { data: actions, error: actError } = await supabase
    .from('corrective_actions') // Assuming this table
    .select('status')
    .eq('source_id', incidentId); // Assuming linked via source_id or incident_id

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
