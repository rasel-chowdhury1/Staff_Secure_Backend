import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { NotificationService } from './notifications.service';

const createNotification = catchAsync(async (req, res) => {
  const { userId } = req.user;
  req.body.senderId = userId;

  const result = await NotificationService.createNotification(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Notification sent successfully',
    data: result,
  });
});

const getAllNotifications = catchAsync(async (req, res) => {
  const { userId } = req.user;

  const result = await NotificationService.getAllNotifications(userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Notifications fetched successfully',
    data: result,
  });
});



const markAsRead = catchAsync(async (req, res) => {
  const result = await NotificationService.markAsRead(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Notification marked as read',
    data: result,
  });
});

const deleteNotification = catchAsync(async (req, res) => {
  await NotificationService.deleteNotification(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Notification deleted successfully',
    data: null,
  });
});

export const NotificationController = {
  createNotification,
  getAllNotifications,
  markAsRead,
  deleteNotification,
};
