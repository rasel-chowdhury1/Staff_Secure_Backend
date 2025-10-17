/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../error/AppError';
import httpStatus from 'http-status';
import QueryBuilder from '../../builder/QueryBuilder';
import { TNotification } from './notifications.interface';
import { Notification } from './notifications.model';
import mongoose from 'mongoose';

const createNotification = async (payload: TNotification) => {
  const notification = await Notification.create(payload);
  return notification;
};

const getAllNotifications = async (userId: string, query: Record<string, any> = {}) => {
  const baseFilter = { receiverId: new mongoose.Types.ObjectId(userId) };

  const notificationQuery = new QueryBuilder(
    Notification.find(baseFilter).populate('senderId', 'fullName email'),
    query
  )
    .sort()
    .paginate()
    .fields();

  const result = await notificationQuery.modelQuery;
  const meta = await notificationQuery.countTotal();

  return { meta, result };
};


const markAsRead = async (id: string) => {
  const notification = await Notification.findById(id);

  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  notification.isRead = true;
  await notification.save();
  return notification;
};

const deleteNotification = async (id: string) => {
  const notification = await Notification.findById(id);

  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  await notification.deleteOne();
  return true;
};

export const NotificationService = {
  createNotification,
  getAllNotifications,
  markAsRead,
  deleteNotification,
};
