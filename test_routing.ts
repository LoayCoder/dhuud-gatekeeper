import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Need to use service_role key to bypass RLS to force state changes
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndTrigger() {
    console.log("Fetching OBS-2026-0001...");
    // 1. Fetch current state
    const { data: incident, error: fetchErr } = await supabase
        .from('incidents')
        .select('id, reference_id, status, event_type, related_contractor_company_id, approval_manager_id')
        .eq('reference_id', 'OBS-2026-0001')
        .single();

    if (fetchErr) {
        console.error("Error fetching incident:", fetchErr);
        return;
    }

    console.log("Current State:", incident);

    // 2. We need to clear approval_manager_id and trigger 'auto_route_observation_on_submit'
    console.log("\nAttempting to re-trigger routing by passing the record through 'submitted' state...");

    // First clear approval manager and set status to a pre-submitted state to ensure trigger hits
    const { data: resetData, error: resetErr } = await supabase
        .from('incidents')
        .update({ status: 'draft', approval_manager_id: null })
        .eq('id', incident.id)
        .select();

    if (resetErr) {
        console.error("Error resetting incident:", resetErr);
    } else {
        console.log("Reset to draft, approval_manager_id cleared:", resetData[0].status);

        // Now push to submitted to invoke trigger
        const { data: triggeredData, error: triggerErr } = await supabase
            .from('incidents')
            .update({ status: 'submitted' })
            .eq('id', incident.id)
            .select('id, reference_id, status, approval_manager_id');

        if (triggerErr) {
            console.error("Error triggering routing:", triggerErr);
        } else {
            console.log("\nResult after routing trigger fired:");
            console.log(JSON.stringify(triggeredData[0], null, 2));

            if (triggeredData[0].approval_manager_id) {
                console.log("SUCCESS! Successfully assigned a specific manager: ", triggeredData[0].approval_manager_id)
            } else {
                console.log("FAILED to populate approval_manager_id. It is still null.");
            }
        }
    }
}

checkAndTrigger();
