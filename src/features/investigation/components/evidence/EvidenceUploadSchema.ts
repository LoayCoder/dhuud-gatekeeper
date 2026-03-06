import { z } from 'zod';

export const evidenceUploadSchema = z.object({
  evidenceType: z.enum(['photo', 'document', 'cctv', 'ptw', 'checklist', 'video_clip']),
  description: z.string().optional().default(''),
  referenceId: z.string().optional().default(''),
});

export type EvidenceUploadFormValues = z.infer<typeof evidenceUploadSchema>;
