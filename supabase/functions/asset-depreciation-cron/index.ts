import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Asset {
  id: string;
  tenant_id: string;
  purchase_price: number;
  salvage_value: number;
  useful_life_years: number;
  depreciation_method: string;
  depreciation_rate_pct: number;
  in_service_date: string;
  current_book_value: number;
}

interface DepreciationSchedule {
  asset_id: string;
  tenant_id: string;
  period_start: string;
  period_end: string;
  period_type: string;
  opening_value: number;
  depreciation_amount: number;
  accumulated_depreciation: number;
  closing_value: number;
  depreciation_method: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[asset-depreciation-cron] Starting monthly depreciation calculation...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Period dates for this month
    const periodStart = new Date(currentYear, currentMonth, 1);
    const periodEnd = new Date(currentYear, currentMonth + 1, 0); // Last day of month

    console.log(`[asset-depreciation-cron] Processing period: ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`);

    // Fetch all active assets with depreciation settings
    const { data: assets, error: assetsError } = await supabase
      .from('hsse_assets')
      .select('id, tenant_id, purchase_price, salvage_value, useful_life_years, depreciation_method, depreciation_rate_pct, in_service_date, current_book_value')
      .eq('status', 'active')
      .is('deleted_at', null)
      .not('depreciation_method', 'is', null)
      .not('purchase_price', 'is', null)
      .gt('purchase_price', 0);

    if (assetsError) {
      console.error('[asset-depreciation-cron] Error fetching assets:', assetsError);
      throw assetsError;
    }

    if (!assets || assets.length === 0) {
      console.log('[asset-depreciation-cron] No assets found for depreciation calculation');
      return new Response(
        JSON.stringify({ success: true, message: 'No assets to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[asset-depreciation-cron] Found ${assets.length} assets to process`);

    // Check which assets already have a schedule for this period
    const { data: existingSchedules, error: scheduleCheckError } = await supabase
      .from('asset_depreciation_schedules')
      .select('asset_id')
      .eq('period_type', 'monthly')
      .gte('period_start', periodStart.toISOString().split('T')[0])
      .lte('period_start', periodEnd.toISOString().split('T')[0])
      .is('deleted_at', null);

    if (scheduleCheckError) {
      console.error('[asset-depreciation-cron] Error checking existing schedules:', scheduleCheckError);
    }

    const processedAssetIds = new Set(existingSchedules?.map(s => s.asset_id) || []);
    const schedulesToInsert: DepreciationSchedule[] = [];
    const assetUpdates: { id: string; current_book_value: number }[] = [];

    for (const asset of assets as Asset[]) {
      // Skip if already processed this period
      if (processedAssetIds.has(asset.id)) {
        console.log(`[asset-depreciation-cron] Skipping asset ${asset.id} - already processed`);
        continue;
      }

      // Skip if asset not yet in service
      if (asset.in_service_date && new Date(asset.in_service_date) > periodEnd) {
        console.log(`[asset-depreciation-cron] Skipping asset ${asset.id} - not yet in service`);
        continue;
      }

      const purchasePrice = Number(asset.purchase_price) || 0;
      const salvageValue = Number(asset.salvage_value) || 0;
      const usefulLifeYears = Number(asset.useful_life_years) || 5;
      const currentBookValue = Number(asset.current_book_value) || purchasePrice;
      const depreciationRate = Number(asset.depreciation_rate_pct) || (100 / usefulLifeYears);

      // Skip if fully depreciated
      if (currentBookValue <= salvageValue) {
        console.log(`[asset-depreciation-cron] Skipping asset ${asset.id} - fully depreciated`);
        continue;
      }

      let depreciationAmount = 0;
      const depreciableAmount = purchasePrice - salvageValue;

      if (asset.depreciation_method === 'straight_line') {
        // Monthly depreciation = Annual depreciation / 12
        depreciationAmount = depreciableAmount / (usefulLifeYears * 12);
      } else if (asset.depreciation_method === 'declining_balance') {
        // Monthly rate = Annual rate / 12
        const monthlyRate = (depreciationRate / 100) / 12;
        depreciationAmount = currentBookValue * monthlyRate;
      } else {
        // Default to straight line for unknown methods
        depreciationAmount = depreciableAmount / (usefulLifeYears * 12);
      }

      // Don't depreciate below salvage value
      const maxDepreciation = currentBookValue - salvageValue;
      depreciationAmount = Math.min(depreciationAmount, maxDepreciation);
      depreciationAmount = Math.round(depreciationAmount * 100) / 100;

      const newBookValue = Math.round((currentBookValue - depreciationAmount) * 100) / 100;
      const accumulatedDepreciation = Math.round((purchasePrice - newBookValue) * 100) / 100;

      schedulesToInsert.push({
        asset_id: asset.id,
        tenant_id: asset.tenant_id,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        period_type: 'monthly',
        opening_value: currentBookValue,
        depreciation_amount: depreciationAmount,
        accumulated_depreciation: accumulatedDepreciation,
        closing_value: newBookValue,
        depreciation_method: asset.depreciation_method,
      });

      assetUpdates.push({
        id: asset.id,
        current_book_value: newBookValue,
      });
    }

    console.log(`[asset-depreciation-cron] Inserting ${schedulesToInsert.length} depreciation schedules`);

    // Insert depreciation schedules
    if (schedulesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('asset_depreciation_schedules')
        .insert(schedulesToInsert);

      if (insertError) {
        console.error('[asset-depreciation-cron] Error inserting schedules:', insertError);
        throw insertError;
      }

      // Update asset book values
      for (const update of assetUpdates) {
        const { error: updateError } = await supabase
          .from('hsse_assets')
          .update({ current_book_value: update.current_book_value })
          .eq('id', update.id);

        if (updateError) {
          console.error(`[asset-depreciation-cron] Error updating asset ${update.id}:`, updateError);
        }
      }
    }

    console.log(`[asset-depreciation-cron] Successfully processed ${schedulesToInsert.length} assets`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${schedulesToInsert.length} assets for depreciation`,
        processed: schedulesToInsert.length,
        period: {
          start: periodStart.toISOString().split('T')[0],
          end: periodEnd.toISOString().split('T')[0],
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[asset-depreciation-cron] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
