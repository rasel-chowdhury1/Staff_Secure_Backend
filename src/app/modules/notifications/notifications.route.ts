import { Router } from 'express';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { notificationValidation } from './notification.validation';
import { USER_ROLE } from '../user/user.constants';
import { NotificationController } from './notifications.controller';

export const notificationRoutes = Router();

// Create notification (only admin/employer can send)
notificationRoutes
    .post(
      '/',
      auth(USER_ROLE.ADMIN, USER_ROLE.EMPLOYER),
      validateRequest(notificationValidation.createNotificationSchema),
      NotificationController.createNotification
    )

    // Get all notifications for logged-in user
    .get(
      '/',
      auth(USER_ROLE.ADMIN, USER_ROLE.EMPLOYER, USER_ROLE.CANDIDATE),
      NotificationController.getAllNotifications
    )

    // get my notifications for 




    // Mark notification as read
    .patch(
      '/:id/read',
      auth(USER_ROLE.ADMIN, USER_ROLE.EMPLOYER, USER_ROLE.CANDIDATE),
      NotificationController.markAsRead
    )

    // Delete notification
    .delete(
      '/:id',
      auth(USER_ROLE.ADMIN, USER_ROLE.EMPLOYER, USER_ROLE.CANDIDATE),
      NotificationController.deleteNotification
    );
