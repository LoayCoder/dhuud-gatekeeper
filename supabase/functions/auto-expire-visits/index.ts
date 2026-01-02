import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Find and expire all approved visit_requests where valid_until has passed
    const { data: expiredRequests, error: fetchError } = await supabase
      .from("visit_requests")
      .select("id, visitor_id, tenant_id")
      .eq("status", "approved")
      .lt("valid_until", now);

    if (fetchError) {
      console.error("[AutoExpire] Error fetching expired requests:", fetchError);
      throw fetchError;
    }

    if (!expiredRequests || expiredRequests.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired visits found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AutoExpire] Found ${expiredRequests.length} expired visit requests`);

    // Update all expired visit_requests to 'expired' status
    const expiredIds = expiredRequests.map((r) => r.id);
    const { error: updateError } = await supabase
      .from("visit_requests")
      .update({ status: "expired" })
      .in("id", expiredIds);

    if (updateError) {
      console.error("[AutoExpire] Error updating expired requests:", updateError);
      throw updateError;
    }

    // Deactivate associated visitors (mark QR as no longer valid)
    const visitorIds = expiredRequests.map((r) => r.visitor_id).filter(Boolean);
    if (visitorIds.length > 0) {
      await supabase
        .from("visitors")
        .update({ is_active: false })
        .in("id", visitorIds);
    }

    console.log(`[AutoExpire] Successfully expired ${expiredIds.length} visit requests`);

    return new Response(
      JSON.stringify({ 
        message: "Expired visits processed successfully", 
        count: expiredIds.length,
        expired_ids: expiredIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[AutoExpire] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
