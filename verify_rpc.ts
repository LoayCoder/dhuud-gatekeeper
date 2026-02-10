
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xdlowvfzhvjzbtgvurzj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkbG93dmZ6aHZqemJ0Z3Z1cnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTAyNDcsImV4cCI6MjA4MDE4NjI0N30.XYNA3yg_7jdgCHJVcOBSZc-wiks17QvLn4oDhtoG5Ac"; // anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyLeadingIndicators() {
    console.log('Verifying get_leading_indicators RPC...');

    // Use a broad date range 
    const startDate = '2025-01-01';
    const endDate = '2026-12-31';

    // Try calling with all expected parameters to match the new signature
    // defined in the migration 20260220000000_fix_leading_indicators_rpc_v2.sql
    const params = {
        p_start_date: startDate,
        p_end_date: endDate,
        p_branch_id: null,
        p_site_id: null
    };

    console.log('Calling RPC with params:', params);

    const { data, error } = await supabase.rpc('get_leading_indicators', params);

    if (error) {
        console.error('RPC Error:', error);
        if (error.message.includes('argument') || error.message.includes('function')) {
            console.log("NOTE: This error likely means the migration hasn't been applied yet.");
        }
        return;
    }

    console.log('RPC Result:', JSON.stringify(data, null, 2));
}

verifyLeadingIndicators();
