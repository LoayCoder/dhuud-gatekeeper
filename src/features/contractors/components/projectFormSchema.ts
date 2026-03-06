import { z } from 'zod'

const coordinateSchema = z.object({
    lat: z.number(),
    lng: z.number(),
})

export const projectFormSchema = z.object({
    // Required fields
    company_id: z.string().min(1, 'Company is required'),
    project_code: z.string().min(1, 'Project code is required'),
    project_name: z.string().min(1, 'Project name is required'),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    project_manager_id: z.string().min(1, 'Project manager is required'),

    // Optional fields
    project_name_ar: z.string().optional().default(''),
    location_description: z.string().optional().default(''),
    notes: z.string().optional().default(''),
    branch_id: z.string().optional().default(''),
    site_id: z.string().optional().default(''),
    department_id: z.string().optional().default(''),

    // Location fields
    latitude: z.number().nullable().default(null),
    longitude: z.number().nullable().default(null),
    boundary_polygon: z.array(coordinateSchema).nullable().default(null) as z.ZodType<{ lat: number; lng: number }[] | null>,
    geofence_radius_meters: z.number().default(100),
})

export type ProjectFormValues = z.infer<typeof projectFormSchema>
