import fs from 'fs';

// Read env vars
const envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    const lineStr = line.trim();
    if (lineStr.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = lineStr.substring(lineStr.indexOf('=') + 1).replace(/['"]/g, '').trim();
    if (lineStr.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) supabaseKey = lineStr.substring(lineStr.indexOf('=') + 1).replace(/['"]/g, '').trim();
    if (lineStr.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        supabaseKey = lineStr.substring(lineStr.indexOf('=') + 1).replace(/['"]/g, '').trim();
    }
});

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials in .env");
    process.exit(1);
}

const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

async function fixContractorObservations() {
    console.log("Fetching contractor-related observations with no assigned manager...");

    // 1. Fetch observations
    const query = new URLSearchParams({
        'event_type': 'eq.observation',
        'related_contractor_company_id': 'not.is.null',
        'approval_manager_id': 'is.null',
        'select': 'id,reference_id,status,tenant_id,branch_id,site_id,related_contractor_company_id,approval_manager_id'
    });

    const res = await fetch(`${supabaseUrl}/rest/v1/incidents?${query.toString()}`, { headers });
    if (!res.ok) {
        console.error("Error fetching observations:", await res.text());
        return;
    }
    const observations = await res.json();

    console.log(`Found ${observations.length} contractor-related observations missing an assigned manager.`);

    if (observations.length === 0) {
        console.log("Nothing to fix.");
        return;
    }

    for (const obs of observations) {
        console.log(`\nProcessing ${obs.reference_id} (Currently: ${obs.status})...`);

        let effectiveBranchId = obs.branch_id;
        if (!effectiveBranchId && obs.site_id) {
            const siteRes = await fetch(`${supabaseUrl}/rest/v1/sites?id=eq.${obs.site_id}&select=branch_id`, { headers });
            const siteData = await siteRes.json();
            if (siteData.length > 0) effectiveBranchId = siteData[0].branch_id;
        }

        // 2. Fetch consultants
        const consQuery = new URLSearchParams({
            'tenant_id': `eq.${obs.tenant_id}`,
            'select': 'user_id,branch_id,roles!inner(code,is_active)'
        });
        const consRes = await fetch(`${supabaseUrl}/rest/v1/user_role_assignments?${consQuery.toString()}`, { headers });
        let assignments = await consRes.json();

        // Filter for contractor_consultant manually since !inner syntax over REST might be tricky depending on exact schema setup
        assignments = assignments.filter(a => a.roles && a.roles.code === 'contractor_consultant' && a.roles.is_active);

        let targetConsultantId = null;
        if (assignments && assignments.length > 0) {
            const branchSpecific = assignments.find(a => a.branch_id === effectiveBranchId);
            const tenantWide = assignments.find(a => a.branch_id === null);
            targetConsultantId = (branchSpecific || tenantWide)?.user_id;
        }

        if (targetConsultantId) {
            console.log(`Found Consultant ID: ${targetConsultantId}. Updating observation...`);
            const updateRes = await fetch(`${supabaseUrl}/rest/v1/incidents?id=eq.${obs.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    approval_manager_id: targetConsultantId,
                    status: 'pending_consultant_screening'
                })
            });

            if (!updateRes.ok) {
                console.error(`Error updating ${obs.reference_id}:`, await updateRes.text());
            } else {
                console.log(`SUCCESS! ${obs.reference_id} is now assigned to the Consultant and moved to pending_consultant_screening.`);
            }
        } else {
            console.log(`No Contractor Consultant found for Tenant ${obs.tenant_id} Branch ${effectiveBranchId}. Cannot assign.`);
        }
    }

    console.log("\nFinished processing all outstanding contractor observations!");
}

fixContractorObservations();
