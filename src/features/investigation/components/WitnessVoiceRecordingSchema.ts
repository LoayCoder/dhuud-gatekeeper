import { z } from 'zod';

export const witnessVoiceRecordingSchema = z.object({
  witnessName: z.string().min(1, 'Required'),
  witnessContact: z.string().optional().default(''),
  relationship: z.string().optional().default(''),
});

export type WitnessVoiceRecordingFormValues = z.infer<typeof witnessVoiceRecordingSchema>;
