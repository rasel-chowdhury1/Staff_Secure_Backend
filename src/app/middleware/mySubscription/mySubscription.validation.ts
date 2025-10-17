import { z } from 'zod';

const createSubscriptionSchema = z.object({
  body: z.object({
    type: z.enum(['Bronze', 'Platinum', 'Diamond']),
    buyTime: z.date(),
    howManyMonths: z.number(),
    expireDate: z.date(),
    paymentId: z.string(),
    status: z.enum(['active', 'expired', 'cancelled']).optional(),
  }),
});

const updateSubscriptionSchema = z.object({
  body: z.object({
    type: z.enum(['Bronze', 'Platinum', 'Diamond']).optional(),
    buyTime: z.date().optional(),
    howManyMonths: z.number().optional(),
    expireDate: z.date().optional(),
    paymentId: z.string().optional(),
    status: z.enum(['active', 'expired', 'cancelled']).optional(),
  }),
});

export const mySubscriptionValidation = {
  createSubscriptionSchema,
  updateSubscriptionSchema,
};
