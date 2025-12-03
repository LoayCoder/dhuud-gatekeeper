import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Send security alert email when backup code is used
async function sendBackupCodeUsedEmail(email: string, userName: string | null) {
  const displayName = userName || 'User';
  const timestamp = new Date().toLocaleString('en-US', { 
    dateStyle: 'full', 
    timeStyle: 'short' 
  });
  
  try {
    await resend.emails.send({
      from: "DHUUD Security <onboarding@resend.dev>",
      to: [email],
      subject: "Security Alert: Backup Code Used",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626; margin-bottom: 20px;">Security Alert</h1>
          <p>Hello ${displayName},</p>
          <p>A backup code was used to sign in to your DHUUD account on <strong>${timestamp}</strong>.</p>
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;"><strong>Was this you?</strong></p>
            <p style="margin: 10px 0 0 0; color: #92400e;">If you used this backup code, no action is needed. However, we recommend generating new backup codes if you're running low.</p>
          </div>
          <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;"><strong>Wasn't you?</strong></p>
            <p style="margin: 10px 0 0 0; color: #991b1b;">If you did not use this backup code, your account may be compromised. Please change your password immediately and contact support.</p>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This is an automated security notification from DHUUD Platform.</p>
        </div>
      `,
    });
    console.log(`Backup code used notification sent to ${email}`);
  } catch (error) {
    console.error('Failed to send backup code notification email:', error);
    // Don't throw - email failure shouldn't block login
  }
}

// Simple hash function for backup codes (SHA-256)
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate random backup codes
function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const array = new Uint8Array(4);
    crypto.getRandomValues(array);
    const code = Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    codes.push(code);
  }
  return codes;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get auth header to verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user client to get user info
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, code } = await req.json();
    console.log(`MFA backup codes action: ${action} for user: ${user.id}`);

    if (action === 'generate') {
      // Generate new backup codes
      const plainCodes = generateBackupCodes(8);
      const codeHashes = await Promise.all(plainCodes.map(c => hashCode(c)));
      
      // Store hashed codes in database
      const { error: dbError } = await supabaseAdmin.rpc('generate_mfa_backup_codes', {
        p_user_id: user.id,
        p_code_hashes: codeHashes
      });

      if (dbError) {
        console.error('Database error:', dbError);
        return new Response(
          JSON.stringify({ error: 'Failed to store backup codes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Generated ${plainCodes.length} backup codes for user ${user.id}`);
      
      // Return plain codes (only shown once)
      return new Response(
        JSON.stringify({ codes: plainCodes }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'Code is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Hash the provided code and verify
      const codeHash = await hashCode(code.toUpperCase().replace(/\s/g, ''));
      
      const { data: isValid, error: verifyError } = await supabaseAdmin.rpc('verify_mfa_backup_code', {
        p_user_id: user.id,
        p_code_hash: codeHash
      });

      if (verifyError) {
        console.error('Verify error:', verifyError);
        return new Response(
          JSON.stringify({ error: 'Verification failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Backup code verification for user ${user.id}: ${isValid ? 'success' : 'failed'}`);

      // Send email notification if backup code was successfully used
      if (isValid && user.email) {
        // Get user's full name from profile
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        await sendBackupCodeUsedEmail(user.email, profile?.full_name || null);
      }

      return new Response(
        JSON.stringify({ valid: isValid }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      // Get count of remaining unused codes
      const { data: codes, error: statusError } = await supabaseAdmin
        .from('mfa_backup_codes')
        .select('id, used_at')
        .eq('user_id', user.id);

      if (statusError) {
        console.error('Status error:', statusError);
        return new Response(
          JSON.stringify({ error: 'Failed to get status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const total = codes?.length || 0;
      const remaining = codes?.filter(c => !c.used_at).length || 0;

      return new Response(
        JSON.stringify({ total, remaining, hasBackupCodes: total > 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
