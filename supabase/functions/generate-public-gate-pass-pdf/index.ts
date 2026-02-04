import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @deno-types="https://esm.sh/v128/@types/pdfmake@0.2.7/build/pdfmake.d.ts"
import pdfMake from "https://esm.sh/pdfmake@0.2.7/build/pdfmake.min.js";
import pdfFonts from "https://esm.sh/pdfmake@0.2.7/build/vfs_fonts.js";
import QRCode from "https://esm.sh/qrcode@1.5.3";

// Initialize pdfMake with fonts
pdfMake.vfs = pdfFonts.pdfMake.vfs;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const tenantSlug = url.searchParams.get('tenant');

    if (!token || !tenantSlug) {
      return new Response(
        JSON.stringify({ error: 'Missing token or tenant parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug, logo_url, brand_color')
      .eq('slug', tenantSlug)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get gate pass by token
    const { data: gatePass, error: passError } = await supabase
      .from('material_gate_passes')
      .select(`
        *,
        branch:branches(name, location, address)
      `)
      .eq('tenant_id', tenant.id)
      .eq('public_access_token', token)
      .eq('is_public_request', true)
      .is('deleted_at', null)
      .single();

    if (passError || !gatePass) {
      return new Response(
        JSON.stringify({ error: 'Gate pass not found or expired' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow PDF download for approved passes
    if (gatePass.status !== 'approved' && gatePass.status !== 'used' && gatePass.status !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'Gate pass is not yet approved' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate QR code as data URL
    const qrContent = `GATE_PASS:${gatePass.id}:${token}`;
    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'H',
    });

    // Format date
    const passDate = new Date(gatePass.pass_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Time window
    const timeWindow = gatePass.time_window_start
      ? `${gatePass.time_window_start}${gatePass.time_window_end ? ' - ' + gatePass.time_window_end : ''}`
      : 'Full Day';

    // Pass type label
    const passTypeLabels: Record<string, string> = {
      'in': 'Entry Only',
      'out': 'Exit Only',
      'in_out': 'Entry & Exit',
    };
    const passTypeLabel = passTypeLabels[gatePass.pass_type] || gatePass.pass_type;

    // Build PDF document definition
    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: [
        // Header with tenant branding
        {
          columns: [
            tenant.logo_url
              ? { image: tenant.logo_url, width: 100 }
              : { text: tenant.name, style: 'tenantName' },
            {
              text: 'MATERIAL GATE PASS',
              style: 'header',
              alignment: 'right',
            },
          ],
        },
        { text: '', margin: [0, 20] },

        // Reference and Status Bar
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                { text: `Reference: ${gatePass.reference_number}`, style: 'reference', alignment: 'left' },
                {
                  text: gatePass.status.toUpperCase(),
                  style: 'statusApproved',
                  alignment: 'right',
                },
              ],
            ],
          },
          layout: 'noBorders',
        },
        { text: '', margin: [0, 15] },

        // Main content in two columns
        {
          columns: [
            // Left column - Pass details
            {
              width: '60%',
              stack: [
                { text: 'REQUESTER INFORMATION', style: 'sectionTitle' },
                {
                  table: {
                    widths: [100, '*'],
                    body: [
                      [{ text: 'Name:', style: 'label' }, { text: gatePass.public_requester_name, style: 'value' }],
                      [{ text: 'Phone:', style: 'label' }, { text: gatePass.public_requester_phone, style: 'value' }],
                      ...(gatePass.public_requester_company
                        ? [[{ text: 'Company:', style: 'label' }, { text: gatePass.public_requester_company, style: 'value' }]]
                        : []),
                    ],
                  },
                  layout: 'noBorders',
                  margin: [0, 5, 0, 15],
                },

                { text: 'PASS DETAILS', style: 'sectionTitle' },
                {
                  table: {
                    widths: [100, '*'],
                    body: [
                      [{ text: 'Date:', style: 'label' }, { text: passDate, style: 'value' }],
                      [{ text: 'Time:', style: 'label' }, { text: timeWindow, style: 'value' }],
                      [{ text: 'Type:', style: 'label' }, { text: passTypeLabel, style: 'value' }],
                      ...(gatePass.branch
                        ? [[{ text: 'Location:', style: 'label' }, { text: `${gatePass.branch.name}${gatePass.branch.location ? ' - ' + gatePass.branch.location : ''}`, style: 'value' }]]
                        : []),
                    ],
                  },
                  layout: 'noBorders',
                  margin: [0, 5, 0, 15],
                },

                { text: 'MATERIALS', style: 'sectionTitle' },
                {
                  table: {
                    widths: ['*'],
                    body: [
                      [{ text: gatePass.material_description, style: 'materialDescription' }],
                      ...(gatePass.quantity
                        ? [[{ text: `Quantity: ${gatePass.quantity}`, style: 'quantity' }]]
                        : []),
                    ],
                  },
                  layout: 'noBorders',
                  margin: [0, 5, 0, 15],
                },

                ...(gatePass.vehicle_plate || gatePass.driver_name
                  ? [
                      { text: 'VEHICLE & DRIVER', style: 'sectionTitle' },
                      {
                        table: {
                          widths: [100, '*'],
                          body: [
                            ...(gatePass.vehicle_plate
                              ? [[{ text: 'Vehicle:', style: 'label' }, { text: gatePass.vehicle_plate, style: 'value' }]]
                              : []),
                            ...(gatePass.driver_name
                              ? [[{ text: 'Driver:', style: 'label' }, { text: gatePass.driver_name, style: 'value' }]]
                              : []),
                            ...(gatePass.driver_mobile
                              ? [[{ text: 'Mobile:', style: 'label' }, { text: gatePass.driver_mobile, style: 'value' }]]
                              : []),
                          ],
                        },
                        layout: 'noBorders',
                        margin: [0, 5, 0, 15],
                      },
                    ]
                  : []),
              ],
            },

            // Right column - QR Code
            {
              width: '40%',
              stack: [
                { text: 'SCAN AT GATE', style: 'qrTitle', alignment: 'center' },
                {
                  image: qrDataUrl,
                  width: 150,
                  alignment: 'center',
                  margin: [0, 10],
                },
                { text: gatePass.reference_number, style: 'qrReference', alignment: 'center' },
              ],
              margin: [20, 0, 0, 0],
            },
          ],
        },

        // Footer instructions
        { text: '', margin: [0, 30] },
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: 'IMPORTANT: Present this pass at the security gate. This pass is valid only for the date and time shown above.',
                  style: 'footer',
                  alignment: 'center',
                  fillColor: '#f5f5f5',
                  margin: [10, 10],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
          },
        },
      ],
      styles: {
        tenantName: {
          fontSize: 18,
          bold: true,
          color: '#1a1a1a',
        },
        header: {
          fontSize: 16,
          bold: true,
          color: '#333333',
        },
        reference: {
          fontSize: 12,
          bold: true,
        },
        statusApproved: {
          fontSize: 14,
          bold: true,
          color: '#22c55e',
        },
        sectionTitle: {
          fontSize: 10,
          bold: true,
          color: '#666666',
          margin: [0, 10, 0, 5],
        },
        label: {
          fontSize: 10,
          color: '#666666',
        },
        value: {
          fontSize: 11,
          color: '#1a1a1a',
        },
        materialDescription: {
          fontSize: 11,
          color: '#1a1a1a',
        },
        quantity: {
          fontSize: 10,
          color: '#666666',
          italics: true,
        },
        qrTitle: {
          fontSize: 11,
          bold: true,
          color: '#333333',
        },
        qrReference: {
          fontSize: 10,
          color: '#666666',
        },
        footer: {
          fontSize: 9,
          color: '#666666',
        },
      },
      defaultStyle: {
        font: 'Roboto',
      },
    };

    // Generate PDF
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);

    const pdfBuffer = await new Promise<Uint8Array>((resolve, reject) => {
      pdfDocGenerator.getBuffer((buffer: Uint8Array) => {
        if (buffer) {
          resolve(buffer);
        } else {
          reject(new Error('Failed to generate PDF buffer'));
        }
      });
    });

    // Return PDF
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="gate-pass-${gatePass.reference_number}.pdf"`,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-public-gate-pass-pdf] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
