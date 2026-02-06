import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  /** Target specific users by their OneSignal external_id (Supabase user ID). */
  userIds?: string[];
  /** Notification heading / title. */
  heading: string;
  /** Notification body content. */
  content: string;
  /** Additional data attached to the notification (e.g. deep-link route). */
  data?: Record<string, unknown>;
  /** OneSignal tag-based filters for segment targeting. */
  filters?: Array<{
    field: "tag";
    key: string;
    relation: string;
    value?: string;
  }>;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(
    `[${requestId}] ========== OneSignal Notification Request ==========`
  );

  try {
    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error(`[${requestId}] OneSignal credentials not configured`);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "OneSignal is not configured. Set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY in Supabase Secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      userIds,
      heading,
      content,
      data,
      filters,
    }: RequestBody = await req.json();

    // Validate required fields
    if (!heading || !content) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: heading, content",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!userIds?.length && !filters?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Must specify userIds or filters for targeting",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build OneSignal REST API payload
    // See: https://documentation.onesignal.com/reference/create-notification
    const oneSignalPayload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: heading },
      contents: { en: content },
      data: data || {},
      // Web-specific settings
      chrome_web_badge:
        "https://xdlowvfzhvjzbtgvurzj.supabase.co/storage/v1/object/public/branding/9290e913-c735-405c-91c6-141e966011ae/favicon/1764707368310.png",
      chrome_web_icon:
        "https://xdlowvfzhvjzbtgvurzj.supabase.co/storage/v1/object/public/branding/9290e913-c735-405c-91c6-141e966011ae/favicon/1764707368310.png",
      // web_url is intentionally omitted to let the client click handler manage navigation
      ttl: 86400,
      priority: 10,
    };

    // Targeting: user IDs take precedence over filters
    if (userIds && userIds.length > 0) {
      // Use include_aliases with external_id to target specific users
      oneSignalPayload.include_aliases = {
        external_id: userIds,
      };
      oneSignalPayload.target_channel = "push";
    } else if (filters && filters.length > 0) {
      // Use tag-based filters
      oneSignalPayload.filters = filters.map((f, index) => {
        const filter: Record<string, string> = {
          field: f.field,
          key: f.key,
          relation: f.relation,
        };
        if (f.value !== undefined) {
          filter.value = f.value;
        }
        // Add "AND" operator between filters (not before the first)
        if (index > 0) {
          return [{ operator: "AND" }, filter];
        }
        return filter;
      }).flat();
    }

    console.log(`[${requestId}] Sending to OneSignal:`, {
      heading,
      targetType: userIds?.length ? "userIds" : "filters",
      targetCount: userIds?.length || filters?.length || 0,
    });

    // Call OneSignal REST API
    const response = await fetch(
      "https://onesignal.com/api/v1/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify(oneSignalPayload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error(
        `[${requestId}] OneSignal API error (${response.status}):`,
        result
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: result.errors || "OneSignal API error",
          statusCode: response.status,
        }),
        {
          status: response.status >= 500 ? 502 : response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[${requestId}] OneSignal API response:`, {
      id: result.id,
      recipients: result.recipients,
    });
    console.log(
      `[${requestId}] ========== Request Complete ==========`
    );

    return new Response(
      JSON.stringify({
        success: true,
        id: result.id,
        recipients: result.recipients,
        requestId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error(`[${requestId}] Unexpected error:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
