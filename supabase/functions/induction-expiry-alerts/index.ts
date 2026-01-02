import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppText, isProviderConfigured } from '../_shared/whatsapp-provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpiringInduction {
  id: string;
  tenant_id: string;
  expires_at: string;
  expiry_warning_sent_at: string | null;
  status: string;
  worker: {
    id: string;
    full_name: string;
    id_number: string;
    phone: string | null;
    contractor_id: string;
  } | null;
  project: {
    id: string;
    name: string;
  } | null;
}

async function sendWhatsAppNotification(phone: string, message: string): Promise<void> {
  const providerStatus = isProviderConfigured();
  if (!providerStatus.configured) {
    console.log(`[WhatsApp] Provider not configured, missing: ${providerStatus.missing.join(', ')}`);
    return;
  }
  if (!phone) return;

  try {
    const result = await sendWhatsAppText(phone, message);
    if (result.success) {
      console.log(`[WhatsApp] Message sent successfully via ${result.provider} to ${phone}`);
    } else {
      console.error(`[WhatsApp] Failed to send to ${phone}: ${result.error}`);
    }
  } catch (error) {
    console.error('[WhatsApp] Error sending message:', error);
  }
}

async function sendEmailNotification(
  supabaseUrl: string,
  supabaseKey: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email-template`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px;">${body.replace(/\n/g, '<br>')}</div>`,
      }),
    });
    console.log(`Email sent to ${to}:`, await response.text());
  } catch (error) {
    console.error('Email error:', error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Starting induction expiry alerts check...');

  try {
    const now = new Date();
    const warningThresholdDays = 7; // Warn 7 days before expiry
    const warningDate = new Date(now);
    warningDate.setDate(warningDate.getDate() + warningThresholdDays);

    let expiredUpdated = 0;
    let warningsSet = 0;

    // =====================
    // Step 1: Mark expired inductions
    // =====================
    const { data: expiredInductions, error: expiredError } = await supabase
      .from('worker_inductions')
      .select('id, tenant_id, status')
      .is('deleted_at', null)
      .lt('expires_at', now.toISOString())
      .neq('status', 'expired');

    if (expiredError) {
      console.error('Error fetching expired inductions:', expiredError);
    } else {
      console.log(`Found ${expiredInductions?.length || 0} expired inductions to update`);

      for (const induction of expiredInductions || []) {
        const { error: updateError } = await supabase
          .from('worker_inductions')
          .update({ status: 'expired' })
          .eq('id', induction.id);

        if (updateError) {
          console.error(`Error updating induction ${induction.id}:`, updateError);
        } else {
          expiredUpdated++;
        }
      }
    }

    // =====================
    // Step 2: Check expiring soon (within 14 days) and send warnings
    // =====================
    const { data: expiringInductions, error: expiringError } = await supabase
      .from('worker_inductions')
      .select(`
        id,
        tenant_id,
        expires_at,
        expiry_warning_sent_at,
        status,
        worker:contractor_workers(
          id,
          full_name,
          id_number,
          phone,
          contractor_id
        ),
        project:ptw_projects(
          id,
          name
        )
      `)
      .is('deleted_at', null)
      .not('expires_at', 'is', null)
      .lte('expires_at', warningDate.toISOString())
      .gt('expires_at', now.toISOString())
      .is('expiry_warning_sent_at', null)
      .in('status', ['completed', 'active']);

    if (expiringError) {
      console.error('Error fetching expiring inductions:', expiringError);
    } else {
      console.log(`Found ${expiringInductions?.length || 0} expiring inductions to warn`);

      for (const induction of (expiringInductions || []) as unknown as ExpiringInduction[]) {
        const worker = induction.worker;
        const project = induction.project;
        
        if (!worker) {
          console.warn(`No worker found for induction ${induction.id}`);
          continue;
        }

        const expiryDate = new Date(induction.expires_at).toLocaleDateString();
        const daysUntilExpiry = Math.ceil(
          (new Date(induction.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Get HSSE managers for this tenant
        const { data: managers } = await supabase
          .from('profiles')
          .select('id, email, phone_number, full_name')
          .eq('tenant_id', induction.tenant_id)
          .eq('is_active', true)
          .or('user_type.eq.hsse_manager,user_type.eq.hsse_officer');

        const message = `⚠️ Induction Expiry Warning\n\nWorker: ${worker.full_name}\nID: ${worker.id_number}\nProject: ${project?.name || 'N/A'}\nExpires: ${expiryDate} (${daysUntilExpiry} days)\n\nPlease arrange for re-induction before the expiry date.`;

        const subject = `Induction Expiring: ${worker.full_name} - ${daysUntilExpiry} days remaining`;

        console.log(`Sending expiry warning for induction ${induction.id} (worker: ${worker.full_name})`);

        // Notify HSSE managers
        for (const manager of managers || []) {
          if (manager.email) {
            await sendEmailNotification(supabaseUrl, supabaseKey, manager.email, subject, message);
          }
          if (manager.phone_number) {
            await sendWhatsAppNotification(manager.phone_number, message);
          }
        }

        // Also notify the worker if they have a phone
        if (worker.phone) {
          const workerMessage = `⚠️ Your safety induction for project "${project?.name || 'N/A'}" expires on ${expiryDate}. Please contact your supervisor to schedule re-induction.`;
          await sendWhatsAppNotification(worker.phone, workerMessage);
        }

        // Mark warning as sent
        const { error: markError } = await supabase
          .from('worker_inductions')
          .update({ expiry_warning_sent_at: new Date().toISOString() })
          .eq('id', induction.id);

        if (markError) {
          console.error(`Error marking warning sent for ${induction.id}:`, markError);
        } else {
          warningsSet++;
        }
      }
    }

    // =====================
    // Step 3: Log cross-module activity
    // =====================
    if (expiredUpdated > 0 || warningsSet > 0) {
      await supabase.from('user_activity_logs').insert({
        event_type: 'induction_expiry_check',
        metadata: {
          expired_updated: expiredUpdated,
          warnings_sent: warningsSet,
          run_at: now.toISOString(),
          source: 'scheduled_function',
        },
      });
    }

    console.log(`Completed: ${expiredUpdated} expired, ${warningsSet} warnings sent`);

    return new Response(
      JSON.stringify({
        success: true,
        expired_updated: expiredUpdated,
        warnings_sent: warningsSet,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in induction-expiry-alerts:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
