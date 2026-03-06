import { z } from 'zod';

export const patrolRouteSchema = z.object({
    name: z.string().min(1, 'Required'),
    description: z.string().optional().default(''),
    estimated_duration_minutes: z.number().min(5).max(480).default(30),
    checkpoint_radius_meters: z.number().min(5).max(100).default(20),
});

export type PatrolRouteValues = z.infer<typeof patrolRouteSchema>;
