import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppText, getActiveProvider } from "../_shared/whatsapp-provider.ts";
import { getRenderedTemplate } from "../_shared/template-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkInductionRequest {
  worker_ids: string[];
  project_id: string;
  tenant_id: string;
}

interface Worker {
  id: string;
  full_name: string;
  full_name_ar: string | null;
  mobile_number: string;
  preferred_language: string;
  nationality: string;
  tenant_id: string;
  company_id: string | null;
}

// Arab countries that get Arabic for workers
const ARAB_COUNTRY_CODES = new Set([
  'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'SY', 'IQ',
  'EG', 'SD', 'LY', 'TN', 'DZ', 'MA', 'YE', 'PS', 'MR', 'SO'
]);

// Specific worker language mappings by nationality
const WORKER_LANGUAGE_MAP: Record<string, string> = {
  'PK': 'ur',  // Pakistan -> Urdu
  'IN': 'hi',  // India -> Hindi
  'PH': 'fil', // Philippines -> Filipino
  'CN': 'zh',  // China -> Chinese
};

// Resolve worker language based on nationality
function resolveWorkerLanguage(nationalityCode: string | null | undefined): string {
  if (!nationalityCode) return 'en';
  const code = nationalityCode.toUpperCase();
  
  if (ARAB_COUNTRY_CODES.has(code)) {
    return 'ar';
  }
  
  if (code in WORKER_LANGUAGE_MAP) {
    return WORKER_LANGUAGE_MAP[code];
  }
  
  return 'en';
}

interface Video {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  video_url: string;
  language: string;
  duration_seconds: number | null;
  valid_for_days: number | null;
}

// Sleep function for delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getLocalizedMessage(
  language: string,
  workerName: string,
  projectName: string,
  videoTitle: string,
  videoUrl: string,
  durationMin: number
): string {
  const messages: Record<string, string> = {
    ar: `مرحباً ${workerName}،\n\nمطلوب منك إكمال فيديو السلامة التالي قبل بدء العمل${projectName !== "General" ? ` في مشروع ${projectName}` : ""}:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} دقيقة\n🔗 ${videoUrl}\n\nيرجى مشاهدة الفيديو والموافقة على شروط السلامة.`,
    ur: `السلام علیکم ${workerName}،\n\nآپ کو${projectName !== "General" ? ` ${projectName} پروجیکٹ میں` : ""} کام شروع کرنے سے پہلے درج ذیل حفاظتی ویڈیو مکمل کرنی ہوگی:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} منٹ\n🔗 ${videoUrl}\n\nبراہ کرم ویڈیو دیکھیں اور حفاظتی شرائط سے اتفاق کریں۔`,
    hi: `नमस्ते ${workerName},\n\n${projectName !== "General" ? `${projectName} प्रोजेक्ट में ` : ""}काम शुरू करने से पहले आपको निम्नलिखित सुरक्षा वीडियो पूरा करना होगा:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} मिनट\n🔗 ${videoUrl}\n\nकृपया वीडियो देखें और सुरक्षा शर्तों से सहमत हों।`,
    fil: `Kumusta ${workerName},\n\nKailangan mong kumpletuhin ang sumusunod na safety video bago magsimula ng trabaho${projectName !== "General" ? ` sa ${projectName} project` : ""}:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} minuto\n🔗 ${videoUrl}\n\nMangyaring panoorin ang video at sumang-ayon sa mga safety terms.`,
    en: `Hello ${workerName},\n\nYou are required to complete the following safety induction video before starting work${projectName !== "General" ? ` on ${projectName} project` : ""}:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} min\n🔗 ${videoUrl}\n\nPlease watch the video and acknowledge the safety terms.`,
  };

  return messages[language] || messages.en;
}

// Send induction to a single worker
async function sendInductionToWorker(
  supabase: any,
  worker: Worker,
  project: { id: string; project_name: string },
  videos: Video[],
  appUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Resolve language: use preferred_language if set (and not 'en'), otherwise resolve from nationality
    let preferredLang = worker.preferred_language;
    if (!preferredLang || preferredLang === 'en') {
      preferredLang = resolveWorkerLanguage(worker.nationality);
    }

    // Find appropriate video for worker's language
    let selectedVideo = videos.find((v) => v.language === preferredLang);
    if (!selectedVideo) {
      selectedVideo = videos.find((v) => v.language === "en");
    }
    if (!selectedVideo && videos.length > 0) {
      selectedVideo = videos[0];
    }

    if (!selectedVideo) {
      return { success: false, error: "No induction video available" };
    }

    // Calculate expiry date
    const validForDays = selectedVideo.valid_for_days || 365;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validForDays);

    // Create induction record
    const { data: inductionRecord, error: insertError } = await supabase
      .from("worker_inductions")
      .insert({
        worker_id: worker.id,
        project_id: project.id,
        video_id: selectedVideo.id,
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_via: "whatsapp",
        expires_at: expiresAt.toISOString(),
        tenant_id: worker.tenant_id,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating induction record:", insertError);
      return { success: false, error: "Failed to create induction record" };
    }

    // Build message
    const durationMin = Math.round((selectedVideo.duration_seconds || 0) / 60);
    const inductionPortalUrl = `${appUrl}/worker-induction/${inductionRecord.id}`;

    // Build comprehensive template variables
    const templateVariables = {
      worker_name: worker.full_name,
      worker_name_ar: worker.full_name_ar || worker.full_name,
      project_name: project.project_name,
      video_title: selectedVideo.title,
      video_title_ar: selectedVideo.title_ar || selectedVideo.title,
      video_description: selectedVideo.description || '',
      video_url: selectedVideo.video_url,
      video_duration: `${durationMin} min`,
      video_duration_seconds: String(selectedVideo.duration_seconds || 0),
      video_language: preferredLang,
      induction_link: inductionPortalUrl,
      induction_id: inductionRecord.id,
      induction_expires_at: expiresAt.toISOString().split('T')[0],
      induction_valid_for_days: String(validForDays),
      induction_sent_at: new Date().toISOString(),
      induction_status: 'pending',
      company_name: '',
      site_name: '',
      action_link: inductionPortalUrl,
    };

    // Try language-specific template first
    const templateSlug = `induction_video_${preferredLang}`;
    const { content: templateMessage, found } = await getRenderedTemplate(
      supabase, worker.tenant_id, templateSlug, templateVariables
    );

    let whatsappMessage: string;
    if (found) {
      whatsappMessage = templateMessage;
    } else {
      // Try English template as fallback
      const { content: enMessage, found: enFound } = await getRenderedTemplate(
        supabase, worker.tenant_id, 'induction_video_en', templateVariables
      );
      
      if (enFound) {
        whatsappMessage = enMessage;
      } else {
        // Final fallback to hardcoded messages
        whatsappMessage = getLocalizedMessage(
          preferredLang,
          worker.full_name,
          project.project_name,
          selectedVideo.title,
          inductionPortalUrl,
          durationMin
        );
      }
    }

    // Send WhatsApp message
    const result = await sendWhatsAppText(worker.mobile_number, whatsappMessage);

    // Log the send
    await supabase.from("contractor_module_audit_logs").insert({
      tenant_id: worker.tenant_id,
      entity_type: "worker_induction",
      entity_id: worker.id,
      action: "bulk_induction_video_sent",
      new_value: {
        video_id: selectedVideo.id,
        project_id: project.id,
        preferred_language: preferredLang,
        mobile_number: worker.mobile_number,
        provider: result.provider,
        provider_success: result.success,
        provider_message_id: result.messageId,
        provider_error: result.error,
      },
    });

    if (!result.success) {
      // Update induction record to failed
      await supabase
        .from("worker_inductions")
        .update({ status: "failed" })
        .eq("id", inductionRecord.id);

      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending induction to worker:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Background task to send inductions with delay
async function sendInductionsWithDelay(
  supabase: any,
  workers: Worker[],
  project: { id: string; project_name: string },
  videos: Video[],
  appUrl: string,
  jobId: string
) {
  console.log(`[Job ${jobId}] Starting bulk induction send to ${workers.length} workers for project ${project.project_name}`);

  const results: { workerId: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < workers.length; i++) {
    const worker = workers[i];
    console.log(`[Job ${jobId}] Sending induction ${i + 1}/${workers.length} to ${worker.full_name}`);

    const result = await sendInductionToWorker(supabase, worker, project, videos, appUrl);
    results.push({ workerId: worker.id, ...result });

    // Wait 30 seconds before sending the next message (except for the last one)
    if (i < workers.length - 1) {
      console.log(`[Job ${jobId}] Waiting 30 seconds before next message...`);
      await sleep(30000);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`[Job ${jobId}] Completed: ${successCount}/${workers.length} inductions sent successfully`);
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

    const { worker_ids, project_id, tenant_id }: BulkInductionRequest = await req.json();

    // Validate input
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

    // Fetch project
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

    // Fetch workers (only approved with mobile numbers)
    const { data: workers, error: workersError } = await supabase
      .from("contractor_workers")
      .select("id, full_name, full_name_ar, mobile_number, preferred_language, nationality, tenant_id, company_id")
      .in("id", worker_ids)
      .eq("tenant_id", tenant_id)
      .eq("approval_status", "approved")
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
        JSON.stringify({ success: false, error: "No eligible workers found (must be approved with mobile number)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch induction videos
    const { data: videos, error: videosError } = await supabase
      .from("induction_videos")
      .select("id, title, title_ar, description, video_url, language, duration_seconds, valid_for_days")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (videosError || !videos || videos.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No induction videos available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate job ID
    const jobId = crypto.randomUUID();

    // Calculate estimated completion time
    const estimatedSeconds = workers.length * 30;
    const estimatedCompletionTime = new Date(Date.now() + estimatedSeconds * 1000).toISOString();

    // Get app URL
    const appUrl = Deno.env.get("APP_URL") || "https://xdlowvfzhvjzbtgvurzj.lovableproject.com";

    // Start background task
    Promise.resolve().then(() =>
      sendInductionsWithDelay(supabase, workers as Worker[], project, videos as Video[], appUrl, jobId)
    );

    // Return immediate response
    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        total_recipients: workers.length,
        project_name: project.project_name,
        estimated_completion_time: estimatedCompletionTime,
        message: `Sending inductions to ${workers.length} workers with 30-second delay between each`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-bulk-induction:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
