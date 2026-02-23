import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);
  const job = url.searchParams.get('job');

  console.log(`[hsse-cron] Starting job: ${job}`);

  try {
    switch (job) {
      case 'sla_check':
        return await handleSlaCheck(supabase, supabaseUrl, serviceRoleKey);
      case 'monitoring_termination':
        return await handleMonitoringTermination(supabase, supabaseUrl, serviceRoleKey);
      case 'evidence_purge':
        return await handleEvidencePurge(supabase);
      default:
        return new Response(
          JSON.stringify({ error: `Unknown job: ${job}. Valid: sla_check, monitoring_termination, evidence_purge` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error(`[hsse-cron] Job ${job} failed:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================
// C11: Investigation 30-Day SLA Auto-Escalation
// ============================================
async function handleSlaCheck(supabase: any, supabaseUrl: string, serviceRoleKey: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: breached, error } = await supabase
    .from('incidents')
    .select('id, tenant_id, reference_id, investigation_started_at')
    .eq('status', 'investigation_in_progress')
    .lt('investigation_started_at', thirtyDaysAgo)
    .neq('sla_breached', true)
    .is('deleted_at', null);

  if (error) {
    console.error('[sla_check] Query error:', error);
    throw error;
  }

  console.log(`[sla_check] Found ${breached?.length || 0} breached investigations`);

  let processed = 0;
  for (const incident of breached || []) {
    const daysElapsed = Math.floor(
      (Date.now() - new Date(incident.investigation_started_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Flag as breached
    const { error: updateErr } = await supabase
      .from('incidents')
      .update({ sla_breached: true })
      .eq('id', incident.id);

    if (updateErr) {
      console.error(`[sla_check] Failed to update ${incident.id}:`, updateErr);
      continue;
    }

    // Audit log
    await supabase.from('incident_audit_logs').insert({
      incident_id: incident.id,
      tenant_id: incident.tenant_id,
      action: 'sla_30d_breach',
      details: { days_elapsed: daysElapsed, reference_id: incident.reference_id },
    });

    // Dispatch notification
    try {
      const notifyRes = await fetch(`${supabaseUrl}/functions/v1/dispatch-incident-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          incident_id: incident.id,
          event_type: 'sla_30d_breach',
        }),
      });
      if (!notifyRes.ok) {
        console.warn(`[sla_check] Notification failed for ${incident.id}: ${notifyRes.status}`);
      }
    } catch (e) {
      console.warn(`[sla_check] Notification error for ${incident.id}:`, e.message);
    }

    processed++;
  }

  return new Response(
    JSON.stringify({ job: 'sla_check', processed, total: breached?.length || 0 }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// C12: Monitoring 90-Day Auto-Termination
// ============================================
async function handleMonitoringTermination(supabase: any, supabaseUrl: string, serviceRoleKey: string) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Query incidents in any monitoring status that have been monitoring for > 90 days
  const { data: expired, error } = await supabase
    .from('incidents')
    .select('id, tenant_id, reference_id, status, monitoring_started_at')
    .in('status', ['monitoring_30_day', 'monitoring_60_day', 'monitoring_90_day'])
    .lt('monitoring_started_at', ninetyDaysAgo)
    .is('deleted_at', null);

  if (error) {
    console.error('[monitoring_termination] Query error:', error);
    throw error;
  }

  console.log(`[monitoring_termination] Found ${expired?.length || 0} expired monitoring incidents`);

  let processed = 0;
  const now = new Date().toISOString();

  for (const incident of expired || []) {
    // Close the incident
    const { error: updateErr } = await supabase
      .from('incidents')
      .update({ status: 'closed', closed_at: now })
      .eq('id', incident.id);

    if (updateErr) {
      console.error(`[monitoring_termination] Failed to close ${incident.id}:`, updateErr);
      continue;
    }

    // Audit log
    await supabase.from('incident_audit_logs').insert({
      incident_id: incident.id,
      tenant_id: incident.tenant_id,
      action: 'monitoring_auto_terminated_90d',
      details: {
        previous_status: incident.status,
        monitoring_started_at: incident.monitoring_started_at,
        reference_id: incident.reference_id,
      },
    });

    // Dispatch notification
    try {
      const notifyRes = await fetch(`${supabaseUrl}/functions/v1/dispatch-incident-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          incident_id: incident.id,
          event_type: 'monitoring_auto_terminated',
        }),
      });
      if (!notifyRes.ok) {
        console.warn(`[monitoring_termination] Notification failed for ${incident.id}: ${notifyRes.status}`);
      }
    } catch (e) {
      console.warn(`[monitoring_termination] Notification error for ${incident.id}:`, e.message);
    }

    processed++;
  }

  return new Response(
    JSON.stringify({ job: 'monitoring_termination', processed, total: expired?.length || 0 }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// C13: Evidence Retention Purge (7 years)
// ============================================
async function handleEvidencePurge(supabase: any) {
  const retentionCutoff = new Date(Date.now() - 2555 * 24 * 60 * 60 * 1000).toISOString();
  let totalPurged = 0;
  let skippedLitigation = 0;

  // --- Process incident_evidence table (batch limit 100) ---
  const { data: oldEvidence, error: evErr } = await supabase
    .from('incident_evidence')
    .select('id, incident_id, tenant_id, file_url, file_name, created_at')
    .lt('created_at', retentionCutoff)
    .limit(100);

  if (evErr) {
    console.error('[evidence_purge] incident_evidence query error:', evErr);
  }

  for (const ev of oldEvidence || []) {
    // Check litigation hold on parent incident
    const { data: incident } = await supabase
      .from('incidents')
      .select('litigation_hold')
      .eq('id', ev.incident_id)
      .single();

    if (incident?.litigation_hold) {
      skippedLitigation++;
      console.log(`[evidence_purge] Skipping ${ev.id} - litigation hold on incident ${ev.incident_id}`);
      continue;
    }

    // Delete physical file from storage
    if (ev.file_url) {
      const filePath = extractStoragePath(ev.file_url);
      if (filePath) {
        const { error: storageErr } = await supabase.storage
          .from('incident-attachments')
          .remove([filePath]);
        if (storageErr) {
          console.warn(`[evidence_purge] Storage delete failed for ${filePath}:`, storageErr);
        }
      }
    }

    // Hard delete the DB row (retention period expired)
    await supabase.from('incident_evidence').delete().eq('id', ev.id);

    // Audit log
    await supabase.from('incident_audit_logs').insert({
      incident_id: ev.incident_id,
      tenant_id: ev.tenant_id,
      action: 'evidence_purged_retention',
      details: {
        evidence_id: ev.id,
        file_name: ev.file_name,
        reason: '7yr_retention_expired',
        original_created_at: ev.created_at,
      },
    });

    totalPurged++;
  }

  // --- Process evidence_items table (batch limit 100) ---
  const { data: oldItems, error: itemErr } = await supabase
    .from('evidence_items')
    .select('id, incident_id, tenant_id, storage_path, file_name, created_at')
    .lt('created_at', retentionCutoff)
    .is('deleted_at', null)
    .limit(100);

  if (itemErr) {
    console.error('[evidence_purge] evidence_items query error:', itemErr);
  }

  for (const item of oldItems || []) {
    // Check litigation hold
    const { data: incident } = await supabase
      .from('incidents')
      .select('litigation_hold')
      .eq('id', item.incident_id)
      .single();

    if (incident?.litigation_hold) {
      skippedLitigation++;
      continue;
    }

    // Delete physical file
    if (item.storage_path) {
      const { error: storageErr } = await supabase.storage
        .from('incident-attachments')
        .remove([item.storage_path]);
      if (storageErr) {
        console.warn(`[evidence_purge] Storage delete failed for ${item.storage_path}:`, storageErr);
      }
    }

    // Hard delete
    await supabase.from('evidence_items').delete().eq('id', item.id);

    // Audit log
    await supabase.from('incident_audit_logs').insert({
      incident_id: item.incident_id,
      tenant_id: item.tenant_id,
      action: 'evidence_purged_retention',
      details: {
        evidence_id: item.id,
        file_name: item.file_name,
        reason: '7yr_retention_expired',
        original_created_at: item.created_at,
      },
    });

    totalPurged++;
  }

  const hasMoreEvidence = (oldEvidence?.length || 0) >= 100;
  const hasMoreItems = (oldItems?.length || 0) >= 100;
  const hasMore = hasMoreEvidence || hasMoreItems;

  console.log(`[evidence_purge] Purged: ${totalPurged}, Skipped (litigation): ${skippedLitigation}, has_more: ${hasMore}`);

  return new Response(
    JSON.stringify({
      job: 'evidence_purge',
      purged: totalPurged,
      skipped_litigation: skippedLitigation,
      has_more: hasMore,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Extract storage path from a full URL or relative path
 */
function extractStoragePath(fileUrl: string): string | null {
  if (!fileUrl) return null;
  // If it's a full URL, extract the path after the bucket name
  const match = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/incident-attachments\/(.+)/);
  if (match) return match[1];
  // If it's already a relative path, return as-is
  if (!fileUrl.startsWith('http')) return fileUrl;
  return null;
}
