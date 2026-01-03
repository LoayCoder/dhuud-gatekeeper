import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkMessageRequest {
  worker_ids: string[];
  message: string;
  tenant_id?: string;
}

interface Worker {
  id: string;
  full_name: string;
  mobile_number: string | null;
}

// Sleep function for delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Send WhatsApp message using the configured provider
async function sendWhatsAppMessage(
  supabase: any,
  phoneNumber: string,
  message: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch WhatsApp settings
    const { data: settings, error: settingsError } = await supabase
      .from("whatsapp_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .single();

    if (settingsError || !settings) {
      console.log("No active WhatsApp settings found for tenant:", tenantId);
      return { success: false, error: "WhatsApp not configured" };
    }

    // Get the active provider
    const provider = settings.active_provider || "wasender";

    if (provider === "wasender") {
      const apiKey = Deno.env.get("WASENDER_API_KEY");
      const sessionId = settings.wasender_session_id;

      if (!apiKey || !sessionId) {
        return { success: false, error: "WaSender not configured" };
      }

      // Format phone number
      let formattedPhone = phoneNumber.replace(/\D/g, "");
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "966" + formattedPhone.slice(1);
      }
      if (!formattedPhone.startsWith("966") && formattedPhone.length === 9) {
        formattedPhone = "966" + formattedPhone;
      }

      const response = await fetch("https://api.wasender.dev/v1/messages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          to: formattedPhone,
          text: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("WaSender error:", errorText);
        return { success: false, error: `WaSender error: ${response.status}` };
      }

      return { success: true };
    }

    return { success: false, error: "Unknown provider" };
  } catch (error: unknown) {
    console.error("Error sending WhatsApp message:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Background task to send messages with delay
async function sendMessagesWithDelay(
  supabase: any,
  workers: Worker[],
  message: string,
  tenantId: string,
  jobId: string
) {
  console.log(`[Job ${jobId}] Starting bulk message send to ${workers.length} workers`);

  const results: { workerId: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < workers.length; i++) {
    const worker = workers[i];
    console.log(`[Job ${jobId}] Sending message ${i + 1}/${workers.length} to ${worker.full_name}`);

    if (!worker.mobile_number) {
      results.push({ workerId: worker.id, success: false, error: "No mobile number" });
      continue;
    }

    const result = await sendWhatsAppMessage(supabase, worker.mobile_number, message, tenantId);
    results.push({ workerId: worker.id, ...result });

    // Log the notification attempt
    try {
      await supabase.from("notification_logs").insert({
        tenant_id: tenantId,
        recipient_type: "worker",
        recipient_id: worker.id,
        channel: "whatsapp",
        message_type: "bulk_message",
        status: result.success ? "sent" : "failed",
        error_message: result.error,
        metadata: { job_id: jobId, worker_name: worker.full_name },
      });
    } catch (logError) {
      console.error("Failed to log notification:", logError);
    }

    // Wait 30 seconds before sending the next message (except for the last one)
    if (i < workers.length - 1) {
      console.log(`[Job ${jobId}] Waiting 30 seconds before next message...`);
      await sleep(30000);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`[Job ${jobId}] Completed: ${successCount}/${workers.length} messages sent successfully`);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { worker_ids, message, tenant_id }: BulkMessageRequest = await req.json();

    // Validate input
    if (!worker_ids || worker_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No workers specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!message || message.trim() === "") {
      return new Response(
        JSON.stringify({ success: false, error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Tenant ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch workers with mobile numbers
    const { data: workers, error: workersError } = await supabase
      .from("contractor_workers")
      .select("id, full_name, mobile_number")
      .in("id", worker_ids)
      .eq("tenant_id", tenant_id)
      .not("mobile_number", "is", null);

    if (workersError) {
      console.error("Error fetching workers:", workersError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch workers" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!workers || workers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No workers with mobile numbers found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate job ID
    const jobId = crypto.randomUUID();

    // Calculate estimated completion time
    const estimatedSeconds = workers.length * 30;
    const estimatedCompletionTime = new Date(Date.now() + estimatedSeconds * 1000).toISOString();

    // Start background task using Promise.resolve to avoid blocking
    Promise.resolve().then(() => 
      sendMessagesWithDelay(supabase, workers as Worker[], message.trim(), tenant_id, jobId)
    );

    // Return immediate response
    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        total_recipients: workers.length,
        estimated_completion_time: estimatedCompletionTime,
        message: `Sending messages to ${workers.length} workers with 30-second delay between each`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-worker-bulk-message:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
