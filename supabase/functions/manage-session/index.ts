import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPrelight } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SessionRequest {
  action: 'register' | 'validate' | 'invalidate' | 'heartbeat';
  sessionToken?: string;
  deviceInfo?: Record<string, unknown>;
  userAgent?: string;
}

interface GeoIPResponse {
  country?: string;
  countryCode?: string;
  city?: string;
  ip?: string;
}

// Get IP geolocation using free ip-api.com service
async function getIPGeolocation(ip: string): Promise<GeoIPResponse> {
  try {
    // Skip geolocation for private/local IPs
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.') || 
        ip === '127.0.0.1' || ip === 'localhost' || ip === '::1') {
      console.log('Skipping geolocation for private IP:', ip);
      return { ip, country: 'Local', countryCode: 'LOCAL' };
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        country: data.country,
        countryCode: data.countryCode,
        city: data.city,
        ip
      };
    }
    console.warn('IP geolocation failed for', ip, ':', data);
    return { ip };
  } catch (error) {
    console.error('IP geolocation error:', error);
    return { ip };
  }
}

// Generate unique session token
function generateSessionToken(): string {
  // Generate a random session token with timestamp for uniqueness
  const randomPart = crypto.getRandomValues(new Uint8Array(24));
  const base64 = btoa(String.fromCharCode(...randomPart))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `sess_${Date.now()}_${base64}`;
}

// Get client IP from request
function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         req.headers.get('cf-connecting-ip') ||
         'unknown';
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  
  // Handle CORS preflight
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client with their token
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user - don't pass token as parameter, it's already in the header
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      const errorMessage = authError?.message || 'No user found';
      console.error('Auth verification failed:', errorMessage);
      
      // Return specific error for session_not_found so client can handle it
      const isSessionExpired = errorMessage.includes('session_not_found') || 
                               errorMessage.includes('Session from session_id') ||
                               errorMessage.includes('missing sub claim');
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: isSessionExpired ? 'auth_session_expired' : 'Invalid token',
          code: isSessionExpired ? 'AUTH_SESSION_EXPIRED' : 'INVALID_TOKEN'
        }),
        { status: 401, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    }

    const body: SessionRequest = await req.json();
    const { action, sessionToken, deviceInfo, userAgent } = body;

    const clientIP = getClientIP(req);
    const geoData = await getIPGeolocation(clientIP);

    console.log(`Session action: ${action} for user ${user.id} from IP ${clientIP} (${geoData.countryCode || 'unknown'})`);

    // Get user's profile for tenant_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { status: 400, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant security settings
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('max_concurrent_sessions, enforce_ip_country_check, session_timeout_minutes')
      .eq('id', profile.tenant_id)
      .single();

    const maxSessions = tenant?.max_concurrent_sessions || 1;
    const enforceIPCheck = tenant?.enforce_ip_country_check ?? true;
    const sessionTimeoutMinutes = tenant?.session_timeout_minutes || 15;

    switch (action) {
      case 'register': {
        const newSessionToken = generateSessionToken();
        
        // Check current active sessions
        const { data: activeSessions } = await supabaseAdmin
          .from('user_sessions')
          .select('id, session_token')
          .eq('user_id', user.id)
          .eq('is_active', true);

        const activeCount = activeSessions?.length || 0;

        // If at or over limit, invalidate oldest sessions
        if (activeCount >= maxSessions) {
          const sessionsToInvalidate = activeCount - maxSessions + 1;
          console.log(`User has ${activeCount} active sessions, invalidating ${sessionsToInvalidate} oldest`);
          
          // Invalidate all other sessions (for single session policy)
          const { error: invalidateError } = await supabaseAdmin
            .from('user_sessions')
            .update({
              is_active: false,
              invalidated_at: new Date().toISOString(),
              invalidation_reason: 'new_login_session_limit'
            })
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (invalidateError) {
            console.error('Failed to invalidate sessions:', invalidateError);
          }

          // Log security event
          await supabaseAdmin
            .from('security_audit_logs')
            .insert({
              tenant_id: profile.tenant_id,
              actor_id: user.id,
              action: 'sessions_invalidated_on_login',
              table_name: 'user_sessions',
              new_value: { 
                invalidated_count: activeCount,
                reason: 'new_login_session_limit',
                new_session: newSessionToken
              }
            });
        }

        // Calculate expiry
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + sessionTimeoutMinutes);

        // Create new session
        const { error: insertError } = await supabaseAdmin
          .from('user_sessions')
          .insert({
            user_id: user.id,
            tenant_id: profile.tenant_id,
            session_token: newSessionToken,
            device_info: deviceInfo || {},
            ip_address: clientIP,
            ip_country: geoData.countryCode || geoData.country,
            ip_city: geoData.city,
            user_agent: userAgent || req.headers.get('user-agent'),
            expires_at: expiresAt.toISOString(),
            is_active: true
          });

        if (insertError) {
          console.error('Failed to create session:', insertError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to create session' }),
            { status: 500, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Session registered: ${newSessionToken} for user ${user.id}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            sessionToken: newSessionToken,
            expiresAt: expiresAt.toISOString(),
            invalidatedSessions: activeCount >= maxSessions ? activeCount : 0
          }),
          { status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
        );
      }

      case 'validate': {
        if (!sessionToken) {
          return new Response(
            JSON.stringify({ success: false, error: 'Session token required' }),
            { status: 400, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
          );
        }

        // Get session
        const { data: session } = await supabaseAdmin
          .from('user_sessions')
          .select('*')
          .eq('session_token', sessionToken)
          .eq('is_active', true)
          .single();

        if (!session) {
          return new Response(
            JSON.stringify({ valid: false, reason: 'session_not_found' }),
            { status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
          );
        }

        // Check expiry
        if (session.expires_at && new Date(session.expires_at) < new Date()) {
          await supabaseAdmin
            .from('user_sessions')
            .update({ is_active: false, invalidated_at: new Date().toISOString(), invalidation_reason: 'expired' })
            .eq('id', session.id);

          return new Response(
            JSON.stringify({ valid: false, reason: 'session_expired' }),
            { status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
          );
        }

        // Check IP country change
        if (enforceIPCheck && session.ip_country && geoData.countryCode && 
            session.ip_country !== geoData.countryCode && 
            session.ip_country !== 'LOCAL' && geoData.countryCode !== 'LOCAL') {
          
          await supabaseAdmin
            .from('user_sessions')
            .update({ 
              is_active: false, 
              invalidated_at: new Date().toISOString(), 
              invalidation_reason: 'ip_country_changed' 
            })
            .eq('id', session.id);

          // Log security event
          await supabaseAdmin
            .from('security_audit_logs')
            .insert({
              tenant_id: session.tenant_id,
              actor_id: session.user_id,
              action: 'session_invalidated_ip_country_change',
              table_name: 'user_sessions',
              old_value: { ip_country: session.ip_country, ip_address: session.ip_address },
              new_value: { ip_country: geoData.countryCode, ip_address: clientIP }
            });

          console.log(`Session invalidated due to country change: ${session.ip_country} -> ${geoData.countryCode}`);

          return new Response(
            JSON.stringify({ 
              valid: false, 
              reason: 'ip_country_changed',
              originalCountry: session.ip_country,
              currentCountry: geoData.countryCode
            }),
            { status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
          );
        }

        // Update last activity
        await supabaseAdmin
          .from('user_sessions')
          .update({ 
            last_activity_at: new Date().toISOString(),
            ip_address: clientIP,
            ip_country: geoData.countryCode || session.ip_country
          })
          .eq('id', session.id);

        return new Response(
          JSON.stringify({ valid: true, sessionId: session.id }),
          { status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
        );
      }

      case 'invalidate': {
        if (!sessionToken) {
          return new Response(
            JSON.stringify({ success: false, error: 'Session token required' }),
            { status: 400, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin
          .from('user_sessions')
          .update({
            is_active: false,
            invalidated_at: new Date().toISOString(),
            invalidation_reason: 'user_logout'
          })
          .eq('session_token', sessionToken)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Failed to invalidate session:', updateError);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
        );
      }

      case 'heartbeat': {
        if (!sessionToken) {
          return new Response(
            JSON.stringify({ success: false, error: 'Session token required' }),
            { status: 400, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
          );
        }

        // Update last activity and extend expiry
        const newExpiry = new Date();
        newExpiry.setMinutes(newExpiry.getMinutes() + sessionTimeoutMinutes);

        const { error: updateError, data: updatedSession } = await supabaseAdmin
          .from('user_sessions')
          .update({ 
            last_activity_at: new Date().toISOString(),
            expires_at: newExpiry.toISOString()
          })
          .eq('session_token', sessionToken)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .select()
          .single();

        if (updateError || !updatedSession) {
          return new Response(
            JSON.stringify({ success: false, valid: false, reason: 'session_not_found' }),
            { status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, expiresAt: newExpiry.toISOString() }),
          { status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { status: 400, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Session management error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' } }
    );
  }
});
