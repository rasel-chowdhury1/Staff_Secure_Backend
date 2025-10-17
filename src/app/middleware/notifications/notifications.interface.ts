import { Types } from 'mongoose';

export type TNotification = {
  senderId: Types.ObjectId | string;
  receiverId: Types.ObjectId | string;
  message: string;
  type: string;
  isRead: boolean;
};
