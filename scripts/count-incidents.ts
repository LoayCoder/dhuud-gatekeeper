
import { supabase } from '../src/integrations/supabase/client';

async function countIncidents() {
    const { count, error } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error counting incidents:', error);
    } else {
        console.log('Total incidents in DB:', count);
    }
}

countIncidents();
