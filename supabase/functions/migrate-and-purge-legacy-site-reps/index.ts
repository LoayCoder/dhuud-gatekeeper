import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MigrationResult {
  success: boolean;
  summary: {
    total_companies_checked: number;
    companies_migrated: number;
    companies_skipped_no_email: number;
    companies_already_has_rep: number;
    errors: number;
  };
  migrated: Array<{ company: string; email: string }>;
  skipped: Array<{ company: string; reason: string }>;
  errors: Array<{ company: string; error: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[migrate-and-purge] Starting Clean Slate migration...");

    // Query ALL companies with any legacy site rep data
    const { data: companies, error: fetchError } = await supabase
      .from("contractor_companies")
      .select(`
        id,
        tenant_id,
        branch_id,
        company_name,
        contractor_site_rep_name,
        contractor_site_rep_email,
        contractor_site_rep_phone,
        contractor_site_rep_mobile,
        contractor_site_rep_national_id,
        contractor_site_rep_nationality,
        contractor_site_rep_photo
      `)
      .is("deleted_at", null);

    if (fetchError) {
      throw new Error(`Failed to fetch companies: ${fetchError.message}`);
    }

    console.log(`[migrate-and-purge] Found ${companies?.length || 0} companies to check`);

    const result: MigrationResult = {
      success: true,
      summary: {
        total_companies_checked: companies?.length || 0,
        companies_migrated: 0,
        companies_skipped_no_email: 0,
        companies_already_has_rep: 0,
        errors: 0,
      },
      migrated: [],
      skipped: [],
      errors: [],
    };

    for (const company of companies || []) {
      try {
        // Check if primary rep already exists
        const { data: existingRep } = await supabase
          .from("contractor_representatives")
          .select("id")
          .eq("company_id", company.id)
          .eq("is_primary", true)
          .maybeSingle();

        if (existingRep) {
          result.summary.companies_already_has_rep++;
          result.skipped.push({
            company: company.company_name,
            reason: "Primary representative already exists",
          });
          console.log(`[migrate-and-purge] Skipped (already has rep): ${company.company_name}`);
          continue;
        }

        // Check if has valid email
        const email = company.contractor_site_rep_email?.trim();
        if (!email) {
          result.summary.companies_skipped_no_email++;
          result.skipped.push({
            company: company.company_name,
            reason: "No email address in legacy fields",
          });
          console.log(`[migrate-and-purge] Skipped (no email): ${company.company_name}`);
          continue;
        }

        // CREATE contractor_representatives record
        const { error: insertError } = await supabase
          .from("contractor_representatives")
          .insert({
            tenant_id: company.tenant_id,
            company_id: company.id,
            branch_id: company.branch_id,
            full_name: company.contractor_site_rep_name || "Site Representative",
            email: email,
            mobile_number: company.contractor_site_rep_phone || company.contractor_site_rep_mobile || "N/A",
            national_id: company.contractor_site_rep_national_id || null,
            photo_path: company.contractor_site_rep_photo || null,
            is_primary: true,
            is_safety_officer_eligible: false,
          });

        if (insertError) {
          throw new Error(`Insert failed: ${insertError.message}`);
        }

        // IMMEDIATELY purge legacy fields
        const { error: purgeError } = await supabase
          .from("contractor_companies")
          .update({
            contractor_site_rep_name: null,
            contractor_site_rep_email: null,
            contractor_site_rep_phone: null,
            contractor_site_rep_mobile: null,
            contractor_site_rep_national_id: null,
            contractor_site_rep_nationality: null,
            contractor_site_rep_photo: null,
          })
          .eq("id", company.id);

        if (purgeError) {
          console.error(`[migrate-and-purge] Purge warning for ${company.company_name}: ${purgeError.message}`);
        }

        result.summary.companies_migrated++;
        result.migrated.push({
          company: company.company_name,
          email: email,
        });
        console.log(`[migrate-and-purge] Migrated & Cleaned: ${company.company_name}`);

      } catch (err) {
        result.summary.errors++;
        result.errors.push({
          company: company.company_name,
          error: err instanceof Error ? err.message : String(err),
        });
        console.error(`[migrate-and-purge] Error for ${company.company_name}:`, err);
      }
    }

    console.log("[migrate-and-purge] Migration complete!", result.summary);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[migrate-and-purge] Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
