import { z } from 'zod';

export const witnessDocumentUploadSchema = z.object({
  witnessName: z.string().min(1, 'Required'),
  witnessContact: z.string().optional().default(''),
  relationship: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

export type WitnessDocumentUploadFormValues = z.infer<typeof witnessDocumentUploadSchema>;
