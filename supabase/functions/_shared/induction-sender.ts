/**
 * Shared Induction Sender Module
 * SINGLE SOURCE OF TRUTH for all induction logic across edge functions.
 * 
 * Handles:
 * - Project resolution (assignment table → worker.project_id fallback)
 * - Video selection by worker's preferred language
 * - Induction record creation (ALWAYS before message)
 * - Portal URL generation (NEVER raw video URL)
 * - Message rendering (template → localized fallback)
 * - WhatsApp sending via shared provider
 * - Worker induction_status update
 */

import { sendWhatsAppText } from "./whatsapp-provider.ts";
import { getRenderedTemplate } from "./template-helper.ts";

export interface InductionSendParams {
  workerId: string;
  projectId?: string | null;
  videoId?: string | null;
  tenantId: string;
}

export interface InductionSendResult {
  success: boolean;
  inductionId: string | null;
  videoTitle: string | null;
  projectName: string | null;
  error: string | null;
}

interface VideoRecord {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  video_url: string;
  language: string;
  duration_seconds: number | null;
  valid_for_days: number | null;
}

/**
 * Resolve the project ID for a worker.
 * Priority: explicit projectId → project_worker_assignments → contractor_workers.project_id
 */
async function resolveProjectId(
  supabase: any,
  workerId: string,
  explicitProjectId?: string | null
): Promise<{ projectId: string | null; projectName: string }> {
  // 1. Use explicit project ID if provided
  let projectId = explicitProjectId || null;

  // 2. Fallback: check project_worker_assignments
  if (!projectId) {
    try {
      const { data: assignment } = await supabase
        .from("project_worker_assignments")
        .select("project_id")
        .eq("worker_id", workerId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();
      projectId = assignment?.project_id || null;
    } catch (e) {
      console.error("[InductionSender] Failed to check project_worker_assignments:", e);
    }
  }

  // 3. Fallback: check contractor_workers.project_id
  if (!projectId) {
    try {
      const { data: worker } = await supabase
        .from("contractor_workers")
        .select("project_id")
        .eq("id", workerId)
        .single();
      projectId = worker?.project_id || null;
    } catch (e) {
      console.error("[InductionSender] Failed to check worker.project_id:", e);
    }
  }

  // Resolve project name
  let projectName = "";
  if (projectId) {
    try {
      const { data: project } = await supabase
        .from("contractor_projects")
        .select("project_name")
        .eq("id", projectId)
        .single();
      projectName = project?.project_name || "";
    } catch (e) {
      console.error("[InductionSender] Failed to fetch project name:", e);
    }
  }

  return { projectId, projectName };
}

/**
 * Select the best video for a worker based on language preference.
 * Priority: preferred_language → Arabic → English → first available
 */
async function selectVideo(
  supabase: any,
  tenantId: string,
  preferredLang: string,
  videoId?: string | null
): Promise<VideoRecord | null> {
  // Specific video requested
  if (videoId) {
    const { data: video } = await supabase
      .from("induction_videos")
      .select("id, title, title_ar, description, video_url, language, duration_seconds, valid_for_days")
      .eq("id", videoId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();
    return video || null;
  }

  // Find by language priority
  const { data: videos } = await supabase
    .from("induction_videos")
    .select("id, title, title_ar, description, video_url, language, duration_seconds, valid_for_days")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!videos || videos.length === 0) return null;

  return (
    videos.find((v: VideoRecord) => v.language === preferredLang) ||
    videos.find((v: VideoRecord) => v.language === "ar") ||
    videos.find((v: VideoRecord) => v.language === "en") ||
    videos[0]
  );
}

/**
 * Get localized fallback message when no template is found.
 */
function getLocalizedInductionMessage(
  language: string,
  workerName: string,
  projectName: string,
  videoTitle: string,
  portalUrl: string,
  durationMin: number
): string {
  const projectText = projectName ? ` ${projectName}` : "";

  const messages: Record<string, string> = {
    ar: `مرحباً ${workerName}،\n\nمطلوب منك إكمال فيديو السلامة التالي قبل بدء العمل${projectText ? ` في مشروع${projectText}` : ""}:\n\n🎬 ${videoTitle}\n⏱️ ${durationMin} دقيقة\n🔗 ${portalUrl}\n\nيرجى مشاهدة الفيديو والموافقة على شروط السلامة.`,
    ur: `السلام علیکم ${workerName}،\n\nآپ کو${projectText ? ` ${projectText} پروجیکٹ میں` : ""} کام شروع کرنے سے پہلے درج ذیل حفاظتی ویڈیو مکمل کرنی ہوگی:\n\n🎬 ${videoTitle}\n⏱️ ${durationMin} منٹ\n🔗 ${portalUrl}\n\nبراہ کرم ویڈیو دیکھیں اور حفاظتی شرائط سے اتفاق کریں۔`,
    hi: `नमस्ते ${workerName},\n\n${projectText ? `${projectText} प्रोजेक्ट में ` : ""}काम शुरू करने से पहले आपको निम्नलिखित सुरक्षा वीडियो पूरा करना होगा:\n\n🎬 ${videoTitle}\n⏱️ ${durationMin} मिनट\n🔗 ${portalUrl}\n\nकृपया वीडियो देखें और सुरक्षा शर्तों से सहमत हों।`,
    fil: `Kumusta ${workerName},\n\nKailangan mong kumpletuhin ang sumusunod na safety video bago magsimula ng trabaho${projectText ? ` sa ${projectText} project` : ""}:\n\n🎬 ${videoTitle}\n⏱️ ${durationMin} minuto\n🔗 ${portalUrl}\n\nMangyaring panoorin ang video at sumang-ayon sa mga safety terms.`,
    en: `Hello ${workerName},\n\nYou are required to complete the following safety induction video before starting work${projectText ? ` on ${projectText} project` : ""}:\n\n🎬 ${videoTitle}\n⏱️ ${durationMin} min\n🔗 ${portalUrl}\n\nPlease watch the video and acknowledge the safety terms.`,
  };

  return messages[language] || messages.ar;
}

/**
 * Main function: Send induction video to a worker.
 * This is the SINGLE entry point for all induction sending logic.
 */
export async function sendInductionToWorker(
  supabase: any,
  params: InductionSendParams
): Promise<InductionSendResult> {
  const { workerId, projectId: explicitProjectId, videoId, tenantId } = params;

  console.log("[InductionSender] Starting induction send:", { workerId, explicitProjectId, videoId, tenantId });

  // 1. Get worker details
  const { data: worker, error: workerError } = await supabase
    .from("contractor_workers")
    .select("id, full_name, full_name_ar, mobile_number, preferred_language, approval_status, tenant_id, project_id")
    .eq("id", workerId)
    .single();

  if (workerError || !worker) {
    console.error("[InductionSender] Worker not found:", workerError);
    return { success: false, inductionId: null, videoTitle: null, projectName: null, error: "Worker not found" };
  }

  const preferredLang = worker.preferred_language || "ar";

  // 2. Resolve project
  const { projectId, projectName } = await resolveProjectId(supabase, workerId, explicitProjectId);
  console.log("[InductionSender] Resolved project:", { projectId, projectName });

  // 3. Select video
  const selectedVideo = await selectVideo(supabase, tenantId, preferredLang, videoId);
  if (!selectedVideo) {
    console.log("[InductionSender] No induction video available");
    return { success: false, inductionId: null, videoTitle: null, projectName, error: "No induction video available" };
  }

  console.log("[InductionSender] Selected video:", { id: selectedVideo.id, title: selectedVideo.title, language: selectedVideo.language });

  // 4. Create induction record BEFORE composing message
  const validForDays = selectedVideo.valid_for_days || 365;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validForDays);

  // Check for existing active induction for same video
  const { data: existingInduction } = await supabase
    .from("worker_inductions")
    .select("id")
    .eq("worker_id", workerId)
    .eq("video_id", selectedVideo.id)
    .is("deleted_at", null)
    .in("status", ["sent", "pending"])
    .maybeSingle();

  let inductionId: string | null = null;

  if (existingInduction) {
    // Update existing record
    inductionId = existingInduction.id;
    await supabase
      .from("worker_inductions")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_via: "whatsapp",
        project_id: projectId,
      })
      .eq("id", inductionId);
    console.log("[InductionSender] Updated existing induction record:", inductionId);
  } else {
    // Create new record
    const { data: newInduction, error: insertError } = await supabase
      .from("worker_inductions")
      .insert({
        worker_id: workerId,
        project_id: projectId,
        video_id: selectedVideo.id,
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_via: "whatsapp",
        expires_at: expiresAt.toISOString(),
        tenant_id: tenantId,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[InductionSender] Failed to create induction record:", insertError);
      return { success: false, inductionId: null, videoTitle: selectedVideo.title, projectName, error: "Failed to create induction record" };
    }

    inductionId = newInduction.id;
    console.log("[InductionSender] Created induction record:", inductionId);
  }

  // 5. Update worker induction_status
  await supabase
    .from("contractor_workers")
    .update({ induction_status: "sent" })
    .eq("id", workerId)
    .in("induction_status", ["none", "pending"]);

  // 6. Build portal URL (NEVER use raw video URL)
  const appUrl = Deno.env.get("APP_URL") || "https://www.dhuud.com";
  const inductionPortalUrl = `${appUrl}/worker-induction/${inductionId}`;

  // 7. Compose message via template → fallback
  const durationMin = Math.round((selectedVideo.duration_seconds || 0) / 60);

  const templateVariables = {
    worker_name: worker.full_name,
    worker_name_ar: worker.full_name_ar || worker.full_name,
    project_name: projectName || "",
    video_title: selectedVideo.title,
    video_title_ar: selectedVideo.title_ar || selectedVideo.title,
    video_description: selectedVideo.description || "",
    video_url: inductionPortalUrl,
    video_duration: `${durationMin} min`,
    video_duration_seconds: String(selectedVideo.duration_seconds || 0),
    video_language: preferredLang,
    induction_link: inductionPortalUrl,
    induction_id: inductionId || "",
    induction_expires_at: expiresAt.toISOString().split("T")[0],
    induction_valid_for_days: String(validForDays),
    induction_sent_at: new Date().toISOString(),
    induction_status: "pending",
    action_link: inductionPortalUrl,
  };

  let whatsappMessage: string;

  // Try language-specific template
  const templateSlug = `induction_video_${preferredLang}`;
  const templateResult = await getRenderedTemplate(supabase, tenantId, templateSlug, templateVariables);

  if (templateResult.found) {
    whatsappMessage = templateResult.content;
  } else {
    // Try generic template
    const genericResult = await getRenderedTemplate(supabase, tenantId, "worker_induction_video", templateVariables);
    if (genericResult.found) {
      whatsappMessage = genericResult.content;
    } else {
      // Fallback to hardcoded localized message
      whatsappMessage = getLocalizedInductionMessage(
        preferredLang,
        worker.full_name,
        projectName,
        selectedVideo.title,
        inductionPortalUrl,
        durationMin
      );
    }
  }

  // 8. Send via WhatsApp
  const result = await sendWhatsAppText(worker.mobile_number, whatsappMessage);

  // 9. Audit log
  await supabase.from("contractor_module_audit_logs").insert({
    tenant_id: tenantId,
    entity_type: "worker_induction",
    entity_id: workerId,
    action: "induction_video_sent",
    new_value: {
      video_id: selectedVideo.id,
      project_id: projectId,
      project_name: projectName,
      preferred_language: preferredLang,
      mobile_number: worker.mobile_number,
      induction_id: inductionId,
      portal_url: inductionPortalUrl,
      provider_success: result.success,
      provider_error: result.error,
    },
  });

  console.log(`[InductionSender] Induction ${result.success ? "sent" : "failed"} to ${worker.full_name} (${worker.mobile_number})`);

  return {
    success: result.success,
    inductionId,
    videoTitle: selectedVideo.title,
    projectName,
    error: result.success ? null : (result.error || "Failed to send WhatsApp message"),
  };
}
