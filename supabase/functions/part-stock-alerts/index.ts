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

interface NotificationPreference {
  user_id: string;
  tenant_id: string;
  low_stock_email: boolean;
  low_stock_whatsapp: boolean;
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

    console.log('Starting part stock alerts check with user preferences...');

    // Get all user notification preferences for low stock alerts
    const { data: preferences, error: prefError } = await supabase
      .from('asset_notification_preferences')
      .select('user_id, tenant_id, low_stock_email, low_stock_whatsapp')
      .or('low_stock_email.eq.true,low_stock_whatsapp.eq.true');

    if (prefError) {
      console.error('Error fetching notification preferences:', prefError);
      throw prefError;
    }

    console.log(`Found ${preferences?.length || 0} users with low stock alert preferences enabled`);

    if (!preferences || preferences.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No users have low stock notifications enabled', alertsCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique tenant IDs
    const tenantIds = [...new Set(preferences.map(p => p.tenant_id))];

    // Get all parts where current_stock <= minimum_stock for these tenants
    const { data: allParts, error: partsError } = await supabase
      .from('maintenance_parts')
      .select('id, name, part_number, current_stock, minimum_stock, tenant_id')
      .in('tenant_id', tenantIds)
      .filter('deleted_at', 'is', null)
      .filter('is_active', 'eq', true);

    if (partsError) {
      console.error('Error fetching parts:', partsError);
      throw partsError;
    }

    // Filter to only parts that are low on stock
    const lowStockParts: LowStockPart[] = (allParts || []).filter(
      (part: LowStockPart) => part.current_stock <= part.minimum_stock
    );

    console.log(`Found ${lowStockParts.length} parts with low stock`);

    if (lowStockParts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No low stock alerts needed', alertsCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group parts by tenant
    const partsByTenant = lowStockParts.reduce((acc, part) => {
      if (!acc[part.tenant_id]) {
        acc[part.tenant_id] = [];
      }
      acc[part.tenant_id].push(part);
      return acc;
    }, {} as Record<string, LowStockPart[]>);

    // Group preferences by tenant
    const prefsByTenant = preferences.reduce((acc, pref) => {
      if (!acc[pref.tenant_id]) {
        acc[pref.tenant_id] = [];
      }
      acc[pref.tenant_id].push(pref);
      return acc;
    }, {} as Record<string, NotificationPreference[]>);

    let alertsSent = 0;

    // For each tenant with low stock parts
    for (const [tenantId, parts] of Object.entries(partsByTenant)) {
      const tenantPrefs = prefsByTenant[tenantId];
      if (!tenantPrefs || tenantPrefs.length === 0) continue;

      // For each user with preferences in this tenant
      for (const pref of tenantPrefs) {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', pref.user_id)
          .single();

        if (profileError || !profile?.email) {
          console.error(`Error fetching profile for user ${pref.user_id}:`, profileError);
          continue;
        }

        // Build alert message
        if (pref.low_stock_email) {
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
            <p>Hello ${profile.full_name || 'User'},</p>
            <p>The following maintenance parts are running low on stock:</p>
            <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: start;">Part Number</th>
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: start;">Name</th>
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: start;">Current Stock</th>
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: start;">Minimum Stock</th>
                </tr>
              </thead>
              <tbody>
                ${partsListHtml}
              </tbody>
            </table>
            <p style="margin-top: 16px;">Please review and reorder these parts as needed.</p>
          `;

          // Queue email
          const { error: emailError } = await supabase
            .from('email_queue')
            .insert({
              tenant_id: tenantId,
              to_email: profile.email,
              subject: `⚠️ Low Stock Alert: ${parts.length} parts need reordering`,
              html_content: emailHtml,
              email_type: 'part_stock_alert',
              priority: parts.some(p => p.current_stock === 0) ? 'high' : 'normal',
              status: 'pending'
            });

          if (emailError) {
            console.error(`Error queuing email for ${profile.email}:`, emailError);
          } else {
            alertsSent++;
            console.log(`Queued low stock alert email for ${profile.email}`);
          }
        }
      }
    }

    console.log(`Part stock alerts completed. Sent ${alertsSent} alerts.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${lowStockParts.length} low stock parts`,
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
