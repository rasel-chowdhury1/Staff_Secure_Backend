/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import { MySubscription } from './mySubscription.model';
import { TMySubscription } from './mySubscription.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import { User } from '../user/user.model';

const createSubscription = async (payload: TMySubscription) => {
  const subscription = await MySubscription.create(payload);
  return subscription;
};

const getAllSubscriptions = async (query: Record<string, any> = {}) => {
  const baseFilter = { isDeleted: false };

  const subscriptionQuery = new QueryBuilder(MySubscription.find(baseFilter)
    .populate('employerId', 'fullName email')
    .populate('paymentId', 'amount method'), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await subscriptionQuery.modelQuery;
  const meta = await subscriptionQuery.countTotal();

  return { meta, result };
};

const getMySubscription = async (userId: string) => {
  const result = await User.findById(userId).populate('mySubscriptionsId').lean();
  return result
}

const getSubscriptionById = async (id: string) => {
  const subscription = await MySubscription.findById(id);

  if (!subscription || subscription.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');
  }

  return subscription;
};

const updateSubscription = async (id: string, payload: Partial<TMySubscription>) => {
  const subscription = await MySubscription.findById(id);

  if (!subscription || subscription.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');
  }

  const updated = await MySubscription.findByIdAndUpdate(id, payload, { new: true });
  return updated;
};

const deleteSubscription = async (id: string) => {
  const subscription = await MySubscription.findById(id);

  if (!subscription || subscription.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');
  }

  subscription.isDeleted = true;
  await subscription.save();

  return true;
};

export const MySubscriptionService = {
  createSubscription,
  getMySubscription,
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
};
