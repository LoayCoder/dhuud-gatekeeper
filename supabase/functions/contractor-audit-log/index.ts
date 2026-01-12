import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// P0.4: Secure CORS - Only allow requests from known origins
const getAllowedOrigins = (): string[] => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  // Extract project ref from URL for lovable.app domain
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || '';
  
  return [
    // Production app URLs
    `https://${projectRef}.lovable.app`,
    `https://lovable.dev/projects/${projectRef}`,
    // Local development
    'http://localhost:5173',
    'http://localhost:3000',
    // Preview URLs (Lovable generates preview URLs with id prefix)
    'https://preview--*.lovable.app',
  ].filter(Boolean);
};

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigins = getAllowedOrigins();
  
  // Check if the origin matches any allowed origin (including wildcards)
  const isAllowed = origin && allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const regex = new RegExp('^' + allowed.replace('*', '.*') + '$');
      return regex.test(origin);
    }
    return allowed === origin;
  });
  
  return {
    'Access-Control-Allow-Origin': isAllowed && origin ? origin : allowedOrigins[0] || '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
};

interface AuditLogRequest {
  entity_type: 'contractor_company' | 'contractor_representative' | 'contractor_project' | 'contractor_worker' | 'worker_qr_code' | 'worker_induction' | 'material_gate_pass';
  entity_id: string;
  action: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  tenant_id: string;
  ip_address?: string;
  user_agent?: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT (optional for system actions)
    let actorId: string | null = null;
    let actorType = 'system';
    
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        actorId = user.id;
        actorType = 'user';
      }
    }

    const requestData: AuditLogRequest = await req.json();

    if (!requestData.entity_type || !requestData.entity_id || !requestData.action || !requestData.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP from headers
    const ipAddress = requestData.ip_address || 
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
      req.headers.get('x-real-ip') || 
      'unknown';

    const userAgent = requestData.user_agent || req.headers.get('user-agent') || 'unknown';

    // Insert audit log
    const { data: auditLog, error: insertError } = await supabase
      .from('contractor_module_audit_logs')
      .insert({
        tenant_id: requestData.tenant_id,
        entity_type: requestData.entity_type,
        entity_id: requestData.entity_id,
        action: requestData.action,
        actor_id: actorId,
        actor_type: actorType,
        old_value: requestData.old_value || null,
        new_value: requestData.new_value || null,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting audit log:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create audit log' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.info(`Audit log created: ${requestData.action} on ${requestData.entity_type}:${requestData.entity_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        audit_log_id: auditLog.id,
        entity_type: requestData.entity_type,
        entity_id: requestData.entity_id,
        action: requestData.action,
        timestamp: auditLog.created_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating contractor audit log:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
