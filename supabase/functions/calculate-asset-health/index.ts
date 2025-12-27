import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssetHealthInput {
  asset_id: string;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { asset_id, tenant_id }: AssetHealthInput = await req.json();

    if (!asset_id || !tenant_id) {
      return new Response(JSON.stringify({ error: 'asset_id and tenant_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Calculating health for asset ${asset_id}`);

    // Fetch asset data
    const { data: asset, error: assetError } = await supabase
      .from('hsse_assets')
      .select('id, installation_date, warranty_expiry_date, condition_rating, criticality_level, expected_lifespan_years, current_book_value, purchase_cost, status')
      .eq('id', asset_id)
      .eq('tenant_id', tenant_id)
      .is('deleted_at', null)
      .single();

    if (assetError || !asset) {
      console.error('Asset fetch error:', assetError);
      return new Response(JSON.stringify({ error: 'Asset not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch maintenance history
    const { data: maintenanceHistory } = await supabase
      .from('asset_maintenance_history')
      .select('performed_date, maintenance_type, was_unplanned, condition_after')
      .eq('asset_id', asset_id)
      .eq('tenant_id', tenant_id)
      .is('deleted_at', null)
      .order('performed_date', { ascending: false })
      .limit(20);

    // Fetch scheduled maintenance
    const { data: schedules } = await supabase
      .from('asset_maintenance_schedules')
      .select('next_due, last_performed, is_active')
      .eq('asset_id', asset_id)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .is('deleted_at', null);

    // Calculate health factors
    const now = new Date();
    
    // 1. Age Factor (0-100, higher = younger/healthier)
    let ageFactor = 100;
    if (asset.installation_date && asset.expected_lifespan_years) {
      const installDate = new Date(asset.installation_date);
      const ageYears = (now.getTime() - installDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const ageRatio = ageYears / asset.expected_lifespan_years;
      ageFactor = Math.max(0, Math.min(100, 100 - (ageRatio * 80)));
    }

    // 2. Condition Factor based on condition_rating
    const conditionMap: Record<string, number> = {
      excellent: 100,
      good: 80,
      fair: 60,
      poor: 30,
      critical: 10,
    };
    const conditionFactor = conditionMap[asset.condition_rating || 'good'] || 70;

    // 3. Maintenance Compliance
    let maintenanceCompliancePct = 100;
    if (schedules && schedules.length > 0) {
      const overdueCount = schedules.filter(s => s.next_due && new Date(s.next_due) < now).length;
      maintenanceCompliancePct = Math.max(0, 100 - (overdueCount / schedules.length) * 50);
    }

    // 4. Usage/Environment Factor (based on unplanned maintenance frequency)
    let usageFactor = 100;
    if (maintenanceHistory && maintenanceHistory.length > 0) {
      const unplannedCount = maintenanceHistory.filter(m => m.was_unplanned).length;
      const unplannedRatio = unplannedCount / maintenanceHistory.length;
      usageFactor = Math.max(20, 100 - (unplannedRatio * 60));
    }

    // 5. Environment Factor - default high, adjust based on criticality
    const criticalityMap: Record<string, number> = {
      low: 100,
      medium: 85,
      high: 70,
      critical: 55,
    };
    const environmentFactor = criticalityMap[asset.criticality_level || 'medium'] || 85;

    // Calculate overall health score (weighted average)
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

    // Calculate failure probability (inverse of health)
    const failureProbability = Math.max(0, Math.min(100, 100 - score)) / 100;

    // Estimate days until failure
    let daysUntilFailure: number | null = null;
    if (asset.installation_date && asset.expected_lifespan_years) {
      const installDate = new Date(asset.installation_date);
      const expectedEndDate = new Date(installDate);
      expectedEndDate.setFullYear(expectedEndDate.getFullYear() + asset.expected_lifespan_years);
      const daysRemaining = Math.max(0, (expectedEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      daysUntilFailure = Math.round(daysRemaining * (score / 100));
    }

    // Determine trend based on recent maintenance
    let trend = 'stable';
    if (maintenanceHistory && maintenanceHistory.length >= 2) {
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
    const { error: upsertError } = await supabase
      .from('asset_health_scores')
      .upsert({
        asset_id,
        tenant_id,
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

    if (upsertError) {
      console.error('Health score upsert error:', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to save health score' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate failure prediction if risk is high
    if (riskLevel === 'high' || riskLevel === 'critical') {
      const predictedDate = new Date(now);
      predictedDate.setDate(predictedDate.getDate() + (daysUntilFailure || 90));

      await supabase.from('asset_failure_predictions').insert({
        asset_id,
        tenant_id,
        predicted_failure_type: determineFailureType(conditionFactor, ageFactor, maintenanceCompliancePct),
        predicted_date: predictedDate.toISOString().split('T')[0],
        confidence_pct: Math.round((100 - score) * 0.8 + 20),
        severity: riskLevel,
        status: 'active',
        recommended_action: generateRecommendation(riskLevel, conditionFactor, maintenanceCompliancePct),
        model_inputs: contributingFactors,
        prediction_model_version: '1.0.0',
        priority: riskLevel === 'critical' ? 1 : 2,
        estimated_repair_cost: estimateRepairCost(asset.purchase_cost, riskLevel),
        cost_if_ignored: estimateCostIfIgnored(asset.purchase_cost, riskLevel),
      });
    }

    console.log(`Health calculated for asset ${asset_id}: score=${score}, risk=${riskLevel}`);

    return new Response(JSON.stringify({
      success: true,
      score,
      risk_level: riskLevel,
      trend,
      failure_probability: failureProbability,
      days_until_predicted_failure: daysUntilFailure,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('calculate-asset-health error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function determineFailureType(condition: number, age: number, maintenance: number): string {
  if (condition < 40) return 'component_degradation';
  if (age < 40) return 'end_of_life';
  if (maintenance < 50) return 'maintenance_neglect';
  return 'wear_and_tear';
}

function generateRecommendation(risk: string, condition: number, maintenance: number): string {
  if (risk === 'critical') {
    return 'Immediate inspection required. Schedule emergency maintenance or consider replacement.';
  }
  if (condition < 50) {
    return 'Asset condition deteriorating. Schedule comprehensive maintenance soon.';
  }
  if (maintenance < 60) {
    return 'Maintenance schedule overdue. Complete pending maintenance tasks.';
  }
  return 'Monitor closely. Schedule preventive maintenance within the next month.';
}

function estimateRepairCost(purchaseCost: number | null, risk: string): number | null {
  if (!purchaseCost) return null;
  const multipliers: Record<string, number> = {
    critical: 0.4,
    high: 0.25,
    medium: 0.15,
    low: 0.05,
  };
  return Math.round(purchaseCost * (multipliers[risk] || 0.1));
}

function estimateCostIfIgnored(purchaseCost: number | null, risk: string): number | null {
  if (!purchaseCost) return null;
  const multipliers: Record<string, number> = {
    critical: 1.2,
    high: 0.8,
    medium: 0.4,
    low: 0.1,
  };
  return Math.round(purchaseCost * (multipliers[risk] || 0.2));
}
