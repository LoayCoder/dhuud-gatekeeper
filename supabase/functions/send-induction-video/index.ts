import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppText, getActiveProvider } from "../_shared/whatsapp-provider.ts";
import { getRenderedTemplate } from "../_shared/template-helper.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InductionRequest {
  // Support both camelCase (frontend) and snake_case formats
  workerId?: string;
  worker_id?: string;
  videoId?: string;
  video_id?: string;
  projectId?: string;
  project_id?: string;
  tenantId?: string;
  tenant_id?: string;
  inductionId?: string;
  induction_id?: string;
  mobileNumber?: string;
  mobile_number?: string;
  language?: string;
  isResend?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: InductionRequest = await req.json();

    // Normalize field names (support both camelCase and snake_case)
    const workerId = body.workerId || body.worker_id;
    const videoId = body.videoId || body.video_id;
    const projectId = body.projectId || body.project_id;
    let tenantId = body.tenantId || body.tenant_id;
    const inductionId = body.inductionId || body.induction_id;
    const mobileNumber = body.mobileNumber || body.mobile_number;
    const language = body.language;

    console.log('[Induction] Request received:', { workerId, videoId, projectId, tenantId, inductionId, mobileNumber, language });

    if (!workerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: workerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get worker details
    const { data: worker, error: workerError } = await supabase
      .from('contractor_workers')
      .select('id, full_name, mobile_number, preferred_language, approval_status, tenant_id')
      .eq('id', workerId)
      .single();

    if (workerError || !worker) {
      console.error('Worker not found:', workerError);
      return new Response(
        JSON.stringify({ error: 'Worker not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use worker's tenant_id if not provided
    if (!tenantId) {
      tenantId = worker.tenant_id;
    }

    if (worker.approval_status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Worker must be approved before sending induction' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which video(s) to send
    let selectedVideos: any[] = [];
    const preferredLang = language || worker.preferred_language || 'en';
    let projectName = 'General';

    if (videoId) {
      // Specific video requested
      const { data: video, error: videoError } = await supabase
        .from('induction_videos')
        .select('id, title, title_ar, description, video_url, language, duration_seconds, valid_for_days')
        .eq('id', videoId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();

      if (videoError || !video) {
        console.error('Video not found:', videoError);
        return new Response(
          JSON.stringify({ error: 'Induction video not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      selectedVideos = [video];
    } else if (projectId) {
      // Get project details and find appropriate videos
      const { data: project, error: projectError } = await supabase
        .from('contractor_projects')
        .select('project_name, site_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        console.error('Project not found:', projectError);
        return new Response(
          JSON.stringify({ error: 'Project not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      projectName = project.project_name;

      // Find appropriate induction video based on worker's preferred language
      const { data: videos } = await supabase
        .from('induction_videos')
        .select('id, title, title_ar, description, video_url, language, duration_seconds, valid_for_days')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filter videos by worker's preferred language, fallback to English
      selectedVideos = videos?.filter(v => v.language === preferredLang) || [];
      if (selectedVideos.length === 0) {
        selectedVideos = videos?.filter(v => v.language === 'en') || [];
      }
      if (selectedVideos.length === 0) {
        selectedVideos = videos || [];
      }
    } else {
      // No video or project specified, get first available video
      const { data: videos } = await supabase
        .from('induction_videos')
        .select('id, title, title_ar, description, video_url, language, duration_seconds, valid_for_days')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      selectedVideos = videos || [];
    }

    if (selectedVideos.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No induction videos available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expiry date based on video's valid_for_days or default to 365
    const video = selectedVideos[0];
    const validForDays = video.valid_for_days || 365;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validForDays);

    // Create or update induction record (if not already created by frontend)
    let inductionRecordId = inductionId;
    
    if (!inductionId) {
      // Check if induction record already exists
      const { data: existingInduction } = await supabase
        .from('worker_inductions')
        .select('id')
        .eq('worker_id', workerId)
        .eq('video_id', video.id)
        .is('deleted_at', null)
        .single();

      if (existingInduction) {
        inductionRecordId = existingInduction.id;
        // Update status
        await supabase
          .from('worker_inductions')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString(),
            sent_via: 'whatsapp'
          })
          .eq('id', inductionRecordId);
      } else {
        // Create new induction record
        const { data: newInduction, error: insertError } = await supabase
          .from('worker_inductions')
          .insert({
            worker_id: workerId,
            project_id: projectId || null,
            video_id: video.id,
            status: 'sent',
            sent_at: new Date().toISOString(),
            sent_via: 'whatsapp',
            expires_at: expiresAt.toISOString(),
            tenant_id: tenantId,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error creating induction record:', insertError);
        } else {
          inductionRecordId = newInduction?.id;
        }
      }
    } else {
      // Update existing induction record
      await supabase
        .from('worker_inductions')
        .update({ 
          status: 'sent', 
          sent_at: new Date().toISOString(),
          sent_via: 'whatsapp'
        })
        .eq('id', inductionId);
    }

    // Generate WhatsApp message with portal link
    const durationMin = Math.round((video.duration_seconds || 0) / 60);
    
    // Build the induction portal URL
    const appUrl = Deno.env.get('APP_URL') || 'https://xdlowvfzhvjzbtgvurzj.lovableproject.com';
    const inductionPortalUrl = inductionRecordId 
      ? `${appUrl}/worker-induction/${inductionRecordId}`
      : video.video_url; // Fallback to direct video URL if no induction record

    // Build comprehensive template variables
    const templateVariables = {
      worker_name: worker.full_name,
      worker_name_ar: worker.full_name || '',
      project_name: projectName,
      video_title: video.title,
      video_title_ar: video.title_ar || video.title,
      video_description: video.description || '',
      video_url: video.video_url,
      video_duration: `${durationMin} min`,
      video_duration_seconds: String(video.duration_seconds || 0),
      video_language: preferredLang,
      induction_link: inductionPortalUrl,
      induction_id: inductionRecordId || '',
      induction_expires_at: expiresAt.toISOString().split('T')[0],
      induction_valid_for_days: String(validForDays),
      induction_sent_at: new Date().toISOString(),
      induction_status: 'pending',
      company_name: '',
      site_name: '',
      action_link: inductionPortalUrl,
    };

    // Try language-specific template first (only if tenantId is available)
    const templateSlug = `induction_video_${preferredLang}`;
    let whatsappMessage: string;
    
    if (tenantId) {
      const { content: templateMessage, found } = await getRenderedTemplate(
        supabase, tenantId, templateSlug, templateVariables
      );

      if (found) {
        whatsappMessage = templateMessage;
      } else {
        // Try English template as fallback
        const { content: enMessage, found: enFound } = await getRenderedTemplate(
          supabase, tenantId, 'induction_video_en', templateVariables
        );
        
        if (enFound) {
          whatsappMessage = enMessage;
        } else {
          // Final fallback to hardcoded messages
          whatsappMessage = getLocalizedMessage(
            preferredLang, 
            worker.full_name, 
            projectName, 
            video.title,
            inductionPortalUrl,
            durationMin
          );
        }
      }
    } else {
      // No tenantId, use hardcoded messages
      whatsappMessage = getLocalizedMessage(
        preferredLang, 
        worker.full_name, 
        projectName, 
        video.title,
        inductionPortalUrl,
        durationMin
      );
    }

    // Send via active WhatsApp provider
    const workerMobile = mobileNumber || worker.mobile_number;
    const activeProvider = getActiveProvider();
    console.log(`[Induction] Using provider: ${activeProvider}, sending to: ${workerMobile}`);
    
    const result = await sendWhatsAppText(workerMobile, whatsappMessage);

    // Log the induction send
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id: tenantId,
      entity_type: 'worker_induction',
      entity_id: workerId,
      action: 'induction_video_sent',
      new_value: {
        video_id: video.id,
        project_id: projectId,
        preferred_language: preferredLang,
        mobile_number: workerMobile,
        provider: result.provider,
        provider_success: result.success,
        provider_message_id: result.messageId,
        provider_error: result.error,
      },
    });

    console.log(`[Induction] Video sent to ${worker.full_name} (${workerMobile}) - ${result.provider} success: ${result.success}`);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          provider: result.provider,
          message: `Failed to send WhatsApp message to ${workerMobile}`,
          worker_name: worker.full_name,
          video_title: video.title,
          induction_id: inductionRecordId,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: result.messageId,
        provider: result.provider,
        message: `Induction video sent to ${workerMobile}`,
        worker_name: worker.full_name,
        video_title: video.title,
        induction_id: inductionRecordId,
        expires_at: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending induction video:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getLocalizedMessage(
  language: string, 
  workerName: string, 
  projectName: string, 
  videoTitle: string,
  videoUrl: string,
  durationMin: number
): string {
  const messages: Record<string, string> = {
    ar: `مرحباً ${workerName}،\n\nمطلوب منك إكمال فيديو السلامة التالي قبل بدء العمل${projectName !== 'General' ? ` في مشروع ${projectName}` : ''}:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} دقيقة\n🔗 ${videoUrl}\n\nيرجى مشاهدة الفيديو والموافقة على شروط السلامة.`,
    ur: `السلام علیکم ${workerName}،\n\nآپ کو${projectName !== 'General' ? ` ${projectName} پروجیکٹ میں` : ''} کام شروع کرنے سے پہلے درج ذیل حفاظتی ویڈیو مکمل کرنی ہوگی:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} منٹ\n🔗 ${videoUrl}\n\nبراہ کرم ویڈیو دیکھیں اور حفاظتی شرائط سے اتفاق کریں۔`,
    hi: `नमस्ते ${workerName},\n\n${projectName !== 'General' ? `${projectName} प्रोजेक्ट में ` : ''}काम शुरू करने से पहले आपको निम्नलिखित सुरक्षा वीडियो पूरा करना होगा:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} मिनट\n🔗 ${videoUrl}\n\nकृपया वीडियो देखें और सुरक्षा शर्तों से सहमत हों।`,
    fil: `Kumusta ${workerName},\n\nKailangan mong kumpletuhin ang sumusunod na safety video bago magsimula ng trabaho${projectName !== 'General' ? ` sa ${projectName} project` : ''}:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} minuto\n🔗 ${videoUrl}\n\nMangyaring panoorin ang video at sumang-ayon sa mga safety terms.`,
    en: `Hello ${workerName},\n\nYou are required to complete the following safety induction video before starting work${projectName !== 'General' ? ` on ${projectName} project` : ''}:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} min\n🔗 ${videoUrl}\n\nPlease watch the video and acknowledge the safety terms.`,
  };

  return messages[language] || messages.en;
}
