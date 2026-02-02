import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWaSenderTextMessage } from "../_shared/wasender-whatsapp.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  user_id: string;
}

/**
 * Generate a cryptographically secure temporary password
 * Avoids ambiguous characters (0/O, 1/l/I)
 */
function generateSecurePassword(length = 12): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%';
  
  const allChars = uppercase + lowercase + digits + special;
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  
  // Ensure at least one of each type
  let password = '';
  password += uppercase[array[0] % uppercase.length];
  password += lowercase[array[1] % lowercase.length];
  password += digits[array[2] % digits.length];
  password += special[array[3] % special.length];
  
  // Fill remaining with random from all sets
  for (let i = 4; i < length; i++) {
    password += allChars[array[i] % allChars.length];
  }
  
  // Shuffle the password
  const passwordArray = password.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }
  
  return passwordArray.join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the caller's user info
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is admin
    const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: caller.id });
    if (!isAdmin) {
      console.log(`[admin-reset-password] Non-admin user ${caller.id} attempted password reset`);
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get caller's tenant_id
    const { data: callerProfile, error: callerProfileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', caller.id)
      .single();

    if (callerProfileError || !callerProfile?.tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not determine caller tenant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing user_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[admin-reset-password] Admin ${caller.id} attempting to reset password for user ${user_id}`);

    // Get target user profile
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, email, has_login, tenant_id')
      .eq('id', user_id)
      .single();

    if (userError || !targetUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify same tenant (tenant isolation)
    if (targetUser.tenant_id !== callerProfile.tenant_id) {
      console.log(`[admin-reset-password] Cross-tenant attempt: admin ${caller.id} (tenant ${callerProfile.tenant_id}) tried to reset password for user ${user_id} (tenant ${targetUser.tenant_id})`);
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot reset password for users in other tenants' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has login access
    if (!targetUser.has_login) {
      return new Response(
        JSON.stringify({ success: false, error: 'User does not have login access' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has phone number
    if (!targetUser.phone_number) {
      return new Response(
        JSON.stringify({ success: false, error: 'User has no phone number configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure temporary password
    const tempPassword = generateSecurePassword(12);

    // Update auth user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, {
      password: tempPassword,
    });

    if (updateError) {
      console.error(`[admin-reset-password] Failed to update password:`, updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[admin-reset-password] Password updated successfully for user ${user_id}`);

    // Build bilingual WhatsApp message
    const userName = targetUser.full_name || '';
    const message = `🔐 تم إعادة تعيين كلمة المرور

مرحباً${userName ? ` ${userName}` : ''}،

تم إعادة تعيين كلمة المرور الخاصة بحسابك على منصة ضود.

كلمة المرور المؤقتة: *${tempPassword}*

⚠️ يرجى تسجيل الدخول وتغيير كلمة المرور فوراً.

---

🔐 Password Reset

Hello${userName ? ` ${userName}` : ''},

Your password for Dhuud HSSE Platform has been reset.

Temporary Password: *${tempPassword}*

⚠️ Please login and change your password immediately.`;

    // Send WhatsApp message
    console.log(`[admin-reset-password] Sending WhatsApp to ${targetUser.phone_number}`);
    const waResult = await sendWaSenderTextMessage(targetUser.phone_number, message);

    // Log the action to audit trail
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    await supabase.from('user_activity_logs').insert({
      user_id: caller.id,
      event_type: 'password_reset_by_admin',
      metadata: {
        target_user_id: user_id,
        target_user_name: targetUser.full_name,
        whatsapp_sent: waResult.success,
        phone_number_last4: targetUser.phone_number?.slice(-4),
        ip_address: clientIp,
      },
    });

    if (!waResult.success) {
      console.error(`[admin-reset-password] WhatsApp send failed:`, waResult.error);
      // Password was reset but WhatsApp failed - return partial success
      return new Response(
        JSON.stringify({ 
          success: true, 
          whatsapp_sent: false,
          warning: 'Password reset but WhatsApp notification failed',
          error: waResult.error,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[admin-reset-password] Password reset complete for user ${user_id}, WhatsApp sent successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        whatsapp_sent: true,
        message: 'Password reset and WhatsApp notification sent',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[admin-reset-password] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
