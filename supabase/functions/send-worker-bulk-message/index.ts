import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWaSenderTextMessage } from "../_shared/wasender-whatsapp.ts";

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

// Sleep function for delay between messages
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

    // Use the shared WaSender utility (correct API endpoint + phone formatting + retry logic)
    const result = await sendWaSenderTextMessage(worker.mobile_number, message);
    results.push({ workerId: worker.id, success: result.success, error: result.error });

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

    // Wait 6 seconds between messages to respect rate limits without causing timeout
    if (i < workers.length - 1) {
      console.log(`[Job ${jobId}] Waiting 6 seconds before next message...`);
      await sleep(6000);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`[Job ${jobId}] Completed: ${successCount}/${workers.length} messages sent successfully`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { worker_ids, message, tenant_id }: BulkMessageRequest = await req.json();

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

    const jobId = crypto.randomUUID();
    const estimatedSeconds = workers.length * 6;
    const estimatedCompletionTime = new Date(Date.now() + estimatedSeconds * 1000).toISOString();

    // Start background task
    Promise.resolve().then(() =>
      sendMessagesWithDelay(supabase, workers as Worker[], message.trim(), tenant_id, jobId)
    );

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        total_recipients: workers.length,
        estimated_completion_time: estimatedCompletionTime,
        message: `Sending messages to ${workers.length} workers`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-worker-bulk-message:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
