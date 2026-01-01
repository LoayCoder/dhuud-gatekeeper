import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppText, getActiveProvider } from "../_shared/whatsapp-provider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OnboardRequest {
  worker_id: string;
  project_id: string;
  tenant_id?: string;
  video_id?: string;
  valid_days?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { worker_id, project_id, tenant_id: providedTenantId, video_id, valid_days = 30 }: OnboardRequest = await req.json();

    console.log('[Onboard] Request received:', { worker_id, project_id, providedTenantId, video_id });

    if (!worker_id || !project_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: worker_id and project_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get worker details
    const { data: worker, error: workerError } = await supabase
      .from('contractor_workers')
      .select('id, full_name, mobile_number, preferred_language, approval_status, company_id, tenant_id')
      .eq('id', worker_id)
      .single();

    if (workerError || !worker) {
      console.error('Worker not found:', workerError);
      return new Response(
        JSON.stringify({ error: 'Worker not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = providedTenantId || worker.tenant_id;

    if (worker.approval_status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Worker must be approved before onboarding' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('contractor_projects')
      .select('id, project_name, status, company_id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (project.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Project must be active for onboarding' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (worker.company_id !== project.company_id) {
      return new Response(
        JSON.stringify({ error: 'Worker does not belong to the project company' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== STEP 1: SEND INDUCTION VIDEO ==========
    console.log('[Onboard] Step 1: Sending induction video...');

    // Find appropriate video
    let selectedVideo: any = null;
    const preferredLang = worker.preferred_language || 'en';

    if (video_id) {
      const { data: video } = await supabase
        .from('induction_videos')
        .select('id, title, video_url, language, duration_seconds, valid_for_days')
        .eq('id', video_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();
      selectedVideo = video;
    } else {
      // Find video by language
      const { data: videos } = await supabase
        .from('induction_videos')
        .select('id, title, video_url, language, duration_seconds, valid_for_days')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      selectedVideo = videos?.find(v => v.language === preferredLang) 
        || videos?.find(v => v.language === 'en') 
        || videos?.[0];
    }

    let inductionResult = { success: false, error: 'No video available' as string | null, inductionId: null as string | null };

    if (selectedVideo) {
      // Calculate expiry
      const validForDays = selectedVideo.valid_for_days || 365;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validForDays);

      // Create induction record
      const { data: induction, error: inductionError } = await supabase
        .from('worker_inductions')
        .insert({
          worker_id,
          project_id,
          video_id: selectedVideo.id,
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_via: 'whatsapp',
          expires_at: expiresAt.toISOString(),
          tenant_id: tenantId,
        })
        .select('id')
        .single();

      if (!inductionError && induction) {
        inductionResult.inductionId = induction.id;

        // Send WhatsApp message
        const durationMin = Math.round((selectedVideo.duration_seconds || 0) / 60);
        const message = getLocalizedMessage(
          preferredLang,
          worker.full_name,
          project.project_name,
          selectedVideo.title,
          selectedVideo.video_url,
          durationMin
        );

        const whatsappResult = await sendWhatsAppText(worker.mobile_number, message);
        inductionResult.success = whatsappResult.success;
        inductionResult.error = whatsappResult.error || null;

        console.log(`[Onboard] Induction sent: ${whatsappResult.success ? 'success' : 'failed'}`);
      } else {
        console.error('Error creating induction record:', inductionError);
        inductionResult.error = 'Failed to create induction record';
      }
    } else {
      console.log('[Onboard] No induction video available, skipping...');
    }

    // ========== STEP 2: GENERATE QR CODE ==========
    console.log('[Onboard] Step 2: Generating QR code...');

    // Revoke existing QR codes
    await supabase
      .from('worker_qr_codes')
      .update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
        revocation_reason: 'Replaced during onboarding',
      })
      .eq('worker_id', worker_id)
      .eq('project_id', project_id)
      .eq('is_revoked', false);

    // Generate new QR token
    const qrToken = crypto.randomUUID();
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + valid_days);

    const { data: qrCode, error: qrError } = await supabase
      .from('worker_qr_codes')
      .insert({
        worker_id,
        project_id,
        qr_token: qrToken,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
        is_revoked: false,
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (qrError) {
      console.error('Error creating QR code:', qrError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate QR code',
          induction_sent: inductionResult.success,
          induction_id: inductionResult.inductionId,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== STEP 3: SEND QR CODE VIA WHATSAPP ==========
    console.log('[Onboard] Step 3: Sending QR code to worker...');

    const appUrl = Deno.env.get('APP_URL') || 'https://preview--hssa-b2b-full-bunlde.lovable.app';
    const accessUrl = `${appUrl}/worker-access/${qrToken}`;

    const qrMessage = getQRCodeMessage(
      preferredLang,
      worker.full_name,
      project.project_name,
      accessUrl,
      validUntil
    );

    const qrWhatsappResult = await sendWhatsAppText(worker.mobile_number, qrMessage);
    console.log(`[Onboard] QR code sent: ${qrWhatsappResult.success ? 'success' : 'failed'}`);

    // ========== STEP 4: LOG AUDIT ==========
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id: tenantId,
      entity_type: 'worker_onboarding',
      entity_id: worker_id,
      action: 'worker_onboarded',
      new_value: {
        worker_id,
        project_id,
        qr_code_id: qrCode.id,
        induction_id: inductionResult.inductionId,
        induction_sent: inductionResult.success,
        qr_code_sent: qrWhatsappResult.success,
        video_id: selectedVideo?.id,
      },
    });

    console.log(`[Onboard] Worker ${worker.full_name} onboarded successfully on project ${project.project_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        worker_name: worker.full_name,
        project_name: project.project_name,
        // QR Code data
        qr_code_id: qrCode.id,
        qr_token: qrToken,
        qr_valid_from: validFrom.toISOString(),
        qr_valid_until: validUntil.toISOString(),
        // Induction data
        induction_sent: inductionResult.success,
        induction_id: inductionResult.inductionId,
        induction_error: inductionResult.error,
        video_title: selectedVideo?.title,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error onboarding worker:', error);
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
    ar: `مرحباً ${workerName}،\n\nمطلوب منك إكمال فيديو السلامة التالي قبل بدء العمل في مشروع ${projectName}:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} دقيقة\n🔗 ${videoUrl}\n\nيرجى مشاهدة الفيديو والموافقة على شروط السلامة.`,
    ur: `السلام علیکم ${workerName}،\n\nآپ کو ${projectName} پروجیکٹ میں کام شروع کرنے سے پہلے درج ذیل حفاظتی ویڈیو مکمل کرنی ہوگی:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} منٹ\n🔗 ${videoUrl}\n\nبراہ کرم ویڈیو دیکھیں اور حفاظتی شرائط سے اتفاق کریں۔`,
    hi: `नमस्ते ${workerName},\n\n${projectName} प्रोजेक्ट में काम शुरू करने से पहले आपको निम्नलिखित सुरक्षा वीडियो पूरा करना होगा:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} मिनट\n🔗 ${videoUrl}\n\nकृपया वीडियो देखें और सुरक्षा शर्तों से सहमत हों।`,
    fil: `Kumusta ${workerName},\n\nKailangan mong kumpletuhin ang sumusunod na safety video bago magsimula ng trabaho sa ${projectName} project:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} minuto\n🔗 ${videoUrl}\n\nMangyaring panoorin ang video at sumang-ayon sa mga safety terms.`,
    en: `Hello ${workerName},\n\nYou are required to complete the following safety induction video before starting work on ${projectName} project:\n\n📹 ${videoTitle}\n⏱️ ${durationMin} min\n🔗 ${videoUrl}\n\nPlease watch the video and acknowledge the safety terms.`,
  };

  return messages[language] || messages.en;
}

function getQRCodeMessage(
  language: string,
  workerName: string,
  projectName: string,
  accessUrl: string,
  validUntil: Date
): string {
  const expiryDate = validUntil.toLocaleDateString('en-GB');
  
  const messages: Record<string, string> = {
    ar: `✅ ${workerName}، تم إنشاء رمز QR الخاص بك!\n\n🏗️ المشروع: ${projectName}\n\n🔑 رابط الدخول للموقع:\n${accessUrl}\n\n📅 صالح حتى: ${expiryDate}\n\n📱 افتح الرابط وأظهر رمز QR عند البوابة للدخول.`,
    ur: `✅ ${workerName}، آپ کا QR کوڈ تیار ہے!\n\n🏗️ پروجیکٹ: ${projectName}\n\n🔑 سائٹ تک رسائی کا لنک:\n${accessUrl}\n\n📅 درست ہے تک: ${expiryDate}\n\n📱 لنک کھولیں اور گیٹ پر QR کوڈ دکھائیں۔`,
    hi: `✅ ${workerName}, आपका QR कोड तैयार है!\n\n🏗️ प्रोजेक्ट: ${projectName}\n\n🔑 साइट एक्सेस लिंक:\n${accessUrl}\n\n📅 वैध तक: ${expiryDate}\n\n📱 लिंक खोलें और गेट पर QR कोड दिखाएं।`,
    fil: `✅ ${workerName}, handa na ang iyong QR code!\n\n🏗️ Proyekto: ${projectName}\n\n🔑 Site access link:\n${accessUrl}\n\n📅 Valid hanggang: ${expiryDate}\n\n📱 Buksan ang link at ipakita ang QR code sa gate.`,
    en: `✅ ${workerName}, your QR code is ready!\n\n🏗️ Project: ${projectName}\n\n🔑 Site Access Link:\n${accessUrl}\n\n📅 Valid until: ${expiryDate}\n\n📱 Open the link and show the QR code at the gate for entry.`,
  };

  return messages[language] || messages.en;
}
