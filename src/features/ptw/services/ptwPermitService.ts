import { supabase } from '@/integrations/supabase/client';

export interface PTWPermitFilters {
    search?: string;
    status?: string;
    typeId?: string;
    projectId?: string;
    siteId?: string;
}

export async function getPTWPermits(tenantId: string, filters: PTWPermitFilters = {}) {
    let query = supabase
        .from("ptw_permits")
        .select(`
      id, tenant_id, branch_id, reference_id, project_id, type_id, status,
      site_id, building_id, floor_zone_id, location_details, gps_lat, gps_lng,
      applicant_id, endorser_id, issuer_id,
      planned_start_time, planned_end_time, actual_start_time, actual_end_time,
      extended_until, extension_count, simops_status, simops_notes,
      risk_assessment_ref, job_description, work_scope,
      emergency_contact_name, emergency_contact_number, evacuation_point,
      requested_at, endorsed_at, issued_at, activated_at, suspended_at,
      closed_at, closed_by, closure_notes,
      created_by, created_at, updated_at,
      permit_type:ptw_types(name, code, color),
      project:ptw_projects(name, reference_id),
      applicant:profiles!ptw_permits_applicant_id_fkey(full_name),
      issuer:profiles!ptw_permits_issuer_id_fkey(full_name),
      site:sites(name)
    `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (filters.search) {
        query = query.or(`reference_id.ilike.%${filters.search}%,job_description.ilike.%${filters.search}%`);
    }
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.typeId) query = query.eq("type_id", filters.typeId);
    if (filters.projectId) query = query.eq("project_id", filters.projectId);
    if (filters.siteId) query = query.eq("site_id", filters.siteId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function getPTWPermit(permitId: string) {
    const { data, error } = await supabase
        .from("ptw_permits")
        .select(`
      id, tenant_id, reference_id, project_id, type_id, status,
      site_id, building_id, floor_zone_id, location_details, gps_lat, gps_lng,
      applicant_id, endorser_id, issuer_id,
      planned_start_time, planned_end_time, actual_start_time, actual_end_time,
      extended_until, extension_count, simops_status, simops_notes,
      risk_assessment_ref, job_description, work_scope,
      emergency_contact_name, emergency_contact_number, evacuation_point,
      requested_at, endorsed_at, issued_at, activated_at, suspended_at,
      closed_at, closed_by, closure_notes,
      created_by, created_at, updated_at,
      permit_type:ptw_types(name, code, color),
      project:ptw_projects(name, reference_id),
      applicant:profiles!ptw_permits_applicant_id_fkey(full_name),
      issuer:profiles!ptw_permits_issuer_id_fkey(full_name),
      site:sites(name)
    `)
        .eq("id", permitId)
        .single();

    if (error) throw error;
    return data;
}

export async function createPTWPermit(data: {
    project_id?: string;
    type_id?: string;
    worker_ids?: string[];
    planned_start_time?: string;
    planned_end_time?: string;
    site_id?: string;
    permit_holder_id?: string;
    job_description?: string;
    work_scope?: string;
    location_details?: string;
    building_id?: string;
    floor_zone_id?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
}, tenantId: string, userId: string) {
    const { data: validationResult, error: validationError } = await supabase.functions.invoke(
        "validate-permit-request",
        {
            body: {
                project_id: data.project_id,
                type_id: data.type_id,
                worker_ids: data.worker_ids || [],
                planned_start_time: data.planned_start_time,
                planned_end_time: data.planned_end_time,
                site_id: data.site_id,
            },
        }
    );

    if (validationError) {
        console.error("Validation error:", validationError);
        throw new Error("Failed to validate permit request");
    }

    if (!validationResult?.is_valid) {
        const errorMessages = validationResult?.errors?.map((e: { message: string }) => e.message).join("; ") || "Validation failed";
        throw new Error(errorMessages);
    }

    const insertData = {
        project_id: data.project_id!,
        type_id: data.type_id!,
        applicant_id: userId,
        job_description: data.job_description,
        work_scope: data.work_scope,
        location_details: data.location_details,
        site_id: data.site_id,
        building_id: data.building_id,
        floor_zone_id: data.floor_zone_id,
        planned_start_time: data.planned_start_time!,
        planned_end_time: data.planned_end_time!,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_number: data.emergency_contact_number,
        tenant_id: tenantId,
        created_by: userId,
    };

    const { data: result, error } = await supabase
        .from("ptw_permits")
        .insert(insertData as never)
        .select()
        .single();

    if (error) throw error;

    if (data.worker_ids && data.worker_ids.length > 0) {
        const { error: updateError } = await supabase
            .from("ptw_permits")
            .update({
                work_scope: JSON.stringify({
                    worker_ids: data.worker_ids,
                    permit_holder_id: data.permit_holder_id,
                }),
            })
            .eq("id", result.id);

        if (updateError) {
            console.error("Failed to store worker assignments:", updateError);
        }
    }

    return result;
}

export async function updatePermitStatus(permitId: string, status: string, userId: string, notes?: string) {
    const updateData: Record<string, unknown> = { status };

    if (status === "endorsed") {
        updateData.endorsed_at = new Date().toISOString();
        updateData.endorser_id = userId;
    } else if (status === "issued") {
        updateData.issued_at = new Date().toISOString();
        updateData.issuer_id = userId;
    } else if (status === "activated") {
        updateData.activated_at = new Date().toISOString();
        updateData.actual_start_time = new Date().toISOString();
    } else if (status === "suspended") {
        updateData.suspended_at = new Date().toISOString();
    } else if (status === "closed") {
        updateData.closed_at = new Date().toISOString();
        updateData.closed_by = userId;
        updateData.closure_notes = notes;
        updateData.actual_end_time = new Date().toISOString();
    } else if (status === "rejected") {
        updateData.closure_notes = notes;
    }

    const { data, error } = await supabase
        .from("ptw_permits")
        .update(updateData)
        .eq("id", permitId)
        .select()
        .single();

    if (error) throw error;

    const notifiableStatuses = ["issued", "rejected", "activated", "suspended", "closed"];
    if (notifiableStatuses.includes(data.status)) {
        try {
            await supabase.functions.invoke("send-ptw-email", {
                body: {
                    permit_id: data.id,
                    notification_type: data.status,
                    rejection_reason: data.status === "rejected" ? notes : undefined,
                },
            });
        } catch (emailError) {
            console.error("Failed to send PTW email notification:", emailError);
        }
    }

    return { ...data, rejectionReason: notes };
}

export async function getActivePermitsForMap(tenantId: string) {
    const { data, error } = await supabase
        .from("ptw_permits")
        .select(`
      id, reference_id, type_id, status, gps_lat, gps_lng, location_details,
      permit_type:ptw_types(name, color)
    `)
        .eq("tenant_id", tenantId)
        .in("status", ["activated", "issued"])
        .is("deleted_at", null);

    if (error) throw error;
    return data;
}

export async function deletePTWPermit(permitId: string) {
    const { error } = await supabase.rpc('soft_delete_ptw_permit', { p_permit_id: permitId });
    if (error) throw error;
    return permitId;
}
