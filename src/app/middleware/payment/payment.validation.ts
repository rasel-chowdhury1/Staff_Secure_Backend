import { z } from 'zod';


const createStripePaymentSchema = z.object({
  body: z.object({
    subscriptionType: z.enum(['Bronze', 'Platinum', 'Diamond']),
    durationInMonths: z.number(),
    amount: z.number(),
  }),
});

const createPaymentSchema = z.object({
  body: z.object({
    subscriptionType: z.enum(['Bronze', 'Platinum', 'Diamond']),
    durationInMonths: z.number(),
    amount: z.number(),
    paymentId: z.string(),
    paymentMethod: z.enum(['card', 'bank_transfer', 'wallet', 'other']),
    buyTime: z.date(),
    expireDate: z.date(),
    status: z.enum(['success', 'failed', 'pending']).optional(),
  }),
});

const updatePaymentSchema = z.object({
  body: z.object({
    subscriptionType: z.enum(['Bronze', 'Platinum', 'Diamond']).optional(),
    durationInMonths: z.number().optional(),
    amount: z.number().optional(),
    paymentId: z.string().optional(),
    paymentMethod: z.enum(['card', 'bank_transfer', 'wallet', 'other']).optional(),
    buyTime: z.date().optional(),
    expireDate: z.date().optional(),
    status: z.enum(['success', 'failed', 'pending']).optional(),
  }),
});

export const paymentValidation = {
  createStripePaymentSchema,
  createPaymentSchema,
  updatePaymentSchema,
};
