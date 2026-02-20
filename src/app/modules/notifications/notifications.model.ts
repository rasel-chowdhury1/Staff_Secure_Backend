import { model, Schema } from 'mongoose';
import { TNotification } from './notifications.interface';

const notificationSchema = new Schema<TNotification>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['message', 'other'],
      default: 'other'
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Notification = model<TNotification>(
  'Notification',
  notificationSchema
);
