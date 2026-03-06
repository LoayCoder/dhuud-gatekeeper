import { z } from 'zod';

export const geofenceEscalationSchema = z.object({
    rule_name: z.string().min(1, 'Required'),
    zone_id: z.string().optional().default(''),
    breach_count_threshold: z.number().min(1).default(3),
    time_window_minutes: z.number().min(5).default(60),
    escalation_level: z.number().min(1).max(3).default(1),
    notify_roles: z.array(z.string()).default(['security_supervisor']),
    auto_escalate: z.boolean().default(true),
    escalation_delay_minutes: z.number().min(1).default(5),
});

export type GeofenceEscalationValues = z.infer<typeof geofenceEscalationSchema>;
