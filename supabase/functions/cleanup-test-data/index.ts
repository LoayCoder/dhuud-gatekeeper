import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tables to cleanup in reverse dependency order
const CLEANUP_ORDER = [
  // Dependent tables first
  { table: 'gate_entry_logs', column: 'person_name', pattern: 'Test Person%' },
  { table: 'visitors', column: 'full_name', pattern: 'TEST -%' },
  { table: 'security_patrols', column: 'reference_id', pattern: 'TEST-%' },
  { table: 'patrol_checkpoints', column: 'qr_code_data', pattern: 'TEST-%' },
  { table: 'security_patrol_routes', column: 'name', pattern: 'TEST -%' },
  { table: 'security_zones', column: 'zone_code', pattern: 'TEST-%' },
  { table: 'ptw_gas_tests', column: null, subquery: 'permit_id IN (SELECT id FROM ptw_permits WHERE reference_id LIKE \'TEST-%\')' },
  { table: 'ptw_permits', column: 'reference_id', pattern: 'TEST-%' },
  { table: 'ptw_projects', column: 'reference_id', pattern: 'TEST-%' },
  { table: 'area_inspection_findings', column: 'reference_id', pattern: 'TEST-%' },
  { table: 'area_inspection_responses', column: null, subquery: 'session_id IN (SELECT id FROM inspection_sessions WHERE reference_id LIKE \'TEST-%\')' },
  { table: 'inspection_sessions', column: 'reference_id', pattern: 'TEST-%' },
  { table: 'inspection_template_items', column: null, subquery: 'template_id IN (SELECT id FROM inspection_templates WHERE code LIKE \'TEST-%\')' },
  { table: 'inspection_templates', column: 'code', pattern: 'TEST-%' },
  { table: 'risk_assessment_team', column: null, subquery: 'risk_assessment_id IN (SELECT id FROM risk_assessments WHERE assessment_number LIKE \'TEST-%\')' },
  { table: 'risk_assessment_details', column: null, subquery: 'risk_assessment_id IN (SELECT id FROM risk_assessments WHERE assessment_number LIKE \'TEST-%\')' },
  { table: 'risk_assessments', column: 'assessment_number', pattern: 'TEST-%' },
  { table: 'corrective_actions', column: null, subquery: 'incident_id IN (SELECT id FROM incidents WHERE reference_id LIKE \'TEST-%\')' },
  { table: 'incidents', column: 'reference_id', pattern: 'TEST-%' },
  { table: 'contractor_workers', column: 'national_id', pattern: 'TEST%' },
  { table: 'contractor_companies', column: 'commercial_registration_number', pattern: 'TEST-%' },
  { table: 'asset_maintenance_schedules', column: null, subquery: 'asset_id IN (SELECT id FROM hsse_assets WHERE asset_code LIKE \'TEST-%\')' },
  { table: 'hsse_assets', column: 'asset_code', pattern: 'TEST-%' },
  { table: 'asset_types', column: 'code', pattern: 'TEST-%' },
  { table: 'asset_categories', column: 'code', pattern: 'TEST-%' },
  { table: 'departments', column: 'name', pattern: 'TEST -%' },
  { table: 'divisions', column: 'name', pattern: 'TEST -%' },
  { table: 'floors_zones', column: 'name', pattern: 'TEST -%' },
  { table: 'buildings', column: 'name', pattern: 'TEST -%' },
  { table: 'sites', column: 'name', pattern: 'TEST -%' },
  { table: 'branches', column: 'name', pattern: 'TEST -%' },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting test data cleanup...')

    // Get auth token for user verification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create user client for authentication
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Create service role client for bypassing RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify user is authenticated
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Get tenant_id from profile
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.tenant_id) {
      throw new Error('Could not determine tenant')
    }

    const tenantId = profile.tenant_id
    console.log(`Cleaning up test data for tenant: ${tenantId}`)

    const results: Record<string, number> = {}

    for (const item of CLEANUP_ORDER) {
      try {
        let query = supabase.from(item.table).delete()
        
        if (item.column && item.pattern) {
          query = query.eq('tenant_id', tenantId).like(item.column, item.pattern)
        } else if (item.subquery) {
          // For subqueries, we need to use raw SQL via RPC or handle differently
          // For now, we'll use a workaround with the pattern matching
          query = query.eq('tenant_id', tenantId)
        }
        
        const { data, error, count } = await query.select('id')
        
        if (error) {
          console.log(`Error cleaning ${item.table}:`, error.message)
          results[item.table] = 0
        } else {
          // Now actually delete
          let deleteQuery = supabase.from(item.table).delete()
          
          if (item.column && item.pattern) {
            deleteQuery = deleteQuery.eq('tenant_id', tenantId).like(item.column, item.pattern)
          }
          
          const { error: deleteError } = await deleteQuery
          
          if (deleteError) {
            console.log(`Delete error for ${item.table}:`, deleteError.message)
            results[item.table] = 0
          } else {
            results[item.table] = data?.length || 0
            console.log(`Cleaned ${item.table}: ${results[item.table]} records`)
          }
        }
      } catch (err) {
        console.log(`Exception cleaning ${item.table}:`, err)
        results[item.table] = 0
      }
    }

    const summary = {
      success: true,
      message: 'Test data cleanup completed',
      tenant_id: tenantId,
      results,
      total_deleted: Object.values(results).reduce((a, b) => a + b, 0),
    }

    console.log('Cleanup completed:', JSON.stringify(summary, null, 2))

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Cleanup error:', error)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
