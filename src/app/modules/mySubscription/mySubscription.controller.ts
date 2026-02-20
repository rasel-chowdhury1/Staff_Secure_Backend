import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';
import { MySubscriptionService } from './mySubscription.service';

const createSubscription = catchAsync(async (req, res) => {
  const { userId } = req.user;
  req.body.employerId = userId;

  const result = await MySubscriptionService.createSubscription(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Subscription created successfully',
    data: result,
  });
});

const getMySubscription = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await MySubscriptionService.getMySubscription(userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'My subscription fetched successfully',
    data: result,
  });
});

const getAllSubscriptions = catchAsync(async (req, res) => {
  const result = await MySubscriptionService.getAllSubscriptions(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Subscriptions fetched successfully',
    data: result,
  });
});

const getSubscriptionById = catchAsync(async (req, res) => {
  const result = await MySubscriptionService.getSubscriptionById(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Subscription fetched successfully',
    data: result,
  });
});

const updateSubscription = catchAsync(async (req, res) => {
  const result = await MySubscriptionService.updateSubscription(req.params.id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Subscription updated successfully',
    data: result,
  });
});

const deleteSubscription = catchAsync(async (req, res) => {
  await MySubscriptionService.deleteSubscription(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Subscription deleted successfully',
    data: null,
  });
});

export const MySubscriptionController = {
  createSubscription,
  getMySubscription,
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
};
