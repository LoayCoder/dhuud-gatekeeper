
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xdlowvfzhvjzbtgvurzj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkbG93dmZ6aHZqemJ0Z3Z1cnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTAyNDcsImV4cCI6MjA4MDE4NjI0N30.XYNA3yg_7jdgCHJVcOBSZc-wiks17QvLn4oDhtoG5Ac";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking RPC and data...\n');

    // Call the RPC
    const { data, error } = await supabase.rpc('get_leading_indicators', {
        p_start_date: '2025-01-01',
        p_end_date: '2026-12-31',
        p_branch_id: null,
        p_site_id: null
    });

    if (error) {
        console.error('RPC Error:', error);
        return;
    }

    console.log('RPC Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n---\n');

    // Check incidents with event_type = 'observation'
    const { data: observations, error: obsError } = await supabase
        .from('incidents')
        .select('id, event_type, subtype, status, occurred_at')
        .eq('event_type', 'observation')
        .limit(5);

    if (obsError) {
        console.error('Error fetching observations:', obsError);
    } else {
        console.log(`Total observations (event_type='observation'): ${observations?.length || 0}`);
        if (observations && observations.length > 0) {
            console.log('Sample observation:', observations[0]);
        }
    }

    // Check hazards
    const { data: hazards, error: hazError } = await supabase
        .from('incidents')
        .select('id, event_type, subtype, status, occurred_at')
        .eq('event_type', 'observation')
        .eq('subtype', 'unsafe_condition')
        .limit(5);

    if (hazError) {
        console.error('Error fetching hazards:', hazError);
    } else {
        console.log(`\nTotal hazards (event_type='observation' AND subtype='unsafe_condition'): ${hazards?.length || 0}`);
        if (hazards && hazards.length > 0) {
            console.log('Sample hazard:', hazards[0]);
        }
    }
}

checkData();
