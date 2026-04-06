import { z } from 'zod'

export const permitFormSchema = z.object({
    // Step 1
    project_id: z.string().min(1),
    type_id: z.string().min(1),
    site_id: z.string().min(1),
    contractor_id: z.string().optional(),
    contractor_name: z.string().optional(),
    building_id: z.string().optional(),
    floor_zone_id: z.string().optional(),
    location_details: z.string().min(1),
    gps_lat: z.number().optional(),
    gps_lng: z.number().optional(),
    planned_start_time: z.string().min(1),
    planned_end_time: z.string().min(1),
    job_description: z.string().min(1),

    // Step 2
    worker_ids: z.array(z.string()).default([]),
    permit_holder_id: z.string().optional(),

    // Step 3 — dynamic, keep flexible
    operational_data: z.record(z.unknown()).optional()
        .default({}),

    // Step 4
    safety_responses: z.array(z.object({
        requirement_id: z.string(),
        is_checked: z.boolean(),
        comments: z.string().optional(),
    })).optional().default([]),
    emergency_contact_name: z.string().min(1),
    emergency_contact_number: z.string().min(1),
    risk_assessment_ref: z.string().optional(),
})

export type PermitFormData = z.infer<typeof permitFormSchema>
