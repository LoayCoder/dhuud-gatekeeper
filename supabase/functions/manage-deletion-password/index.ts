import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPrelight, getClientIP } from '../_shared/cors.ts';

// In-memory rate limiting (per-function instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `deletion_pwd_${userId}`;
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

// Timing-safe string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to maintain constant time
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

interface RequestBody {
  action: 'set' | 'verify' | 'status';
  password_hash?: string;
}

// Validate request body
function validateRequestBody(body: unknown): { valid: boolean; data?: RequestBody; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { action, password_hash } = body as Record<string, unknown>;

  if (!action || !['set', 'verify', 'status'].includes(action as string)) {
    return { valid: false, error: 'Invalid or missing action' };
  }

  if ((action === 'set' || action === 'verify') && password_hash !== undefined) {
    if (typeof password_hash !== 'string') {
      return { valid: false, error: 'password_hash must be a string' };
    }
    // SHA-256 hash should be 64 hex characters
    if (!/^[a-f0-9]{64}$/i.test(password_hash)) {
      return { valid: false, error: 'Invalid password hash format' };
    }
  }

  return { 
    valid: true, 
    data: { 
      action: action as RequestBody['action'], 
      password_hash: password_hash as string | undefined 
    } 
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  
  // Handle CORS preflight with restricted origins
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get JWT from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT for verification
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Rate limiting check
    const rateLimitResult = checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter)
          } 
        }
      );
    }

    // Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation = validateRequestBody(rawBody);
    if (!validation.valid || !validation.data) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, password_hash } = validation.data;

    console.log(`Processing ${action} for user ${userId}`);

    // Check if user has HSSE Manager or Admin role using get_user_roles
    const { data: userRoles, error: rolesError } = await supabaseClient.rpc('get_user_roles', {
      p_user_id: userId
    });

    if (rolesError) {
      console.error('Roles fetch error:', rolesError);
    }

    const hasHSSERole = userRoles?.some((r: { role_code: string }) => r.role_code === 'hsse_manager');
    const isAdmin = userRoles?.some((r: { role_code: string }) => r.role_code === 'admin');

    if (!hasHSSERole && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Access denied: requires HSSE Manager or Admin role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action for audit
    const clientIP = getClientIP(req);

    switch (action) {
      case 'set': {
        if (!password_hash) {
          return new Response(
            JSON.stringify({ error: 'Password hash required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update the deletion password hash
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ deletion_password_hash: password_hash })
          .eq('id', userId);

        if (updateError) {
          console.error('Update error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to set password' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Audit log
        console.log(`Deletion password set for user ${userId} from IP ${clientIP}`);
        
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify': {
        if (!password_hash) {
          return new Response(
            JSON.stringify({ error: 'Password hash required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get stored password hash
        const { data: profile, error: fetchError } = await supabaseClient
          .from('profiles')
          .select('deletion_password_hash')
          .eq('id', userId)
          .single();

        if (fetchError) {
          console.error('Fetch error:', fetchError);
          return new Response(
            JSON.stringify({ error: 'Failed to verify password' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Use timing-safe comparison
        const storedHash = profile?.deletion_password_hash || '';
        const isValid = storedHash.length > 0 && timingSafeEqual(storedHash, password_hash);

        // Log verification attempt
        console.log(`Password verification attempt for user ${userId} from IP ${clientIP}: ${isValid ? 'success' : 'failed'}`);

        return new Response(
          JSON.stringify({ valid: isValid }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'status': {
        // Check if deletion password is configured
        const { data: profile, error: fetchError } = await supabaseClient
          .from('profiles')
          .select('deletion_password_hash')
          .eq('id', userId)
          .single();

        if (fetchError) {
          console.error('Fetch error:', fetchError);
          return new Response(
            JSON.stringify({ error: 'Failed to check status' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const isConfigured = !!profile?.deletion_password_hash;
        return new Response(
          JSON.stringify({ configured: isConfigured }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' } }
    );
  }
});
