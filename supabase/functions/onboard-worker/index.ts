import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendInductionToWorker } from "../_shared/induction-sender.ts";
import { sendWhatsAppText } from "../_shared/whatsapp-provider.ts";
import { sendWaSenderMediaMessage } from "../_shared/wasender-whatsapp.ts";
import { getRenderedTemplate } from "../_shared/template-helper.ts";
import { generateAndUploadQR, getWorkerQRContent } from "../_shared/qr-generator.ts";

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

    const preferredLang = worker.preferred_language || 'ar';

    // ========== STEP 1: SEND INDUCTION VIDEO (via shared module) ==========
    console.log('[Onboard] Step 1: Sending induction video via shared module...');
    
    const inductionResult = await sendInductionToWorker(supabase, {
      workerId: worker_id,
      projectId: project_id,
      videoId: video_id,
      tenantId,
    });

    console.log('[Onboard] Induction result:', inductionResult);

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

    // ========== STEP 3: GENERATE QR IMAGE AND SEND VIA WHATSAPP ==========
    console.log('[Onboard] Step 3: Generating QR image and sending to worker...');

    const qrContent = getWorkerQRContent(qrToken);
    const qrFileName = `${qrToken}.gif`;
    
    const qrUploadResult = await generateAndUploadQR(supabase, qrContent, qrFileName);
    
    let qrWhatsappResult = { success: false, error: 'QR generation failed' as string | undefined };
    const expiryDate = validUntil.toLocaleDateString('en-GB');

    if (qrUploadResult.success && qrUploadResult.publicUrl) {
      const qrTemplateResult = await getRenderedTemplate(supabase, tenantId, 'worker_qr_code_access', {
        worker_name: worker.full_name,
        project_name: project.project_name,
        expiry_date: expiryDate,
      });

      const qrCaption = qrTemplateResult.found 
        ? qrTemplateResult.content
        : getLocalizedQRCaption(preferredLang, worker.full_name, project.project_name, expiryDate);

      const mediaResult = await sendWaSenderMediaMessage(
        worker.mobile_number,
        qrUploadResult.publicUrl,
        qrCaption,
        'image'
      );
      
      qrWhatsappResult = { 
        success: mediaResult.success, 
        error: mediaResult.error 
      };
      
      console.log(`[Onboard] QR image sent: ${mediaResult.success ? 'success' : 'failed'}`);
    } else {
      console.log('[Onboard] QR image generation failed, falling back to link...');
      const appUrl = Deno.env.get('APP_URL') || 'https://www.dhuud.com';
      const accessUrl = `${appUrl}/worker-access/${qrToken}`;
      
      const fallbackMessage = getLocalizedQRLinkMessage(
        preferredLang, worker.full_name, project.project_name, accessUrl, validUntil
      );
      
      const textResult = await sendWhatsAppText(worker.mobile_number, fallbackMessage);
      qrWhatsappResult = { success: textResult.success, error: textResult.error };
    }

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
        qr_image_url: qrUploadResult.publicUrl,
        video_title: inductionResult.videoTitle,
      },
    });

    console.log(`[Onboard] Worker ${worker.full_name} onboarded successfully on project ${project.project_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        worker_name: worker.full_name,
        project_name: project.project_name,
        qr_code_id: qrCode.id,
        qr_token: qrToken,
        qr_valid_from: validFrom.toISOString(),
        qr_valid_until: validUntil.toISOString(),
        qr_image_url: qrUploadResult.publicUrl,
        induction_sent: inductionResult.success,
        induction_id: inductionResult.inductionId,
        induction_error: inductionResult.error,
        video_title: inductionResult.videoTitle,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error onboarding worker:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// QR-specific fallback messages (kept here as they are QR-specific, not induction)

function getLocalizedQRCaption(
  language: string, workerName: string, projectName: string, expiryDate: string
): string {
  const messages: Record<string, string> = {
    ar: `✅ ${workerName}، تم إنشاء رمز QR الخاص بك!\n\n🏗️ المشروع: ${projectName}\n📅 صالح حتى: ${expiryDate}\n\n📱 أظهر رمز QR هذا عند البوابة للدخول.`,
    ur: `✅ ${workerName}، آپ کا QR کوڈ تیار ہے!\n\n🏗️ پروجیکٹ: ${projectName}\n📅 درست ہے تک: ${expiryDate}\n\n📱 گیٹ پر داخلے کے لیے یہ QR کوڈ دکھائیں۔`,
    hi: `✅ ${workerName}, आपका QR कोड तैयार है!\n\n🏗️ प्रोजेक्ट: ${projectName}\n📅 वैध तक: ${expiryDate}\n\n📱 गेट पर प्रवेश के लिए यह QR कोड दिखाएं।`,
    fil: `✅ ${workerName}, handa na ang iyong QR code!\n\n🏗️ Proyekto: ${projectName}\n📅 Valid hanggang: ${expiryDate}\n\n📱 Ipakita ang QR code na ito sa gate para sa pagpasok.`,
    en: `✅ ${workerName}, your QR code is ready!\n\n🏗️ Project: ${projectName}\n📅 Valid until: ${expiryDate}\n\n📱 Show this QR code at the gate for entry.`,
  };
  return messages[language] || messages.ar;
}

function getLocalizedQRLinkMessage(
  language: string, workerName: string, projectName: string, accessUrl: string, validUntil: Date
): string {
  const expiryDate = validUntil.toLocaleDateString('en-GB');
  const messages: Record<string, string> = {
    ar: `✅ ${workerName}، تم إنشاء رمز QR الخاص بك!\n\n🏗️ المشروع: ${projectName}\n\n🔑 رابط الدخول للموقع:\n${accessUrl}\n\n📅 صالح حتى: ${expiryDate}\n\n📱 افتح الرابط وأظهر رمز QR عند البوابة للدخول.`,
    ur: `✅ ${workerName}، آپ کا QR کوڈ تیار ہے!\n\n🏗️ پروجیکٹ: ${projectName}\n\n🔑 سائٹ تک رسائی کا لنک:\n${accessUrl}\n\n📅 درست ہے تک: ${expiryDate}\n\n📱 لنک کھولیں اور گیٹ پر QR کوڈ دکھائیں۔`,
    hi: `✅ ${workerName}, आपका QR कोड तैयार है!\n\n🏗️ प्रोजेक्ट: ${projectName}\n\n🔑 साइट एक्सेस लिंक:\n${accessUrl}\n\n📅 वैध तक: ${expiryDate}\n\n📱 लिंक खोलें और गेट पर QR कोड दिखाएं।`,
    fil: `✅ ${workerName}, handa na ang iyong QR code!\n\n🏗️ Proyekto: ${projectName}\n\n🔑 Site access link:\n${accessUrl}\n\n📅 Valid hanggang: ${expiryDate}\n\n📱 Buksan ang link at ipakita ang QR code sa gate.`,
    en: `✅ ${workerName}, your QR code is ready!\n\n🏗️ Project: ${projectName}\n\n🔑 Site Access Link:\n${accessUrl}\n\n📅 Valid until: ${expiryDate}\n\n📱 Open the link and show the QR code at the gate for entry.`,
  };
  return messages[language] || messages.ar;
}
