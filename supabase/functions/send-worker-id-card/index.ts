import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendIdCardRequest {
  worker_id: string;
  project_id: string;
  qr_token: string;
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

    const body: SendIdCardRequest = await req.json();
    const { worker_id, project_id, qr_token, tenant_id } = body;

    console.log('[SendWorkerIdCard] Request:', { worker_id, project_id, qr_token });

    if (!worker_id || !project_id || !qr_token || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch worker details
    const { data: worker, error: workerError } = await supabase
      .from('contractor_workers')
      .select('id, full_name, full_name_ar, phone_number, email, preferred_language')
      .eq('id', worker_id)
      .is('deleted_at', null)
      .single();

    if (workerError || !worker) {
      console.error('[SendWorkerIdCard] Worker not found:', workerError);
      return new Response(
        JSON.stringify({ error: 'Worker not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('contractor_projects')
      .select('project_name')
      .eq('id', project_id)
      .is('deleted_at', null)
      .single();

    if (projectError) {
      console.error('[SendWorkerIdCard] Project fetch error:', projectError);
    }

    // Fetch tenant branding
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, hsse_department_name, hsse_department_name_ar')
      .eq('id', tenant_id)
      .single();

    if (tenantError) {
      console.error('[SendWorkerIdCard] Tenant fetch error:', tenantError);
    }

    const idCardUrl = `https://www.dhuud.com/worker-access/${qr_token}`;
    const isArabic = worker.preferred_language === 'ar';
    const workerName = isArabic ? (worker.full_name_ar || worker.full_name) : worker.full_name;
    const tenantName = tenant?.name || '';
    const hsseDept = isArabic 
      ? (tenant?.hsse_department_name_ar || tenant?.hsse_department_name || 'HSSE Department')
      : (tenant?.hsse_department_name || 'HSSE Department');
    const projectName = project?.project_name || '';

    let whatsappSent = false;
    let emailSent = false;

    // Send via WhatsApp if phone number exists
    if (worker.phone_number) {
      try {
        const wasenderApiKey = Deno.env.get('WASENDER_API_KEY');
        if (wasenderApiKey) {
          // Format phone number
          let phone = worker.phone_number.replace(/[\s\-\(\)]/g, '');
          if (!phone.startsWith('+')) {
            if (phone.startsWith('0')) {
              phone = '+966' + phone.substring(1);
            } else if (!phone.startsWith('966')) {
              phone = '+966' + phone;
            } else {
              phone = '+' + phone;
            }
          }

          const message = isArabic
            ? `مرحباً ${workerName}! 🎉\n\nتم إكمال تدريب السلامة بنجاح.\n\n🆔 *بطاقة هوية العامل*\nالمنشأة: ${tenantName}\nالقسم: ${hsseDept}\nالمشروع: ${projectName}\n\n📱 رابط بطاقة الهوية:\n${idCardUrl}\n\nيرجى حفظ هذا الرابط وإظهار رمز QR عند البوابة.`
            : `Hello ${workerName}! 🎉\n\nYour safety induction has been completed successfully.\n\n🆔 *Worker ID Card*\nFacility: ${tenantName}\nDepartment: ${hsseDept}\nProject: ${projectName}\n\n📱 ID Card Link:\n${idCardUrl}\n\nPlease save this link and show the QR code at the gate.`;

          const response = await fetch('https://api.wasender.net/v1/messages/send-text', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${wasenderApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: phone,
              message: message,
            }),
          });

          if (response.ok) {
            whatsappSent = true;
            console.log('[SendWorkerIdCard] WhatsApp sent successfully to:', phone);
          } else {
            const errorText = await response.text();
            console.error('[SendWorkerIdCard] WhatsApp send error:', errorText);
          }
        }
      } catch (waErr) {
        console.error('[SendWorkerIdCard] WhatsApp error:', waErr);
      }
    }

    // Send via Email if email exists
    if (worker.email) {
      try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@dhuud.com';
        
        if (resendApiKey) {
          const subject = isArabic
            ? `بطاقة هوية العامل - ${tenantName}`
            : `Worker ID Card - ${tenantName}`;

          const htmlContent = isArabic
            ? `
              <div dir="rtl" style="font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #1a1a1a; text-align: center;">✅ تم إكمال تدريب السلامة</h1>
                <p>مرحباً ${workerName}،</p>
                <p>تهانينا! لقد أكملت تدريب السلامة بنجاح.</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin-top: 0;">🆔 بطاقة هوية العامل</h2>
                  <p><strong>المنشأة:</strong> ${tenantName}</p>
                  <p><strong>القسم:</strong> ${hsseDept}</p>
                  <p><strong>المشروع:</strong> ${projectName}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${idCardUrl}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">عرض بطاقة الهوية</a>
                </div>
                <p style="color: #666; font-size: 14px;">يرجى حفظ هذا الرابط وإظهار رمز QR عند البوابة للدخول.</p>
              </div>
            `
            : `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #1a1a1a; text-align: center;">✅ Safety Induction Completed</h1>
                <p>Hello ${workerName},</p>
                <p>Congratulations! You have successfully completed your safety induction.</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin-top: 0;">🆔 Worker ID Card</h2>
                  <p><strong>Facility:</strong> ${tenantName}</p>
                  <p><strong>Department:</strong> ${hsseDept}</p>
                  <p><strong>Project:</strong> ${projectName}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${idCardUrl}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View ID Card</a>
                </div>
                <p style="color: #666; font-size: 14px;">Please save this link and show the QR code at the gate for entry.</p>
              </div>
            `;

          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${tenantName || 'HSSE'} <${fromEmail}>`,
              to: [worker.email],
              subject: subject,
              html: htmlContent,
            }),
          });

          if (response.ok) {
            emailSent = true;
            console.log('[SendWorkerIdCard] Email sent successfully to:', worker.email);
          } else {
            const errorText = await response.text();
            console.error('[SendWorkerIdCard] Email send error:', errorText);
          }
        }
      } catch (emailErr) {
        console.error('[SendWorkerIdCard] Email error:', emailErr);
      }
    }

    // Log notification
    await supabase.from('notification_logs').insert({
      tenant_id: tenant_id,
      channel: whatsappSent ? 'whatsapp' : (emailSent ? 'email' : 'none'),
      recipient: worker.phone_number || worker.email || worker_id,
      message_type: 'worker_id_card',
      status: (whatsappSent || emailSent) ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
      metadata: {
        worker_id,
        project_id,
        qr_token,
        id_card_url: idCardUrl,
        whatsapp_sent: whatsappSent,
        email_sent: emailSent,
      },
    });

    console.log('[SendWorkerIdCard] Completed. WhatsApp:', whatsappSent, 'Email:', emailSent);

    return new Response(
      JSON.stringify({
        success: true,
        whatsapp_sent: whatsappSent,
        email_sent: emailSent,
        id_card_url: idCardUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[SendWorkerIdCard] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
