import { z } from 'zod';

const createNotificationSchema = z.object({
  body: z.object({
    message: z.string({ required_error: 'Message is required' }),
  }),
});

export const notificationValidation = {
  createNotificationSchema,
};
