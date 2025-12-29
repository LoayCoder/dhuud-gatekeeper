import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidatePermitRequest {
  project_id: string;
  type_id: string;
  site_id?: string;
  worker_ids?: string[];
  planned_start_time: string;
  planned_end_time: string;
}

interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

interface ValidationWarning {
  code: string;
  message: string;
}

interface ValidationResponse {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  projectContext?: {
    contractorId: string;
    contractorName: string;
    mobilizationPercentage: number;
    projectStatus: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ValidatePermitRequest = await req.json();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    console.log("Validating permit request:", JSON.stringify(body, null, 2));

    // 1. Validate project exists and is active
    const { data: project, error: projectError } = await supabase
      .from("ptw_projects")
      .select(`
        id, status, mobilization_percentage, contractor_company_id,
        contractor_company:contractor_companies(id, company_name, status)
      `)
      .eq("id", body.project_id)
      .is("deleted_at", null)
      .single();

    if (projectError || !project) {
      errors.push({
        code: "PROJECT_NOT_FOUND",
        message: "Project not found or has been deleted",
        field: "project_id",
      });
      
      return new Response(
        JSON.stringify({ isValid: false, errors, warnings } as ValidationResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check project status
    if (project.status !== "active") {
      errors.push({
        code: "PROJECT_NOT_ACTIVE",
        message: `Project status is "${project.status}". Only active projects can have permits.`,
        field: "project_id",
      });
    }

    // Check mobilization
    if (project.mobilization_percentage < 100) {
      errors.push({
        code: "MOBILIZATION_INCOMPLETE",
        message: `Project mobilization is at ${project.mobilization_percentage}%. Must be 100% before creating permits.`,
        field: "project_id",
      });
    }

    // 2. Validate contractor status
    const contractorData = project.contractor_company;
    const contractor = contractorData && typeof contractorData === 'object' && !Array.isArray(contractorData)
      ? contractorData as { id: string; company_name: string; status: string }
      : null;
    if (contractor) {
      if (contractor.status === "blacklisted") {
        errors.push({
          code: "CONTRACTOR_BLACKLISTED",
          message: `Contractor "${contractor.company_name}" is blacklisted and cannot receive new permits.`,
          field: "contractor",
        });
      } else if (contractor.status === "suspended") {
        errors.push({
          code: "CONTRACTOR_SUSPENDED",
          message: `Contractor "${contractor.company_name}" is suspended. Contact HSSE for assistance.`,
          field: "contractor",
        });
      } else if (contractor.status !== "active") {
        warnings.push({
          code: "CONTRACTOR_INACTIVE",
          message: `Contractor "${contractor.company_name}" status is "${contractor.status}".`,
        });
      }
    }

    // 3. Validate permit type exists
    const { data: permitType, error: typeError } = await supabase
      .from("ptw_types")
      .select("id, name, is_active")
      .eq("id", body.type_id)
      .is("deleted_at", null)
      .single();

    if (typeError || !permitType) {
      errors.push({
        code: "PERMIT_TYPE_NOT_FOUND",
        message: "Selected permit type not found",
        field: "type_id",
      });
    } else if (!permitType.is_active) {
      errors.push({
        code: "PERMIT_TYPE_INACTIVE",
        message: `Permit type "${permitType.name}" is no longer active`,
        field: "type_id",
      });
    }

    // 4. Validate workers if provided
    if (body.worker_ids && body.worker_ids.length > 0) {
      // Get workers and verify they belong to the project's contractor
      const { data: workers, error: workersError } = await supabase
        .from("contractor_workers")
        .select("id, full_name, company_id, approval_status")
        .in("id", body.worker_ids)
        .is("deleted_at", null);

      if (workersError) {
        console.error("Error fetching workers:", workersError);
        warnings.push({
          code: "WORKER_VALIDATION_FAILED",
          message: "Could not validate workers. Please verify manually.",
        });
      } else if (workers) {
        for (const worker of workers) {
          // Check worker belongs to project contractor
          if (contractor && worker.company_id !== contractor.id) {
            errors.push({
              code: "WORKER_WRONG_CONTRACTOR",
              message: `Worker "${worker.full_name}" does not belong to the project's contractor.`,
              field: "workers",
            });
          }
          
          // Check worker approval status
          if (worker.approval_status !== "approved") {
            errors.push({
              code: "WORKER_NOT_APPROVED",
              message: `Worker "${worker.full_name}" is not approved (status: ${worker.approval_status}).`,
              field: "workers",
            });
          }
        }
      }
    }

    // 5. Validate date/time
    const startTime = new Date(body.planned_start_time);
    const endTime = new Date(body.planned_end_time);
    const now = new Date();

    if (startTime < now) {
      warnings.push({
        code: "START_TIME_PAST",
        message: "Planned start time is in the past. Verify this is intended.",
      });
    }

    if (endTime <= startTime) {
      errors.push({
        code: "INVALID_TIME_RANGE",
        message: "Planned end time must be after start time.",
        field: "planned_end_time",
      });
    }

    // 6. Check for SIMOPS conflicts (basic check)
    if (body.site_id) {
      const { data: overlappingPermits } = await supabase
        .from("ptw_permits")
        .select("id, reference_id, type_id")
        .eq("site_id", body.site_id)
        .in("status", ["issued", "activated"])
        .gte("planned_end_time", body.planned_start_time)
        .lte("planned_start_time", body.planned_end_time)
        .is("deleted_at", null)
        .limit(5);

      if (overlappingPermits && overlappingPermits.length > 0) {
        warnings.push({
          code: "SIMOPS_OVERLAP",
          message: `${overlappingPermits.length} active permit(s) overlap with this time window. Review SIMOPS requirements.`,
        });
      }
    }

    const response: ValidationResponse = {
      isValid: errors.length === 0,
      errors,
      warnings,
      projectContext: contractor ? {
        contractorId: contractor.id,
        contractorName: contractor.company_name,
        mobilizationPercentage: project.mobilization_percentage,
        projectStatus: project.status,
      } : undefined,
    };

    console.log("Validation result:", JSON.stringify(response, null, 2));

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Validation error:", error);
    const message = error instanceof Error ? error.message : "Unknown validation error";
    return new Response(
      JSON.stringify({
        isValid: false,
        errors: [{ code: "VALIDATION_ERROR", message }],
        warnings: [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
