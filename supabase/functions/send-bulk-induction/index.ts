import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendInductionToWorker } from "../_shared/induction-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkInductionRequest {
  worker_ids: string[];
  project_id: string;
  tenant_id: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Background task to send inductions with delay
async function sendInductionsWithDelay(
  supabase: any,
  workerIds: string[],
  projectId: string,
  tenantId: string,
  jobId: string
) {
  console.log(`[Job ${jobId}] Starting bulk induction send to ${workerIds.length} workers`);

  const results: { workerId: string; success: boolean; error?: string | null }[] = [];

  for (let i = 0; i < workerIds.length; i++) {
    const workerId = workerIds[i];
    console.log(`[Job ${jobId}] Sending induction ${i + 1}/${workerIds.length} to worker ${workerId}`);

    const result = await sendInductionToWorker(supabase, {
      workerId,
      projectId,
      tenantId,
    });

    results.push({ workerId, success: result.success, error: result.error });

    // Wait 30 seconds before sending the next message (except for the last one)
    if (i < workerIds.length - 1) {
      console.log(`[Job ${jobId}] Waiting 30 seconds before next message...`);
      await sleep(30000);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`[Job ${jobId}] Completed: ${successCount}/${workerIds.length} inductions sent successfully`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { worker_ids, project_id, tenant_id }: BulkInductionRequest = await req.json();

    if (!worker_ids || worker_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No workers specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!project_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Project ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Tenant ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from("contractor_projects")
      .select("id, project_name")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ success: false, error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workers exist and are approved
    const { data: workers, error: workersError } = await supabase
      .from("contractor_workers")
      .select("id")
      .in("id", worker_ids)
      .eq("tenant_id", tenant_id)
      .eq("approval_status", "approved")
      .not("mobile_number", "is", null);

    if (workersError || !workers || workers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No eligible workers found (must be approved with mobile number)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eligibleWorkerIds = workers.map((w: { id: string }) => w.id);
    const jobId = crypto.randomUUID();
    const estimatedSeconds = eligibleWorkerIds.length * 30;
    const estimatedCompletionTime = new Date(Date.now() + estimatedSeconds * 1000).toISOString();

    // Start background task
    Promise.resolve().then(() =>
      sendInductionsWithDelay(supabase, eligibleWorkerIds, project_id, tenant_id, jobId)
    );

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        total_recipients: eligibleWorkerIds.length,
        project_name: project.project_name,
        estimated_completion_time: estimatedCompletionTime,
        message: `Sending inductions to ${eligibleWorkerIds.length} workers with 30-second delay between each`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-bulk-induction:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
