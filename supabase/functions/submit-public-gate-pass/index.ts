import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { wildcardCorsHeaders, sanitizeInput, getClientIP } from '../_shared/cors.ts';
import { sendWhatsAppText } from '../_shared/whatsapp-provider.ts';
import { logNotificationSent } from '../_shared/notification-logger.ts';

interface PublicGatePassRequest {
  tenant_slug: string;
  branch_id: string;
  material_description: string;
  quantity?: string;
  pass_date: string;
  time_window_start?: string;
  time_window_end?: string;
  pass_type: 'in' | 'out' | 'in_out';
  vehicle_plate?: string;
  driver_name?: string;
  driver_id?: string;
  // Public requester info
  public_requester_name: string;
  public_requester_phone: string;
  public_requester_email?: string;
  public_requester_company?: string;
  // Attachments
  attachment_urls?: string[];
  // Optional CAPTCHA token for spam prevention
  captcha_token?: string;
}

interface PublicGatePassResponse {
  success: boolean;
  reference_number?: string;
  public_access_token?: string;
  tracking_url?: string;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: wildcardCorsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: PublicGatePassRequest = await req.json();

    // Validate required fields
    if (!requestData.tenant_slug) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tenant slug is required' }),
        { status: 400, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!requestData.branch_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Branch selection is required' }),
        { status: 400, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!requestData.public_requester_name || !requestData.public_requester_phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Requester name and phone are required' }),
        { status: 400, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!requestData.material_description || !requestData.pass_date) {
      return new Response(
        JSON.stringify({ success: false, error: 'Material description and date are required' }),
        { status: 400, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize input
    const sanitizedData = {
      ...requestData,
      public_requester_name: sanitizeInput(requestData.public_requester_name),
      public_requester_company: requestData.public_requester_company ? sanitizeInput(requestData.public_requester_company) : null,
      material_description: sanitizeInput(requestData.material_description),
      driver_name: requestData.driver_name ? sanitizeInput(requestData.driver_name) : null,
      vehicle_plate: requestData.vehicle_plate ? sanitizeInput(requestData.vehicle_plate) : null,
    };

    // Get tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug, allow_public_gate_pass_requests')
      .eq('slug', requestData.tenant_slug)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant not found:', tenantError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid tenant' }),
        { status: 404, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if public gate pass is enabled for this tenant
    if (!tenant.allow_public_gate_pass_requests) {
      return new Response(
        JSON.stringify({ success: false, error: 'Public gate pass requests are not enabled for this organization' }),
        { status: 403, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    const clientIP = getClientIP(req);
    const { data: canSubmit } = await supabase.rpc('check_public_gate_pass_rate_limit', {
      p_tenant_id: tenant.id,
      p_ip_address: clientIP,
      p_phone_number: requestData.public_requester_phone,
      p_max_requests: 5,
      p_window_minutes: 60,
    });

    if (canSubmit === false) {
      console.warn(`Rate limit exceeded for IP ${clientIP}, phone ${requestData.public_requester_phone}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate branch exists and belongs to tenant
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('id', requestData.branch_id)
      .eq('tenant_id', tenant.id)
      .single();

    if (branchError || !branch) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid branch selection' }),
        { status: 400, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate public access token
    const publicAccessToken = crypto.randomUUID();

    // Insert the gate pass (use service role to bypass RLS)
    const { data: gatePass, error: insertError } = await supabase
      .from('material_gate_passes')
      .insert({
        tenant_id: tenant.id,
        branch_id: requestData.branch_id,
        // For public requests, we don't have company/project - use null
        company_id: null,
        project_id: null,
        requested_by: null,
        // Pass details
        pass_date: requestData.pass_date,
        time_window_start: requestData.time_window_start || null,
        time_window_end: requestData.time_window_end || null,
        material_description: sanitizedData.material_description,
        quantity: requestData.quantity || null,
        pass_type: requestData.pass_type || 'in',
        vehicle_plate: sanitizedData.vehicle_plate,
        driver_name: sanitizedData.driver_name,
        driver_id: requestData.driver_id || null,
        driver_mobile: requestData.public_requester_phone,
        // Public request specific fields
        is_public_request: true,
        public_access_token: publicAccessToken,
        public_requester_name: sanitizedData.public_requester_name,
        public_requester_phone: requestData.public_requester_phone,
        public_requester_email: requestData.public_requester_email || null,
        public_requester_company: sanitizedData.public_requester_company,
        public_attachment_urls: requestData.attachment_urls || null,
        // Status for public flow
        status: 'pending_management',
      })
      .select('id, reference_number, public_access_token')
      .single();

    if (insertError) {
      console.error('Error creating gate pass:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create gate pass request' }),
        { status: 500, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate tracking URL
    const appUrl = Deno.env.get('APP_URL') || 'https://www.dhuud.com';
    const trackingUrl = `${appUrl}/p/${tenant.slug}/gate-pass/status/${publicAccessToken}`;

    // Send confirmation to the requester via WhatsApp
    const confirmationMessage = `Hello ${sanitizedData.public_requester_name}, your gate pass request for ${branch.name} (${tenant.name}) has been received.

Reference: ${gatePass.reference_number}
Date: ${requestData.pass_date}
Material: ${sanitizedData.material_description}

Track your request status here:
${trackingUrl}

You will receive a notification when your request is approved.`;

    try {
      const whatsappResult = await sendWhatsAppText(
        requestData.public_requester_phone,
        confirmationMessage
      );

      if (whatsappResult.success) {
        console.log(`[Public Gate Pass] WhatsApp confirmation sent to ${requestData.public_requester_phone}`);

        // Log notification
        await logNotificationSent({
          tenant_id: tenant.id,
          channel: 'whatsapp',
          provider: whatsappResult.provider,
          provider_message_id: whatsappResult.messageId || '',
          to_address: requestData.public_requester_phone,
          template_name: 'public_gate_pass_confirmation',
          status: 'pending',
          related_entity_type: 'material_gate_pass',
          related_entity_id: gatePass.id,
          metadata: {
            reference_number: gatePass.reference_number,
            tracking_url: trackingUrl,
          }
        });
      } else {
        console.warn(`[Public Gate Pass] Failed to send WhatsApp confirmation: ${whatsappResult.error}`);
      }
    } catch (notifError) {
      console.error('[Public Gate Pass] Notification error:', notifError);
      // Don't fail the request if notification fails
    }

    // Notify branch approvers
    try {
      const { data: approvers } = await supabase.rpc('get_branch_gate_pass_approvers', {
        p_tenant_id: tenant.id,
        p_branch_id: requestData.branch_id,
      });

      if (approvers && approvers.length > 0) {
        const approverMessage = `New public gate pass request received:

Reference: ${gatePass.reference_number}
Branch: ${branch.name}
Requester: ${sanitizedData.public_requester_name}
Company: ${sanitizedData.public_requester_company || 'Not specified'}
Phone: ${requestData.public_requester_phone}
Date: ${requestData.pass_date}
Material: ${sanitizedData.material_description}

Please review and approve in the system.`;

        // Send to first 3 approvers to avoid spam
        for (const approver of approvers.slice(0, 3)) {
          if (approver.phone) {
            try {
              await sendWhatsAppText(approver.phone, approverMessage);
              console.log(`[Public Gate Pass] Notified approver ${approver.full_name}`);
            } catch (err) {
              console.error(`[Public Gate Pass] Failed to notify approver ${approver.full_name}:`, err);
            }
          }
        }
      }
    } catch (approverError) {
      console.error('[Public Gate Pass] Approver notification error:', approverError);
    }

    // Log audit trail
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id: tenant.id,
      entity_type: 'gate_pass',
      entity_id: gatePass.id,
      action: 'created',
      actor_id: null, // Public submission, no authenticated user
      actor_type: 'system',
      new_value: {
        is_public_request: true,
        public_requester_name: sanitizedData.public_requester_name,
        public_requester_phone: requestData.public_requester_phone,
        branch_id: requestData.branch_id,
        ip_address: clientIP,
      },
    });

    const response: PublicGatePassResponse = {
      success: true,
      reference_number: gatePass.reference_number,
      public_access_token: publicAccessToken,
      tracking_url: trackingUrl,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error submitting public gate pass:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
