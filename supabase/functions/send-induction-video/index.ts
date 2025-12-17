import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppMessage } from "../_shared/twilio-whatsapp.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InductionRequest {
  worker_id: string;
  project_id: string;
  tenant_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { worker_id, project_id, tenant_id }: InductionRequest = await req.json();

    if (!worker_id || !project_id || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get worker details
    const { data: worker, error: workerError } = await supabase
      .from('contractor_workers')
      .select('full_name, mobile_number, preferred_language, approval_status')
      .eq('id', worker_id)
      .single();

    if (workerError || !worker) {
      console.error('Worker not found:', workerError);
      return new Response(
        JSON.stringify({ error: 'Worker not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (worker.approval_status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Worker must be approved before sending induction' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('contractor_projects')
      .select('project_name, site_id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find appropriate induction video based on worker's preferred language
    const { data: videos } = await supabase
      .from('induction_videos')
      .select('id, title, video_url, language, duration_minutes, is_mandatory')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .or(`project_id.eq.${project_id},site_id.eq.${project.site_id},and(project_id.is.null,site_id.is.null)`)
      .order('is_mandatory', { ascending: false });

    // Filter videos by worker's preferred language, fallback to English
    const preferredLang = worker.preferred_language || 'en';
    let selectedVideos = videos?.filter(v => v.language === preferredLang) || [];
    if (selectedVideos.length === 0) {
      selectedVideos = videos?.filter(v => v.language === 'en') || [];
    }
    if (selectedVideos.length === 0) {
      selectedVideos = videos || [];
    }

    if (selectedVideos.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No induction videos available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expiry date (90 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Create induction records for each required video
    const inductionRecords = [];
    for (const video of selectedVideos) {
      const { data: induction, error: inductionError } = await supabase
        .from('worker_inductions')
        .insert({
          worker_id,
          project_id,
          video_id: video.id,
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_via: 'whatsapp',
          expires_at: expiresAt.toISOString(),
          tenant_id,
        })
        .select()
        .single();

      if (inductionError) {
        console.error('Error creating induction record:', inductionError);
        continue;
      }

      inductionRecords.push({
        induction_id: induction.id,
        video_title: video.title,
        video_url: video.video_url,
        duration_minutes: video.duration_minutes,
        is_mandatory: video.is_mandatory,
      });
    }

    // Generate WhatsApp message with video links
    const videoLinks = inductionRecords
      .map((r, i) => `${i + 1}. ${r.video_title} (${r.duration_minutes} min)\n${r.video_url}`)
      .join('\n\n');

    const whatsappMessage = getLocalizedMessage(preferredLang, worker.full_name, project.project_name, videoLinks);

    // Send via Twilio WhatsApp API
    const twilioResult = await sendWhatsAppMessage(worker.mobile_number, whatsappMessage);

    // Log the induction send
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id,
      entity_type: 'worker_induction',
      entity_id: worker_id,
      action: 'induction_videos_sent',
      new_value: {
        project_id,
        videos_sent: inductionRecords.length,
        preferred_language: preferredLang,
        mobile_number: worker.mobile_number,
        twilio_success: twilioResult.success,
        twilio_message_sid: twilioResult.messageSid,
        twilio_error: twilioResult.error,
      },
    });

    console.log(`[Induction] Videos sent to ${worker.full_name} (${worker.mobile_number}) for project ${project.project_name} - Twilio success: ${twilioResult.success}`);

    if (!twilioResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: twilioResult.error,
          message: `Failed to send WhatsApp message to ${worker.mobile_number}`,
          worker_name: worker.full_name,
          project_name: project.project_name,
          videos_prepared: inductionRecords.length,
          induction_records: inductionRecords,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_sid: twilioResult.messageSid,
        message: `Induction videos sent to ${worker.mobile_number}`,
        worker_name: worker.full_name,
        project_name: project.project_name,
        videos_sent: inductionRecords.length,
        induction_records: inductionRecords,
        expires_at: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending induction video:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getLocalizedMessage(language: string, workerName: string, projectName: string, videoLinks: string): string {
  const messages: Record<string, string> = {
    ar: `مرحباً ${workerName}،\n\nمطلوب منك إكمال فيديوهات السلامة التالية قبل بدء العمل في مشروع ${projectName}:\n\n${videoLinks}\n\nيرجى مشاهدة جميع الفيديوهات والموافقة على شروط السلامة.`,
    ur: `السلام علیکم ${workerName}،\n\nآپ کو ${projectName} پروجیکٹ میں کام شروع کرنے سے پہلے درج ذیل حفاظتی ویڈیوز مکمل کرنی ہوں گی:\n\n${videoLinks}\n\nبراہ کرم تمام ویڈیوز دیکھیں اور حفاظتی شرائط سے اتفاق کریں۔`,
    hi: `नमस्ते ${workerName},\n\n${projectName} प्रोजेक्ट में काम शुरू करने से पहले आपको निम्नलिखित सुरक्षा वीडियो पूरे करने होंगे:\n\n${videoLinks}\n\nकृपया सभी वीडियो देखें और सुरक्षा शर्तों से सहमत हों।`,
    fil: `Kumusta ${workerName},\n\nKailangan mong kumpletuhin ang mga sumusunod na safety video bago magsimula ng trabaho sa ${projectName} project:\n\n${videoLinks}\n\nMangyaring panoorin ang lahat ng video at sumang-ayon sa mga safety terms.`,
    en: `Hello ${workerName},\n\nYou are required to complete the following safety induction videos before starting work on ${projectName} project:\n\n${videoLinks}\n\nPlease watch all videos and acknowledge the safety terms.`,
  };

  return messages[language] || messages.en;
}
