import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xdlowvfzhvjzbtgvurzj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkbG93dmZ6aHZqemJ0Z3Z1cnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTAyNDcsImV4cCI6MjA4MDE4NjI0N30.XYNA3yg_7jdgCHJVcOBSZc-wiks17QvLn4oDhtoG5Ac";

const supabase = createClient(supabaseUrl, supabaseKey);

async function simpleCheck() {
    try {
        console.log('=== Calling get_leading_indicators RPC ===');
        const { data, error } = await supabase.rpc('get_leading_indicators', {
            p_start_date: null,
            p_end_date: null,
            p_branch_id: null,
            p_site_id: null
        });

        if (error) {
            console.error('ERROR:', error.message);
            return;
        }

        console.log('\n=== RPC RESULT ===');
        console.log('hazard_identification_rate:', data.hazard_identification_rate);
        console.log('total_hazards:', data.total_hazards);
        console.log('total_observations:', data.total_observations);
        console.log('closed_observations:', data.closed_observations);
        console.log('\nFull response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Exception:', err);
    }
}

simpleCheck();
