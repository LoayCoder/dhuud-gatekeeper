import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppText } from '../_shared/whatsapp-provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  incident_id: string;
  event_type?: string; // 'incident_created', 'incident_critical'
}

interface RecipientInfo {
  user_id: string;
  phone_number: string;
  full_name: string;
  preferred_language: string;
}

interface IncidentData {
  id: string;
  reference_id: string | null;
  title: string;
  description: string | null;
  event_type: string;
  severity: string | null;
  status: string | null;
  location: string | null;
  occurred_at: string | null;
  tenant_id: string;
  branch_id: string | null;
  site_id: string | null;
  reporter_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    const { incident_id, event_type = 'incident_created' } = payload;

    if (!incident_id) {
      console.error('Missing incident_id');
      return new Response(
        JSON.stringify({ error: 'Missing incident_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing notification for incident: ${incident_id}, event_type: ${event_type}`);

    // Fetch incident details
    const { data: incidentData, error: incidentError } = await supabase
      .from('incidents')
      .select(`
        id, reference_id, title, description, event_type, severity, status, 
        location, occurred_at, tenant_id, branch_id, site_id, reporter_id
      `)
      .eq('id', incident_id)
      .single();

    if (incidentError || !incidentData) {
      console.error('Failed to fetch incident:', incidentError);
      return new Response(
        JSON.stringify({ error: 'Incident not found', details: incidentError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const incident = incidentData as IncidentData;
    console.log(`Incident details: ${incident.reference_id} - ${incident.title}`);

    // Get reporter name separately
    let reporterName = '-';
    if (incident.reporter_id) {
      const { data: reporter } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', incident.reporter_id)
        .single();
      if (reporter?.full_name) {
        reporterName = reporter.full_name;
      }
    }

    // Get site name separately
    let siteName = '';
    if (incident.site_id) {
      const { data: site } = await supabase
        .from('sites')
        .select('name')
        .eq('id', incident.site_id)
        .single();
      if (site?.name) {
        siteName = site.name;
      }
    }

    // Find notification recipients for this event type and tenant
    const { data: recipients, error: recipientsError } = await supabase
      .from('notification_recipients')
      .select('*')
      .eq('tenant_id', incident.tenant_id)
      .eq('event_type', event_type)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (recipientsError) {
      console.error('Failed to fetch notification recipients:', recipientsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recipients', details: recipientsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!recipients || recipients.length === 0) {
      console.log('No notification recipients configured for this event type');
      return new Response(
        JSON.stringify({ message: 'No recipients configured', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${recipients.length} notification recipient rules`);

    // Collect all users to notify
    const usersToNotify: RecipientInfo[] = [];

    for (const rule of recipients) {
      // Check branch filter
      if (rule.branch_id && rule.branch_id !== incident.branch_id) {
        console.log(`Skipping rule ${rule.id} - branch mismatch`);
        continue;
      }

      if (rule.user_id) {
        // Specific user
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id, full_name, phone_number, preferred_language')
          .eq('id', rule.user_id)
          .single();

        if (userProfile?.phone_number) {
          usersToNotify.push({
            user_id: userProfile.id,
            phone_number: userProfile.phone_number,
            full_name: userProfile.full_name || 'User',
            preferred_language: userProfile.preferred_language || 'ar',
          });
        }
      } else if (rule.role_code) {
        // Find users with this role - get role ID first
        const { data: role } = await supabase
          .from('roles')
          .select('id')
          .eq('code', rule.role_code)
          .single();

        if (role) {
          const { data: roleAssignments } = await supabase
            .from('user_role_assignments')
            .select('user_id')
            .eq('tenant_id', incident.tenant_id)
            .eq('role_id', role.id)
            .is('deleted_at', null);

          if (roleAssignments) {
            for (const assignment of roleAssignments) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, phone_number, preferred_language, branch_id')
                .eq('id', assignment.user_id)
                .single();

              if (profile?.phone_number) {
                // If rule has branch filter, check user's branch
                if (rule.branch_id && profile.branch_id !== rule.branch_id) {
                  continue;
                }
                
                usersToNotify.push({
                  user_id: profile.id,
                  phone_number: profile.phone_number,
                  full_name: profile.full_name || 'User',
                  preferred_language: profile.preferred_language || 'ar',
                });
              }
            }
          }
        }
      }
    }

    // Remove duplicates
    const uniqueUsers = usersToNotify.filter((user, index, self) =>
      index === self.findIndex(u => u.user_id === user.user_id)
    );

    console.log(`Sending notifications to ${uniqueUsers.length} unique users`);

    // Prepare message content
    const severityEmoji: Record<string, string> = {
      low: '🟢',
      medium: '🟡', 
      high: '🟠',
      critical: '🔴'
    };

    const eventTypeLabel = incident.event_type === 'observation' ? 'ملاحظة' : 'حادثة';
    const eventTypeLabelEn = incident.event_type === 'observation' ? 'Observation' : 'Incident';
    const locationText = incident.location || siteName || '-';
    const severityText = incident.severity ? `${severityEmoji[incident.severity] || ''} ${incident.severity}` : '';

    // Send notifications
    let sentCount = 0;
    let failedCount = 0;

    for (const user of uniqueUsers) {
      try {
        const isArabic = user.preferred_language === 'ar';
        
        const message = isArabic
          ? `📢 ${eventTypeLabel} جديدة: ${incident.title}

🆔 الرقم المرجعي: ${incident.reference_id || '-'}
📍 الموقع: ${locationText}
${incident.severity ? `⚠️ الخطورة: ${severityText}` : ''}
👤 أبلغ عنها: ${reporterName}

${incident.description ? `📝 ${incident.description.substring(0, 200)}${incident.description.length > 200 ? '...' : ''}` : ''}`
          : `📢 New ${eventTypeLabelEn}: ${incident.title}

🆔 Reference: ${incident.reference_id || '-'}
📍 Location: ${locationText}
${incident.severity ? `⚠️ Severity: ${severityText}` : ''}
👤 Reported by: ${reporterName}

${incident.description ? `📝 ${incident.description.substring(0, 200)}${incident.description.length > 200 ? '...' : ''}` : ''}`;

        console.log(`Sending WhatsApp to ${user.full_name} (${user.phone_number})`);
        
        const result = await sendWhatsAppText(user.phone_number, message);

        // Log the notification
        await supabase.from('auto_notification_logs').insert({
          tenant_id: incident.tenant_id,
          event_type,
          event_id: incident_id,
          recipient_id: user.user_id,
          recipient_phone: user.phone_number,
          channel: 'whatsapp',
          message_content: message,
          status: result.success ? 'sent' : 'failed',
          provider_message_id: result.messageId,
          error_message: result.error,
          sent_at: result.success ? new Date().toISOString() : null,
        });

        if (result.success) {
          sentCount++;
          console.log(`Successfully sent to ${user.full_name}`);
        } else {
          failedCount++;
          console.error(`Failed to send to ${user.full_name}: ${result.error}`);
        }
      } catch (error) {
        failedCount++;
        console.error(`Error sending to ${user.full_name}:`, error);

        // Log failure
        await supabase.from('auto_notification_logs').insert({
          tenant_id: incident.tenant_id,
          event_type,
          event_id: incident_id,
          recipient_id: user.user_id,
          recipient_phone: user.phone_number,
          channel: 'whatsapp',
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`Notification complete: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        incident_id,
        reference_id: incident.reference_id,
        sent: sentCount,
        failed: failedCount,
        total_recipients: uniqueUsers.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
