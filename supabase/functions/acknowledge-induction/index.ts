import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcknowledgeRequest {
  inductionId?: string;
  induction_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AcknowledgeRequest = await req.json();
    const inductionId = body.inductionId || body.induction_id;

    console.log('[AcknowledgeInduction] Request for:', inductionId);

    if (!inductionId) {
      return new Response(
        JSON.stringify({ error: 'Missing induction ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch induction to verify it exists and is valid
    const { data: induction, error: fetchError } = await supabase
      .from('worker_inductions')
      .select(`
        id,
        status,
        acknowledged_at,
        expires_at,
        worker_id,
        video_id,
        project_id,
        tenant_id,
        worker:contractor_workers(
          id,
          full_name,
          phone_number,
          email,
          approval_status
        )
      `)
      .eq('id', inductionId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !induction) {
      console.error('[AcknowledgeInduction] Not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Induction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already acknowledged
    if (induction.acknowledged_at) {
      console.log('[AcknowledgeInduction] Already acknowledged');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Already acknowledged',
          acknowledged_at: induction.acknowledged_at 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    const expiresAt = new Date(induction.expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This induction has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    const worker = induction.worker as any;

    // Update induction record
    const { error: updateError } = await supabase
      .from('worker_inductions')
      .update({
        acknowledged_at: now,
        acknowledgment_method: 'web',
        status: 'completed',
        updated_at: now,
      })
      .eq('id', inductionId);

    if (updateError) {
      console.error('[AcknowledgeInduction] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save acknowledgment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to audit table
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id: induction.tenant_id,
      entity_type: 'worker_induction',
      entity_id: induction.worker_id,
      action: 'induction_acknowledged',
      new_value: {
        induction_id: inductionId,
        video_id: induction.video_id,
        project_id: induction.project_id,
        acknowledged_at: now,
        acknowledgment_method: 'web',
      },
    });

    console.log('[AcknowledgeInduction] Success for worker:', worker?.full_name);

    // Generate QR code and send ID card
    let idCardResult: { success: boolean; qr_token?: string; id_card_url?: string; error?: string } = { success: false };
    
    // Only generate ID card for approved workers
    if (worker?.approval_status === 'approved') {
      try {
        console.log('[AcknowledgeInduction] Generating QR code for approved worker:', worker.id);
        
        // Generate worker QR code
        const { data: qrData, error: qrError } = await supabase
          .from('worker_qr_codes')
          .select('qr_token')
          .eq('worker_id', worker.id)
          .eq('project_id', induction.project_id)
          .eq('is_revoked', false)
          .is('deleted_at', null)
          .gte('valid_until', now)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let qrToken = qrData?.qr_token;

        // If no valid QR exists, create one
        if (!qrToken) {
          const validDays = 30; // Default validity
          const validUntil = new Date();
          validUntil.setDate(validUntil.getDate() + validDays);

          const { data: newQr, error: createQrError } = await supabase
            .from('worker_qr_codes')
            .insert({
              worker_id: worker.id,
              project_id: induction.project_id,
              tenant_id: induction.tenant_id,
              valid_until: validUntil.toISOString(),
              is_revoked: false,
            })
            .select('qr_token')
            .single();

          if (createQrError) {
            console.error('[AcknowledgeInduction] QR creation error:', createQrError);
          } else {
            qrToken = newQr?.qr_token;
            console.log('[AcknowledgeInduction] Created new QR token:', qrToken);

            // Log QR generation
            await supabase.from('contractor_module_audit_logs').insert({
              tenant_id: induction.tenant_id,
              entity_type: 'worker_qr_code',
              entity_id: worker.id,
              action: 'qr_generated_post_induction',
              new_value: {
                qr_token: qrToken,
                project_id: induction.project_id,
                induction_id: inductionId,
                generated_at: now,
              },
            });
          }
        }

        if (qrToken) {
          const idCardUrl = `https://www.dhuud.com/worker-access/${qrToken}`;
          idCardResult = { success: true, qr_token: qrToken, id_card_url: idCardUrl };
          
          console.log('[AcknowledgeInduction] ID card URL:', idCardUrl);

          // Send ID card via edge function
          try {
            const { error: sendError } = await supabase.functions.invoke('send-worker-id-card', {
              body: {
                worker_id: worker.id,
                project_id: induction.project_id,
                qr_token: qrToken,
                tenant_id: induction.tenant_id,
              }
            });

            if (sendError) {
              console.error('[AcknowledgeInduction] Send ID card error:', sendError);
            } else {
              console.log('[AcknowledgeInduction] ID card sent successfully');
            }
          } catch (sendErr) {
            console.error('[AcknowledgeInduction] Failed to invoke send-worker-id-card:', sendErr);
          }
        }
      } catch (qrErr) {
        console.error('[AcknowledgeInduction] QR generation error:', qrErr);
        idCardResult.error = qrErr instanceof Error ? qrErr.message : 'Failed to generate ID card';
      }
    } else {
      console.log('[AcknowledgeInduction] Worker not approved, skipping ID card generation');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Induction acknowledged successfully',
        acknowledged_at: now,
        id_card: idCardResult.success ? {
          url: idCardResult.id_card_url,
          qr_token: idCardResult.qr_token,
        } : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[AcknowledgeInduction] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
