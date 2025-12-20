import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAppUrl, emailButton, sendEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { incident_id } = await req.json();
    
    if (!incident_id) {
      throw new Error('incident_id is required');
    }

    console.log(`[send-investigation-submitted] Processing incident: ${incident_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get incident details
    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .select('id, reference_id, title, tenant_id')
      .eq('id', incident_id)
      .single();

    if (incidentError || !incident) {
      throw new Error(`Incident not found: ${incidentError?.message}`);
    }

    // Get all corrective actions with assignees for this incident
    const { data: actions, error: actionsError } = await supabase
      .from('corrective_actions')
      .select(`
        id,
        title,
        priority,
        due_date,
        assigned_to
      `)
      .eq('incident_id', incident_id)
      .is('deleted_at', null)
      .not('assigned_to', 'is', null);

    if (actionsError) {
      console.error('Error fetching actions:', actionsError);
      throw actionsError;
    }

    if (!actions || actions.length === 0) {
      console.log('No assigned actions found, skipping notifications');
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group actions by assignee
    const actionsByAssignee = new Map<string, typeof actions>();
    for (const action of actions) {
      if (action.assigned_to) {
        const existing = actionsByAssignee.get(action.assigned_to) || [];
        existing.push(action);
        actionsByAssignee.set(action.assigned_to, existing);
      }
    }

    console.log(`Found ${actionsByAssignee.size} unique assignees`);

    // Get assignee details
    const assigneeIds = Array.from(actionsByAssignee.keys());
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', assigneeIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Send email to each assignee
    let sentCount = 0;
    const errors: string[] = [];
    const appUrl = getAppUrl();

    for (const [assigneeId, assigneeActions] of actionsByAssignee) {
      const profile = profileMap.get(assigneeId);
      const email = profile?.email;
      
      if (!email) {
        console.log(`No email for assignee ${assigneeId}, skipping`);
        continue;
      }

      const actionListHtml = assigneeActions.map(a => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${a.title}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            <span style="padding: 2px 8px; border-radius: 4px; background: ${
              a.priority === 'critical' ? '#fee2e2' : 
              a.priority === 'high' ? '#fef3c7' : 
              a.priority === 'medium' ? '#dbeafe' : '#f3f4f6'
            }; color: ${
              a.priority === 'critical' ? '#b91c1c' : 
              a.priority === 'high' ? '#b45309' : 
              a.priority === 'medium' ? '#1d4ed8' : '#374151'
            };">${a.priority || 'medium'}</span>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${a.due_date || 'Not set'}</td>
        </tr>
      `).join('');

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">Investigation Submitted - Actions Assigned to You</h2>
          
          <p>Dear ${profile?.full_name || 'Team Member'},</p>
          
          <p>An investigation has been submitted for review and you have been assigned the following corrective action(s):</p>
          
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Incident Reference:</strong> ${incident.reference_id}</p>
            <p style="margin: 0;"><strong>Incident Title:</strong> ${incident.title}</p>
          </div>
          
          <h3 style="color: #374151; margin-top: 24px;">Your Assigned Actions (${assigneeActions.length})</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px; text-align: start;">Action</th>
                <th style="padding: 10px; text-align: start;">Priority</th>
                <th style="padding: 10px; text-align: start;">Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${actionListHtml}
            </tbody>
          </table>
          
          ${emailButton("View My Actions", `${appUrl}/my-actions`, "#1e40af")}
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            This is an automated message from the DHUUD HSSE Platform.
          </p>
        </div>
      `;

      try {
        const result = await sendEmail({
          to: email,
          subject: `[Action Required] Investigation Submitted - ${incident.reference_id}`,
          html: htmlBody,
          module: 'investigation',
        });

        if (result.success) {
          sentCount++;
          console.log(`Email sent to ${email}`);
        } else {
          throw new Error(result.error || 'Failed to send email');
        }
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
        errors.push(`${email}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
      }
    }

    console.log(`[send-investigation-submitted] Sent ${sentCount} emails`);

    return new Response(JSON.stringify({ 
      success: true, 
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[send-investigation-submitted] Error:', err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
