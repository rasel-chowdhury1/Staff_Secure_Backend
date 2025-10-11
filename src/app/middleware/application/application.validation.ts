import { z } from 'zod';

const createApplicationSchema = z.object({
  body: z.object({
    jobId: z.string({
      required_error: 'Job ID is required',
    }),
    jobProviderOwnerId: z.string({
      required_error: 'Job provider owner ID is required',
    }),
    adminNotes: z.string().optional(),
  }),
});

const updateApplicationSchema = z.object({
  body: z.object({
    status: z.enum(['applied', 'forwarded', 'selected', 'rejected']).optional(),
    adminNotes: z.string().optional(),
    aiScore: z.number().optional(),
    aiReason: z.string().optional(),
  }),
});

export const applicationValidation = {
  createApplicationSchema,
  updateApplicationSchema,
};
