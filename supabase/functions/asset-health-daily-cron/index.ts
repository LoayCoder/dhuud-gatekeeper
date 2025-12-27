import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssetToProcess {
  id: string;
  name: string;
  tenant_id: string;
}

interface HealthResult {
  asset_id: string;
  asset_name: string;
  score: number;
  risk_level: string;
  success: boolean;
  error?: string;
}

interface CriticalAsset {
  id: string;
  name: string;
  score: number;
  risk_level: string;
  tenant_id: string;
}

interface AssetData {
  id: string;
  installation_date: string | null;
  warranty_expiry_date: string | null;
  condition_rating: string | null;
  criticality_level: string | null;
  expected_lifespan_years: number | null;
  current_book_value: number | null;
  purchase_cost: number | null;
  status: string;
}

interface MaintenanceRecord {
  performed_date: string;
  maintenance_type: string;
  was_unplanned: boolean;
  condition_after: string | null;
}

interface MaintenanceSchedule {
  next_due: string | null;
  last_performed: string | null;
  is_active: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('Starting daily asset health recalculation...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // deno-lint-ignore no-explicit-any
    const supabase: any = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all active assets grouped by tenant
    const { data: assets, error: assetsError } = await supabase
      .from('hsse_assets')
      .select('id, name, tenant_id')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('tenant_id');

    if (assetsError) {
      console.error('Failed to fetch assets:', assetsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch assets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!assets || assets.length === 0) {
      console.log('No active assets found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active assets to process',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${assets.length} active assets to process`);

    const results: HealthResult[] = [];
    const criticalAssets: CriticalAsset[] = [];
    const batchSize = 10;

    // Process assets in batches
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize) as AssetToProcess[];
      
      const batchPromises = batch.map(async (asset) => {
        try {
          const response = await calculateHealthScore(supabase, asset.id, asset.tenant_id);
          
          const result: HealthResult = {
            asset_id: asset.id,
            asset_name: asset.name,
            score: response.score,
            risk_level: response.risk_level,
            success: true,
          };

          // Track critical assets
          if (response.risk_level === 'critical' || response.risk_level === 'high') {
            criticalAssets.push({
              id: asset.id,
              name: asset.name,
              score: response.score,
              risk_level: response.risk_level,
              tenant_id: asset.tenant_id,
            });
          }

          return result;
        } catch (error) {
          console.error(`Failed to calculate health for asset ${asset.id}:`, error);
          return {
            asset_id: asset.id,
            asset_name: asset.name,
            score: 0,
            risk_level: 'unknown',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(assets.length / batchSize)}`);
    }

    // Group critical assets by tenant for alerts
    const criticalByTenant = criticalAssets.reduce((acc, asset) => {
      if (!acc[asset.tenant_id]) {
        acc[asset.tenant_id] = [];
      }
      acc[asset.tenant_id].push(asset);
      return acc;
    }, {} as Record<string, CriticalAsset[]>);

    // Send alerts for critical assets
    for (const [tenantId, tenantAssets] of Object.entries(criticalByTenant)) {
      await sendCriticalAssetAlerts(supabase, tenantId, tenantAssets);
    }

    // Log execution summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const criticalCount = criticalAssets.filter(a => a.risk_level === 'critical').length;
    const highRiskCount = criticalAssets.filter(a => a.risk_level === 'high').length;

    const executionTime = Date.now() - startTime;

    console.log(`Daily health recalculation complete:`);
    console.log(`  - Processed: ${results.length} assets`);
    console.log(`  - Successful: ${successCount}`);
    console.log(`  - Failed: ${failureCount}`);
    console.log(`  - Critical: ${criticalCount}`);
    console.log(`  - High Risk: ${highRiskCount}`);
    console.log(`  - Execution time: ${executionTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_processed: results.length,
        successful: successCount,
        failed: failureCount,
        critical_assets: criticalCount,
        high_risk_assets: highRiskCount,
        execution_time_ms: executionTime,
      },
      critical_assets: criticalAssets,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Daily health cron error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// deno-lint-ignore no-explicit-any
async function calculateHealthScore(
  supabase: any,
  assetId: string,
  tenantId: string
): Promise<{ score: number; risk_level: string }> {
  // Fetch asset data
  const { data: assetData, error: assetError } = await supabase
    .from('hsse_assets')
    .select('id, installation_date, warranty_expiry_date, condition_rating, criticality_level, expected_lifespan_years, current_book_value, purchase_cost, status')
    .eq('id', assetId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single();

  if (assetError || !assetData) {
    throw new Error('Asset not found');
  }

  const asset = assetData as AssetData;

  // Fetch maintenance history
  const { data: maintenanceData } = await supabase
    .from('asset_maintenance_history')
    .select('performed_date, maintenance_type, was_unplanned, condition_after')
    .eq('asset_id', assetId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('performed_date', { ascending: false })
    .limit(20);

  const maintenanceHistory = (maintenanceData || []) as MaintenanceRecord[];

  // Fetch scheduled maintenance
  const { data: scheduleData } = await supabase
    .from('asset_maintenance_schedules')
    .select('next_due, last_performed, is_active')
    .eq('asset_id', assetId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .is('deleted_at', null);

  const schedules = (scheduleData || []) as MaintenanceSchedule[];

  const now = new Date();
  
  // Age Factor
  let ageFactor = 100;
  if (asset.installation_date && asset.expected_lifespan_years) {
    const installDate = new Date(asset.installation_date);
    const ageYears = (now.getTime() - installDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const ageRatio = ageYears / asset.expected_lifespan_years;
    ageFactor = Math.max(0, Math.min(100, 100 - (ageRatio * 80)));
  }

  // Condition Factor
  const conditionMap: Record<string, number> = {
    excellent: 100, good: 80, fair: 60, poor: 30, critical: 10,
  };
  const conditionFactor = conditionMap[asset.condition_rating || 'good'] || 70;

  // Maintenance Compliance
  let maintenanceCompliancePct = 100;
  if (schedules.length > 0) {
    const overdueCount = schedules.filter(s => s.next_due && new Date(s.next_due) < now).length;
    maintenanceCompliancePct = Math.max(0, 100 - (overdueCount / schedules.length) * 50);
  }

  // Usage Factor
  let usageFactor = 100;
  if (maintenanceHistory.length > 0) {
    const unplannedCount = maintenanceHistory.filter(m => m.was_unplanned).length;
    const unplannedRatio = unplannedCount / maintenanceHistory.length;
    usageFactor = Math.max(20, 100 - (unplannedRatio * 60));
  }

  // Environment Factor
  const criticalityMap: Record<string, number> = {
    low: 100, medium: 85, high: 70, critical: 55,
  };
  const environmentFactor = criticalityMap[asset.criticality_level || 'medium'] || 85;

  // Calculate score
  const weights = { age: 0.25, condition: 0.30, maintenance: 0.20, usage: 0.15, environment: 0.10 };
  const score = Math.round(
    ageFactor * weights.age +
    conditionFactor * weights.condition +
    maintenanceCompliancePct * weights.maintenance +
    usageFactor * weights.usage +
    environmentFactor * weights.environment
  );

  // Determine risk level
  let riskLevel = 'low';
  if (score < 40) riskLevel = 'critical';
  else if (score < 55) riskLevel = 'high';
  else if (score < 70) riskLevel = 'medium';

  // Calculate additional metrics
  const failureProbability = Math.max(0, Math.min(100, 100 - score)) / 100;
  
  let daysUntilFailure: number | null = null;
  if (asset.installation_date && asset.expected_lifespan_years) {
    const installDate = new Date(asset.installation_date);
    const expectedEndDate = new Date(installDate);
    expectedEndDate.setFullYear(expectedEndDate.getFullYear() + asset.expected_lifespan_years);
    const daysRemaining = Math.max(0, (expectedEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    daysUntilFailure = Math.round(daysRemaining * (score / 100));
  }

  // Determine trend
  let trend = 'stable';
  if (maintenanceHistory.length >= 2) {
    const recentConditions = maintenanceHistory
      .filter(m => m.condition_after)
      .slice(0, 5)
      .map(m => conditionMap[m.condition_after!] || 70);
    
    if (recentConditions.length >= 2) {
      const avgRecent = recentConditions.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
      const avgOlder = recentConditions.slice(-2).reduce((a, b) => a + b, 0) / 2;
      if (avgRecent > avgOlder + 5) trend = 'improving';
      else if (avgRecent < avgOlder - 5) trend = 'declining';
    }
  }

  const contributingFactors = {
    age: { value: ageFactor, weight: weights.age, contribution: ageFactor * weights.age },
    condition: { value: conditionFactor, weight: weights.condition, contribution: conditionFactor * weights.condition },
    maintenance: { value: maintenanceCompliancePct, weight: weights.maintenance, contribution: maintenanceCompliancePct * weights.maintenance },
    usage: { value: usageFactor, weight: weights.usage, contribution: usageFactor * weights.usage },
    environment: { value: environmentFactor, weight: weights.environment, contribution: environmentFactor * weights.environment },
  };

  // Upsert health score
  await supabase
    .from('asset_health_scores')
    .upsert({
      asset_id: assetId,
      tenant_id: tenantId,
      score,
      risk_level: riskLevel,
      age_factor: ageFactor,
      condition_factor: conditionFactor,
      usage_factor: usageFactor,
      environment_factor: environmentFactor,
      maintenance_compliance_pct: maintenanceCompliancePct,
      failure_probability: failureProbability,
      days_until_predicted_failure: daysUntilFailure,
      trend,
      contributing_factors: contributingFactors,
      last_calculated_at: now.toISOString(),
      calculation_model_version: '1.0.0',
      updated_at: now.toISOString(),
    }, {
      onConflict: 'asset_id',
    });

  return { score, risk_level: riskLevel };
}

// deno-lint-ignore no-explicit-any
async function sendCriticalAssetAlerts(
  supabase: any,
  tenantId: string,
  criticalAssets: CriticalAsset[]
): Promise<void> {
  if (criticalAssets.length === 0) return;

  try {
    // Get HSSE managers for this tenant
    const { data: managers } = await supabase
      .from('user_role_assignments')
      .select(`
        user_id,
        profiles!inner(email, full_name)
      `)
      .eq('tenant_id', tenantId);

    if (!managers || managers.length === 0) {
      console.log(`No managers found for tenant ${tenantId}`);
      return;
    }

    // Create notification content
    const criticalCount = criticalAssets.filter(a => a.risk_level === 'critical').length;
    const highRiskCount = criticalAssets.filter(a => a.risk_level === 'high').length;

    const assetList = criticalAssets
      .slice(0, 10)
      .map(a => `• ${a.name} (Score: ${a.score}, Risk: ${a.risk_level})`)
      .join('\n');

    const notificationTitle = `⚠️ Asset Health Alert: ${criticalCount} Critical, ${highRiskCount} High Risk`;
    const notificationBody = `Daily health check identified at-risk assets:\n\n${assetList}${criticalAssets.length > 10 ? `\n...and ${criticalAssets.length - 10} more` : ''}`;

    console.log(`Alert for tenant ${tenantId}: ${notificationTitle}`);

    // Log the alert - notifications table may not exist in all setups
    console.log(`Would send ${managers.length} notifications for tenant ${tenantId}`);
    console.log(`Alert content: ${notificationBody}`);

  } catch (error) {
    console.error('Failed to send critical asset alerts:', error);
  }
}
