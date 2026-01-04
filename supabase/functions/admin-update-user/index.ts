import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPrelight, sanitizeInput, getClientIP } from '../_shared/cors.ts';

// Allowlist of fields that can be updated in the profiles table
const ALLOWED_PROFILE_FIELDS = new Set([
  'full_name',
  'full_name_ar',
  'email',
  'phone',
  'job_title',
  'department',
  'department_id',
  'area_id',
  'is_active',
  'avatar_url',
  'emergency_contact_name',
  'emergency_contact_phone',
  'user_type',
  'preferred_language',
  'notification_preferences',
  'work_location',
]);

// Fields that should be sanitized (text fields)
const TEXT_FIELDS = new Set([
  'full_name',
  'full_name_ar',
  'job_title',
  'department',
  'emergency_contact_name',
  'work_location',
]);

interface UpdateUserRequest {
  user_id: string;
  new_email?: string;
  old_email?: string;
  updates?: Record<string, unknown>;
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

// Validate and filter update fields
function validateAndFilterUpdates(
  updates: Record<string, unknown>
): { filtered: Record<string, unknown>; rejected: string[] } {
  const filtered: Record<string, unknown> = {};
  const rejected: string[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (!ALLOWED_PROFILE_FIELDS.has(key)) {
      rejected.push(key);
      continue;
    }

    // Sanitize text fields
    if (TEXT_FIELDS.has(key) && typeof value === 'string') {
      filtered[key] = sanitizeInput(value);
    } else if (key === 'email' && typeof value === 'string') {
      // Validate email format
      if (!isValidEmail(value)) {
        rejected.push(key);
        continue;
      }
      filtered[key] = value.toLowerCase().trim();
    } else if (key === 'phone' && typeof value === 'string') {
      // Basic phone validation - allow digits, spaces, dashes, parentheses, plus
      const cleanPhone = value.replace(/[^\d\s\-\(\)\+]/g, '');
      if (cleanPhone.length > 0 && cleanPhone.length <= 20) {
        filtered[key] = cleanPhone;
      } else {
        rejected.push(key);
      }
    } else if (key === 'is_active' && typeof value === 'boolean') {
      filtered[key] = value;
    } else if ((key === 'department_id' || key === 'area_id') && typeof value === 'string') {
      // UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(value) || value === null) {
        filtered[key] = value;
      } else {
        rejected.push(key);
      }
    } else if (key === 'notification_preferences' && typeof value === 'object') {
      // Only allow known notification preference keys
      filtered[key] = value;
    } else if (key === 'user_type' && typeof value === 'string') {
      // Validate against known user types
      const validUserTypes = ['employee', 'contractor', 'visitor', 'guard', 'admin'];
      if (validUserTypes.includes(value)) {
        filtered[key] = value;
      } else {
        rejected.push(key);
      }
    } else if (key === 'preferred_language' && typeof value === 'string') {
      if (['en', 'ar'].includes(value)) {
        filtered[key] = value;
      } else {
        rejected.push(key);
      }
    } else if (key === 'avatar_url' && typeof value === 'string') {
      // Basic URL validation
      try {
        new URL(value);
        filtered[key] = value;
      } catch {
        rejected.push(key);
      }
    } else {
      // For other allowed fields, pass through if type is acceptable
      if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        filtered[key] = value;
      } else {
        rejected.push(key);
      }
    }
  }

  return { filtered, rejected };
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is authenticated and is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No auth header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is admin using is_admin function
    const { data: isAdminResult, error: adminCheckError } = await supabase
      .rpc('is_admin', { p_user_id: caller.id });
    
    if (adminCheckError || !isAdminResult) {
      console.error('Admin check failed:', adminCheckError);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body with error handling
    let requestData: UpdateUserRequest;
    try {
      requestData = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, new_email, old_email, updates } = requestData;

    // Validate user_id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!user_id || !uuidRegex.test(user_id)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get caller's tenant_id
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', caller.id)
      .single();

    if (!callerProfile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Caller tenant not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify target user belongs to same tenant (tenant isolation)
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('tenant_id, email, full_name')
      .eq('id', user_id)
      .single();

    if (targetError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetUser.tenant_id !== callerProfile.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Cross-tenant operation not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailUpdateResult = null;
    const clientIP = getClientIP(req);

    // Handle email change in auth.users if new_email is provided and different
    if (new_email && old_email && new_email !== old_email) {
      // Validate email format
      if (!isValidEmail(new_email)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Updating auth email for user ${user_id}: ${old_email} -> ${new_email}`);
      
      // Check if new email is already in use
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', new_email.toLowerCase())
        .neq('id', user_id)
        .maybeSingle();

      if (existingUser) {
        return new Response(
          JSON.stringify({ error: 'Email already in use by another user' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update auth.users using admin API
      const { data: authUpdate, error: authUpdateError } = await supabase.auth.admin.updateUserById(
        user_id,
        { email: new_email.toLowerCase(), email_confirm: true }
      );

      if (authUpdateError) {
        console.error('Failed to update auth.users email:', authUpdateError);
        return new Response(
          JSON.stringify({ error: `Failed to update login credentials: ${authUpdateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      emailUpdateResult = { success: true, old_email, new_email: new_email.toLowerCase() };
      console.log(`Auth email updated successfully for user ${user_id}`);

      // Log the email change to audit_logs
      await supabase
        .from('admin_audit_logs')
        .insert({
          admin_id: caller.id,
          tenant_id: callerProfile.tenant_id,
          event_type: 'user_updated',
          target_user_id: user_id,
          metadata: {
            action: 'email_change',
            old_email: old_email,
            new_email: new_email.toLowerCase(),
            changed_by: caller.email,
            ip_address: clientIP,
            timestamp: new Date().toISOString(),
          }
        });
    }

    // Update profiles table if updates provided
    if (updates && Object.keys(updates).length > 0) {
      // Validate and filter updates against allowlist
      const { filtered, rejected } = validateAndFilterUpdates(updates);

      if (rejected.length > 0) {
        console.warn(`Rejected fields for user ${user_id}:`, rejected);
      }

      if (Object.keys(filtered).length === 0) {
        // No valid fields to update
        if (emailUpdateResult) {
          return new Response(
            JSON.stringify({
              success: true,
              user_id: user_id,
              email_updated: true,
              email_update: emailUpdateResult,
              warning: 'No valid profile fields to update',
              rejected_fields: rejected
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: 'No valid fields to update', rejected_fields: rejected }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(filtered)
        .eq('id', user_id);

      if (profileError) {
        console.error('Failed to update profiles:', profileError);
        // If email was already changed in auth, we should warn about partial failure
        if (emailUpdateResult) {
          return new Response(
            JSON.stringify({ 
              warning: 'Email was updated in login credentials but profile update failed',
              email_update: emailUpdateResult,
              profile_error: profileError.message 
            }),
            { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: `Failed to update profile: ${profileError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log profile update to audit
      await supabase
        .from('admin_audit_logs')
        .insert({
          admin_id: caller.id,
          tenant_id: callerProfile.tenant_id,
          event_type: 'user_updated',
          target_user_id: user_id,
          metadata: {
            action: 'profile_update',
            updated_fields: Object.keys(filtered),
            changed_by: caller.email,
            ip_address: clientIP,
            timestamp: new Date().toISOString(),
          }
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: user_id,
        email_updated: emailUpdateResult !== null,
        email_update: emailUpdateResult,
        message: emailUpdateResult 
          ? 'User email and profile updated successfully' 
          : 'User profile updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-update-user:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' } }
    );
  }
});
