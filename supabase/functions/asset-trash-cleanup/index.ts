import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Asset Trash Cleanup Cron Function
 * 
 * Runs daily to permanently delete assets that have been in trash for 7+ days.
 * Uses the cleanup_expired_trash_assets() database function.
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use service role to bypass RLS for cleanup
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[AssetTrashCleanup] Starting cleanup of expired trash items...');

    // Call the cleanup function
    const { data, error } = await supabase
      .rpc('cleanup_expired_trash_assets');

    if (error) {
      console.error('[AssetTrashCleanup] Error:', error);
      throw error;
    }

    const deletedCount = data ?? 0;
    console.log(`[AssetTrashCleanup] Permanently deleted ${deletedCount} expired assets`);

    // Log to audit (optional - for monitoring)
    if (deletedCount > 0) {
      console.log(`[AssetTrashCleanup] Cleanup completed at ${new Date().toISOString()}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: deletedCount,
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[AssetTrashCleanup] Fatal error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
