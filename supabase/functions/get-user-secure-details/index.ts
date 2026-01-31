import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Get the Authorization header (User's Token)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // 2. Initialize Supabase Client (User Context) to check permissions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 3. Get User ID from token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Invalid token');
    }

    // 4. Verify Permissions: Check if caller is Admin or Manager
    // Using the 'is_admin_or_manager' database function we created
    // This function uses auth.uid() internally, so no arguments needed
    const { data: isAuthorized, error: permError } = await supabaseClient.rpc('is_admin_or_manager');

    if (permError) {
      console.error("Permission check error:", permError);
      throw new Error('Permission check failed');
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Parse Request Body
    const { user_id } = await req.json();
    if (!user_id) {
      throw new Error('Missing user_id in request body');
    }

    // 6. Initialize Service Role Client (Privileged) to fetch sensitive data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 7. Fetch User Details (Email from Auth, Profile data from Public)
    // Fetch Email from Auth API (Admin only)
    const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(user_id);

    if (targetError) {
      console.error("Error fetching auth user:", targetError);
      // Don't fail completely if auth user not found (might be deleted), try profile
    }

    // Fetch Profile Data
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, avatar_url, phone_number')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    if (!targetUser?.user && !profileData) {
      throw new Error('User not found');
    }

    // 8. Construct Response
    const responseData = {
      id: user_id,
      email: targetUser?.user?.email ?? null,
      full_name: profileData?.full_name ?? targetUser?.user?.user_metadata?.full_name ?? null,
      avatar_url: profileData?.avatar_url ?? targetUser?.user?.user_metadata?.avatar_url ?? null,
      phone: profileData?.phone_number ?? targetUser?.user?.phone ?? null,
    };

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in get-user-secure-details:", error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
