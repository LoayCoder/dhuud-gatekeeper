import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LowStockPart {
  id: string;
  name: string;
  part_number: string;
  current_stock: number;
  minimum_stock: number;
  tenant_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting part stock alerts check...');

    // Get all parts where current_stock <= minimum_stock
    const { data: lowStockParts, error: partsError } = await supabase
      .from('maintenance_parts')
      .select('id, name, part_number, current_stock, minimum_stock, tenant_id')
      .filter('deleted_at', 'is', null)
      .filter('is_active', 'eq', true);

    if (partsError) {
      console.error('Error fetching parts:', partsError);
      throw partsError;
    }

    // Filter to only parts that are low on stock
    const alertParts: LowStockPart[] = (lowStockParts || []).filter(
      (part: LowStockPart) => part.current_stock <= part.minimum_stock
    );

    console.log(`Found ${alertParts.length} parts with low stock`);

    if (alertParts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No low stock alerts needed', alertsCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by tenant
    const partsByTenant = alertParts.reduce((acc, part) => {
      if (!acc[part.tenant_id]) {
        acc[part.tenant_id] = [];
      }
      acc[part.tenant_id].push(part);
      return acc;
    }, {} as Record<string, LowStockPart[]>);

    let alertsSent = 0;

    // For each tenant, get HSSE managers and send alerts
    for (const [tenantId, parts] of Object.entries(partsByTenant)) {
      // Get HSSE managers for this tenant
      const { data: hsseManagers, error: managersError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('tenant_id', tenantId)
        .eq('role', 'hsse_manager')
        .filter('deleted_at', 'is', null);

      if (managersError) {
        console.error(`Error fetching HSSE managers for tenant ${tenantId}:`, managersError);
        continue;
      }

      if (!hsseManagers || hsseManagers.length === 0) {
        console.log(`No HSSE managers found for tenant ${tenantId}, skipping`);
        continue;
      }

      // Build alert message
      const partsListHtml = parts.map(p => 
        `<tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${p.part_number}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${p.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd; color: ${p.current_stock === 0 ? 'red' : 'orange'}; font-weight: bold;">${p.current_stock}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${p.minimum_stock}</td>
        </tr>`
      ).join('');

      const emailHtml = `
        <h2>⚠️ Low Stock Alert - Maintenance Parts</h2>
        <p>The following maintenance parts are running low on stock:</p>
        <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Part Number</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Name</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Current Stock</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Minimum Stock</th>
            </tr>
          </thead>
          <tbody>
            ${partsListHtml}
          </tbody>
        </table>
        <p style="margin-top: 16px;">Please review and reorder these parts as needed.</p>
      `;

      // Queue email for each HSSE manager
      for (const manager of hsseManagers) {
        const { error: emailError } = await supabase
          .from('email_queue')
          .insert({
            tenant_id: tenantId,
            to_email: manager.email,
            subject: `⚠️ Low Stock Alert: ${parts.length} parts need reordering`,
            html_content: emailHtml,
            email_type: 'part_stock_alert',
            priority: 'normal',
            status: 'pending'
          });

        if (emailError) {
          console.error(`Error queuing email for ${manager.email}:`, emailError);
        } else {
          alertsSent++;
          console.log(`Queued low stock alert email for ${manager.email}`);
        }
      }
    }

    console.log(`Part stock alerts completed. Sent ${alertsSent} alerts.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${alertParts.length} low stock parts`,
        alertsCount: alertsSent 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in part-stock-alerts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
