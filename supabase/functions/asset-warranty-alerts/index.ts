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

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting asset warranty alerts check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date and dates for warnings
    const today = new Date();
    const warningDate30 = new Date(today);
    warningDate30.setDate(warningDate30.getDate() + 30);
    
    const warningDate7 = new Date(today);
    warningDate7.setDate(warningDate7.getDate() + 7);

    // Find assets with warranties expiring in 30 days
    const { data: expiringAssets, error: assetsError } = await supabase
      .from('hsse_assets')
      .select('id, asset_code, name, warranty_expiry_date, tenant_id, warranty_provider, warranty_terms')
      .not('warranty_expiry_date', 'is', null)
      .gte('warranty_expiry_date', today.toISOString().split('T')[0])
      .lte('warranty_expiry_date', warningDate30.toISOString().split('T')[0])
      .is('deleted_at', null) as { data: AssetWithWarranty[] | null; error: Error | null };

    if (assetsError) {
      console.error('Error fetching expiring warranties:', assetsError);
      throw assetsError;
    }

    console.log(`Found ${expiringAssets?.length || 0} assets with expiring warranties`);

    const results = {
      processed: 0,
      expiringSoon: [] as string[],
      expiringCritical: [] as string[],
    };

    if (expiringAssets && expiringAssets.length > 0) {
      for (const asset of expiringAssets) {
        const expiryDate = new Date(asset.warranty_expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry <= 7) {
          results.expiringCritical.push(asset.asset_code);
          console.log(`CRITICAL: Asset ${asset.asset_code} warranty expires in ${daysUntilExpiry} days`);
        } else if (daysUntilExpiry <= 30) {
          results.expiringSoon.push(asset.asset_code);
          console.log(`WARNING: Asset ${asset.asset_code} warranty expires in ${daysUntilExpiry} days`);
        }

        results.processed++;
      }
    }

    // Find assets with already expired warranties (for reporting)
    const { data: expiredAssets, error: expiredError } = await supabase
      .from('hsse_assets')
      .select('id, asset_code, name, warranty_expiry_date, tenant_id')
      .not('warranty_expiry_date', 'is', null)
      .lt('warranty_expiry_date', today.toISOString().split('T')[0])
      .is('deleted_at', null);

    if (expiredError) {
      console.error('Error fetching expired warranties:', expiredError);
    } else {
      console.log(`Found ${expiredAssets?.length || 0} assets with expired warranties`);
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalProcessed: results.processed,
        expiringSoon: results.expiringSoon.length,
        expiringCritical: results.expiringCritical.length,
        alreadyExpired: expiredAssets?.length || 0,
      },
      details: results,
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
