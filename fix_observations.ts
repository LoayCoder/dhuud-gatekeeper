import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixContractorObservations() {
    console.log("Fetching contractor-related observations with no assigned manager...");

    // Fetch observations with related contractor but no approval manager
    const { data: observations, error: fetchErr } = await supabase
        .from('incidents')
        .select('id, reference_id, status, tenant_id, branch_id, site_id, related_contractor_company_id, approval_manager_id')
        .eq('event_type', 'observation')
        .not('related_contractor_company_id', 'is', null)
        .is('approval_manager_id', null);

    if (fetchErr) {
        console.error("Error fetching observations:", fetchErr);
        return;
    }

    console.log(`Found ${observations?.length || 0} contractor-related observations missing an assigned manager.`);

    if (!observations || observations.length === 0) {
        console.log("Nothing to fix.");
        return;
    }

    for (const obs of observations) {
        console.log(`\nProcessing ${obs.reference_id} (Currently: ${obs.status})...`);

        let effectiveBranchId = obs.branch_id;
        if (!effectiveBranchId && obs.site_id) {
            const { data: site } = await supabase.from('sites').select('branch_id').eq('id', obs.site_id).single();
            if (site) effectiveBranchId = site.branch_id;
        }

        // Fetch active contractor consultants for this tenant
        const { data: assignments, error: assignErr } = await supabase
            .from('user_role_assignments')
            .select('user_id, branch_id, roles!inner(code, is_active)')
            .eq('tenant_id', obs.tenant_id)
            .eq('roles.code', 'contractor_consultant')
            .eq('roles.is_active', true);

        if (assignErr) {
            console.error(`Failed to fetch consultants for ${obs.reference_id}:`, assignErr);
            continue;
        }

        let targetConsultantId = null;
        if (assignments && assignments.length > 0) {
            // Prefer branch-specific consultant, fallback to tenant-wide consultant (branch_id = null)
            const branchSpecific = assignments.find(a => a.branch_id === effectiveBranchId);
            const tenantWide = assignments.find(a => a.branch_id === null);
            targetConsultantId = (branchSpecific || tenantWide)?.user_id;
        }

        if (targetConsultantId) {
            console.log(`Found Consultant ID: ${targetConsultantId}. Updating observation...`);
            const { error: updateErr } = await supabase
                .from('incidents')
                .update({
                    approval_manager_id: targetConsultantId,
                    status: 'pending_consultant_screening' // Route to correct queue
                })
                .eq('id', obs.id);

            if (updateErr) {
                console.error(`Error updating ${obs.reference_id}:`, updateErr);
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
