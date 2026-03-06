import { z } from 'zod';

export const geofenceEscalationSchema = z.object({
    rule_name: z.string().min(1, 'Required'),
    zone_id: z.string().optional().default(''),
    breach_count_threshold: z.coerce.number().min(1),
    time_window_minutes: z.coerce.number().min(5),
    escalation_level: z.coerce.number().min(1).max(3),
    notify_roles: z.array(z.string()).min(1),
    auto_escalate: z.boolean(),
    escalation_delay_minutes: z.coerce.number().min(1),
});

export type GeofenceEscalationValues = z.infer<typeof geofenceEscalationSchema>;
