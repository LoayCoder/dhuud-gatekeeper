import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpiringDocument {
  id: string;
  tenant_id: string;
  title: string;
  document_type: string;
  expiry_date: string;
  expiry_warning_sent_at: string | null;
  asset: Array<{
    id: string;
    name: string;
    asset_code: string;
  }>;
}

interface ExpiringWarrantyAsset {
  id: string;
  tenant_id: string;
  name: string;
  asset_code: string;
  warranty_expiry_date: string;
  warranty_warning_sent_at: string | null;
}

async function sendWhatsAppNotification(phone: string, message: string): Promise<void> {
  const wasenderKey = Deno.env.get('WASENDER_API_KEY');
  if (!wasenderKey || !phone) return;

  try {
    const response = await fetch('https://api.wasender.net/v1/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${wasenderKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone.replace(/[^0-9]/g, ''),
        type: 'text',
        text: { body: message },
      }),
    });
    console.log(`WhatsApp sent to ${phone}:`, await response.text());
  } catch (error) {
    console.error('WhatsApp error:', error);
  }
}

async function sendEmailNotification(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email-template`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px;">${body.replace(/\n/g, '<br>')}</div>`,
      }),
    });
    console.log(`Email sent to ${to}:`, await response.text());
  } catch (error) {
    console.error('Email error:', error);
  }
}

function interpolateTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Starting asset expiry alerts check...');

  try {
    const now = new Date();
    const warningThresholdDays = 30; // Warn 30 days before expiry
    const warningDate = new Date(now);
    warningDate.setDate(warningDate.getDate() + warningThresholdDays);

    let documentAlertsSent = 0;
    let warrantyAlertsSent = 0;

    // Get notification templates
    const { data: templates } = await supabase
      .from('notification_templates')
      .select('id, slug, content_pattern, email_subject, tenant_id')
      .in('slug', ['asset_document_expiring', 'asset_warranty_expiring']);

    // =====================
    // Check Document Expiry
    // =====================
    const { data: expiringDocs, error: docError } = await supabase
      .from('asset_documents')
      .select(`
        id,
        tenant_id,
        title,
        document_type,
        expiry_date,
        expiry_warning_sent_at,
        asset:hsse_assets(
          id,
          name,
          asset_code
        )
      `)
      .is('deleted_at', null)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', warningDate.toISOString().split('T')[0])
      .gte('expiry_date', now.toISOString().split('T')[0])
      .is('expiry_warning_sent_at', null);

    if (docError) {
      console.error('Error fetching expiring documents:', docError);
    } else {
      console.log(`Found ${expiringDocs?.length || 0} expiring documents`);

      for (const doc of (expiringDocs || []) as ExpiringDocument[]) {
        const asset = doc.asset?.[0];
        if (!asset) continue;

        // Get HSSE managers for this tenant
        const { data: managers } = await supabase
          .from('profiles')
          .select('id, email, phone_number')
          .eq('tenant_id', doc.tenant_id)
          .eq('is_active', true)
          .or('user_type.eq.hsse_manager,user_type.eq.hsse_officer');

        const template = templates?.find(
          (t) => t.slug === 'asset_document_expiring' && t.tenant_id === doc.tenant_id
        );

        const variables = {
          document_title: doc.title,
          asset_name: asset.name,
          asset_code: asset.asset_code,
          expiry_date: new Date(doc.expiry_date).toLocaleDateString(),
        };

        const message = template
          ? interpolateTemplate(template.content_pattern, variables)
          : `Document "${doc.title}" for ${asset.name} expires on ${variables.expiry_date}`;

        const subject = template
          ? interpolateTemplate(template.email_subject || 'Document Expiring', variables)
          : `Document Expiring: ${doc.title}`;

        console.log(`Sending expiry alert for document ${doc.id}`);

        for (const manager of managers || []) {
          if (manager.email) {
            await sendEmailNotification(manager.email, subject, message);
          }
          if (manager.phone_number) {
            await sendWhatsAppNotification(manager.phone_number, message);
          }
        }

        await supabase
          .from('asset_documents')
          .update({ expiry_warning_sent_at: new Date().toISOString() })
          .eq('id', doc.id);

        documentAlertsSent++;
      }
    }

    // =====================
    // Check Warranty Expiry
    // =====================
    const { data: expiringWarranties, error: warrantyError } = await supabase
      .from('hsse_assets')
      .select(`
        id,
        tenant_id,
        name,
        asset_code,
        warranty_expiry_date,
        warranty_warning_sent_at
      `)
      .is('deleted_at', null)
      .not('warranty_expiry_date', 'is', null)
      .lte('warranty_expiry_date', warningDate.toISOString().split('T')[0])
      .gte('warranty_expiry_date', now.toISOString().split('T')[0])
      .is('warranty_warning_sent_at', null);

    if (warrantyError) {
      console.error('Error fetching expiring warranties:', warrantyError);
    } else {
      console.log(`Found ${expiringWarranties?.length || 0} expiring warranties`);

      for (const asset of (expiringWarranties as ExpiringWarrantyAsset[]) || []) {
        // Get HSSE managers for this tenant
        const { data: managers } = await supabase
          .from('profiles')
          .select('id, email, phone_number')
          .eq('tenant_id', asset.tenant_id)
          .eq('is_active', true)
          .or('user_type.eq.hsse_manager,user_type.eq.hsse_officer');

        const template = templates?.find(
          (t) => t.slug === 'asset_warranty_expiring' && t.tenant_id === asset.tenant_id
        );

        const variables = {
          asset_name: asset.name,
          asset_code: asset.asset_code,
          warranty_expiry_date: new Date(asset.warranty_expiry_date).toLocaleDateString(),
        };

        const message = template
          ? interpolateTemplate(template.content_pattern, variables)
          : `Warranty for ${asset.name} (${asset.asset_code}) expires on ${variables.warranty_expiry_date}`;

        const subject = template
          ? interpolateTemplate(template.email_subject || 'Warranty Expiring', variables)
          : `Warranty Expiring: ${asset.name}`;

        console.log(`Sending warranty expiry alert for asset ${asset.id}`);

        for (const manager of managers || []) {
          if (manager.email) {
            await sendEmailNotification(manager.email, subject, message);
          }
          if (manager.phone_number) {
            await sendWhatsAppNotification(manager.phone_number, message);
          }
        }

        await supabase
          .from('hsse_assets')
          .update({ warranty_warning_sent_at: new Date().toISOString() })
          .eq('id', asset.id);

        warrantyAlertsSent++;
      }
    }

    // =====================
    // Check Insurance Expiry
    // =====================
    let insuranceAlertsSent = 0;
    const { data: expiringInsurance, error: insuranceError } = await supabase
      .from('hsse_assets')
      .select(`
        id,
        tenant_id,
        name,
        asset_code,
        insurance_policy_number,
        insurance_expiry_date
      `)
      .is('deleted_at', null)
      .not('insurance_expiry_date', 'is', null)
      .lte('insurance_expiry_date', warningDate.toISOString().split('T')[0])
      .gte('insurance_expiry_date', now.toISOString().split('T')[0]);

    if (insuranceError) {
      console.error('Error fetching expiring insurance:', insuranceError);
    } else {
      console.log(`Found ${expiringInsurance?.length || 0} assets with expiring insurance`);

      // Note: Insurance alerts could be added with a separate tracking column if needed
      insuranceAlertsSent = expiringInsurance?.length || 0;
    }

    console.log(`Completed: ${documentAlertsSent} document alerts, ${warrantyAlertsSent} warranty alerts`);

    return new Response(
      JSON.stringify({
        success: true,
        document_alerts_sent: documentAlertsSent,
        warranty_alerts_sent: warrantyAlertsSent,
        insurance_expiring_count: insuranceAlertsSent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in asset-expiry-alerts:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
