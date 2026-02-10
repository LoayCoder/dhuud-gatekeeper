import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xdlowvfzhvjzbtgvurzj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkbG93dmZ6aHZqemJ0Z3Z1cnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTAyNDcsImV4cCI6MjA4MDE4NjI0N30.XYNA3yg_7jdgCHJVcOBSZc-wiks17QvLn4oDhtoG5Ac";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatuses() {
    console.log('Checking status values in incidents table...\n');

    // Get all unique status values for observations
    const { data, error } = await supabase
        .from('incidents')
        .select('status, incident_status, event_type, subtype')
        .eq('event_type', 'observation');

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    const statuses = new Set(data?.map(d => d.status));
    const incidentStatuses = new Set(data?.map(d => d.incident_status));
    const subtypes = new Set(data?.map(d => d.subtype));

    console.log('Total observations (event_type=observation):', data?.length || 0);
    console.log('\nUnique status values:', Array.from(statuses));
    console.log('Unique incident_status values:', Array.from(incidentStatuses));
    console.log('Unique subtype values:', Array.from(subtypes));

    // Sample records
    console.log('\nSample records:');
    data?.slice(0, 3).forEach((record, i) => {
        console.log(`${i + 1}. status="${record.status}", incident_status="${record.incident_status}", subtype="${record.subtype}"`);
    });
}

checkStatuses();
