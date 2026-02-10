
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xdlowvfzhvjzbtgvurzj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkbG93dmZ6aHZqemJ0Z3Z1cnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTAyNDcsImV4cCI6MjA4MDE4NjI0N30.XYNA3yg_7jdgCHJVcOBSZc-wiks17QvLn4oDhtoG5Ac"; // anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugData() {
    console.log('Debugging data...');

    // Check incidents subtypes
    const { data: incidents, error: incidentsError } = await supabase
        .from('incidents')
        .select('subtype, event_type, incident_status, status')
        .limit(100);

    if (incidentsError) {
        console.error('Error fetching incidents:', incidentsError);
    } else {
        console.log('Incidents subtypes:', [...new Set(incidents?.map(i => i.subtype))]);
        console.log('Incidents event_types:', [...new Set(incidents?.map(i => i.event_type))]);
        console.log('Incidents incident_statuses:', [...new Set(incidents?.map(i => i.incident_status))]);
        console.log('Incidents statuses:', [...new Set(incidents?.map(i => i.status))]);
    }

    // Check observations table
    const { data: observations, error: obsError } = await supabase
        .from('observations')
        .select('*')
        .limit(10);

    if (obsError) {
        console.error('Error fetching observations (table might not exist):', obsError);
    } else {
        console.log('Observations count:', observations?.length);
        if (observations?.length > 0) {
            console.log('Sample observation:', observations[0]);
        }
    }
}

debugData();
