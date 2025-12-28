import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssetWithWarranty {
  id: string;
  asset_code: string;
  name: string;
  warranty_expiry_date: string;
  tenant_id: string;
  warranty_provider?: string;
  warranty_terms?: string;
}

interface NotificationPreference {
  user_id: string;
  tenant_id: string;
  warranty_expiry_email: boolean;
  warranty_expiry_whatsapp: boolean;
  warranty_expiry_days_before: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting asset warranty alerts check with user preferences...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();

    // Get all user notification preferences for warranty alerts
    const { data: preferences, error: prefError } = await supabase
      .from('asset_notification_preferences')
      .select('user_id, tenant_id, warranty_expiry_email, warranty_expiry_whatsapp, warranty_expiry_days_before')
      .or('warranty_expiry_email.eq.true,warranty_expiry_whatsapp.eq.true');

    if (prefError) {
      console.error('Error fetching notification preferences:', prefError);
      throw prefError;
    }

    console.log(`Found ${preferences?.length || 0} users with warranty alert preferences enabled`);

    const results = {
      processed: 0,
      emailsQueued: 0,
      whatsappQueued: 0,
      expiringSoon: [] as string[],
      expiringCritical: [] as string[],
    };

    if (!preferences || preferences.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No users have warranty notifications enabled',
        results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Group preferences by tenant for efficient querying
    const prefsByTenant = preferences.reduce((acc, pref) => {
      if (!acc[pref.tenant_id]) {
        acc[pref.tenant_id] = [];
      }
      acc[pref.tenant_id].push(pref);
      return acc;
    }, {} as Record<string, NotificationPreference[]>);

    // Process each tenant
    for (const [tenantId, tenantPrefs] of Object.entries(prefsByTenant)) {
      // Get the max days_before for this tenant to find all relevant assets
      const maxDaysBefore = Math.max(...tenantPrefs.map(p => p.warranty_expiry_days_before || 30));
      const warningDate = new Date(today);
      warningDate.setDate(warningDate.getDate() + maxDaysBefore);

      // Find assets with warranties expiring within the max window
      const { data: expiringAssets, error: assetsError } = await supabase
        .from('hsse_assets')
        .select('id, asset_code, name, warranty_expiry_date, tenant_id, warranty_provider, warranty_terms')
        .eq('tenant_id', tenantId)
        .not('warranty_expiry_date', 'is', null)
        .gte('warranty_expiry_date', today.toISOString().split('T')[0])
        .lte('warranty_expiry_date', warningDate.toISOString().split('T')[0])
        .is('deleted_at', null) as { data: AssetWithWarranty[] | null; error: Error | null };

      if (assetsError) {
        console.error(`Error fetching assets for tenant ${tenantId}:`, assetsError);
        continue;
      }

      if (!expiringAssets || expiringAssets.length === 0) {
        continue;
      }

      console.log(`Found ${expiringAssets.length} expiring assets for tenant ${tenantId}`);

      // For each user preference in this tenant
      for (const pref of tenantPrefs) {
        // Filter assets based on user's days_before preference
        const userWarningDate = new Date(today);
        userWarningDate.setDate(userWarningDate.getDate() + (pref.warranty_expiry_days_before || 30));

        const relevantAssets = expiringAssets.filter(asset => {
          const expiryDate = new Date(asset.warranty_expiry_date);
          return expiryDate <= userWarningDate;
        });

        if (relevantAssets.length === 0) continue;

        // Get user email
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', pref.user_id)
          .single();

        if (profileError || !profile?.email) {
          console.error(`Error fetching profile for user ${pref.user_id}:`, profileError);
          continue;
        }

        // Categorize assets
        const criticalAssets = relevantAssets.filter(a => {
          const daysUntil = Math.ceil((new Date(a.warranty_expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntil <= 7;
        });

        const warningAssets = relevantAssets.filter(a => {
          const daysUntil = Math.ceil((new Date(a.warranty_expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntil > 7;
        });

        results.expiringSoon.push(...warningAssets.map(a => a.asset_code));
        results.expiringCritical.push(...criticalAssets.map(a => a.asset_code));

        // Build email content
        if (pref.warranty_expiry_email) {
          const assetsHtml = relevantAssets.map(a => {
            const daysUntil = Math.ceil((new Date(a.warranty_expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const urgencyColor = daysUntil <= 7 ? '#dc2626' : '#f59e0b';
            return `<tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${a.asset_code}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${a.name}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${a.warranty_provider || '-'}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${a.warranty_expiry_date}</td>
              <td style="padding: 8px; border: 1px solid #ddd; color: ${urgencyColor}; font-weight: bold;">${daysUntil} days</td>
            </tr>`;
          }).join('');

          const emailHtml = `
            <h2>⚠️ Asset Warranty Expiry Alert</h2>
            <p>Hello ${profile.full_name || 'User'},</p>
            <p>The following assets have warranties expiring soon:</p>
            <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: start;">Asset Code</th>
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: start;">Name</th>
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: start;">Provider</th>
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: start;">Expiry Date</th>
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: start;">Days Left</th>
                </tr>
              </thead>
              <tbody>
                ${assetsHtml}
              </tbody>
            </table>
            <p style="margin-top: 16px;">Please review and renew these warranties as needed.</p>
          `;

          const { error: emailError } = await supabase
            .from('email_queue')
            .insert({
              tenant_id: tenantId,
              to_email: profile.email,
              subject: `⚠️ Warranty Expiry Alert: ${relevantAssets.length} asset(s) need attention`,
              html_content: emailHtml,
              email_type: 'warranty_expiry_alert',
              priority: criticalAssets.length > 0 ? 'high' : 'normal',
              status: 'pending'
            });

          if (emailError) {
            console.error(`Error queuing email for ${profile.email}:`, emailError);
          } else {
            results.emailsQueued++;
            console.log(`Queued warranty alert email for ${profile.email}`);
          }
        }

        results.processed++;
      }
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        usersProcessed: results.processed,
        emailsQueued: results.emailsQueued,
        whatsappQueued: results.whatsappQueued,
        expiringSoon: results.expiringSoon.length,
        expiringCritical: results.expiringCritical.length,
      },
    };

    console.log('Warranty alerts check completed:', response.summary);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in warranty alerts:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
