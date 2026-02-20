import { Router } from 'express';
import { MySubscriptionController } from './mySubscription.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../user/user.constants';
import { mySubscriptionValidation } from './mySubscription.validation';

export const mySubscriptionRoutes = Router();

// Employer creates a subscription
mySubscriptionRoutes
    .post(
        '/',
        auth(USER_ROLE.EMPLOYER),
        validateRequest(mySubscriptionValidation.createSubscriptionSchema),
        MySubscriptionController.createSubscription,
    )

    // Get all subscriptions (admin)
    .get(
        '/',
        auth(USER_ROLE.ADMIN),
        MySubscriptionController.getAllSubscriptions,
    )

    .get(
        '/my',
        auth(USER_ROLE.CANDIDATE, USER_ROLE.EMPLOYER, USER_ROLE.ADMIN),
        MySubscriptionController.getMySubscription,
    )

    // Get a single subscription by ID
    .get(
        '/:id',
        auth(USER_ROLE.ADMIN, USER_ROLE.EMPLOYER),
        MySubscriptionController.getSubscriptionById,
    )

    // Update subscription (admin/employer)
    .patch(
        '/:id',
        auth(USER_ROLE.ADMIN, USER_ROLE.EMPLOYER),
        validateRequest(mySubscriptionValidation.updateSubscriptionSchema),
        MySubscriptionController.updateSubscription,
    )

    // Soft delete subscription (admin)
    .delete(
        '/:id',
        auth(USER_ROLE.ADMIN),
        MySubscriptionController.deleteSubscription,
    );
