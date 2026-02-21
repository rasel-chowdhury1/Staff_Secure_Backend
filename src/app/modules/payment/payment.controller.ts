import { Request, Response } from "express";
import httpStatus from "http-status";
import sendResponse from "../../utils/sendResponse";
import { paymentService } from "./payment.service";
import Stripe from "stripe";
import { stripe } from "./payment.utils";

const createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const {userId} = req.user;
    const {  subscriptionType, promotionCode } = req.body;
    const url = await paymentService.createCheckoutSession(userId, subscriptionType, promotionCode);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Checkout session created successfully",
      data: { url },
    });
  } catch (error: any) {
    console.error(error);
    sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
      data: null,
    });
  }
};

const stripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    res.status(400).send("Missing Stripe signature");
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed.");
    res.status(400).send("Webhook Error");
    return;
  }

  console.log("Webhook received: == =before= ==", event.type);

  // Immediately acknowledge
  res.status(200).send();

    console.log("Webhook received: === after ===", event.type);

  // Process event safely
  try {
    await paymentService.handleWebhook(event);
  } catch (err) {
    console.error("Webhook processing error:", err);
  }
};

const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subscriptionId } = req.body;
    const message = await paymentService.cancelSubscription(subscriptionId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message,
      data: null,
    });
  } catch (error: any) {
    console.error(error);
    sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const paymentController = {
  createCheckoutSession,
  stripeWebhook,
  cancelSubscription,
};



// // payment.controller.ts
// import { Request, Response } from 'express';
// import catchAsync from '../../utils/catchAsync';
// import sendResponse from '../../utils/sendResponse';
// import {
//   createStripeSubscription,
//   completeSubscriptionPayment,
//   cancelSubscriptionPayment,
//   cancelAutoRenewal,
//   resumeAutoRenewal,
// } from './payment.service';
// import { checkSubscriptionStatus } from './payment.cron';
// import { send } from 'process';

// export const createSubscriptionController = catchAsync(
//   async (req: Request, res: Response) => {
//     const { subscriptionType, durationInMonths, amount, discount } = req.body;
//     const employerId = req.user.userId;

//     const result = await createStripeSubscription({
//       employerId,
//       subscriptionType,
//       durationInMonths,
//       amount,
//       discount,
//     });

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: 'Checkout session created',
//       data: result,
//     });
//   }
// );

// export const confirmSubscriptionController = catchAsync(
//   async (req: Request, res: Response) => {
//     const { session_id } = req.query;

//     if (!session_id || typeof session_id !== 'string') {
//       sendResponse(res, {
//         statusCode: 400,
//         success: false,
//         message: 'Invalid session ID',
//         data: null,
//       })
//     }

//     await completeSubscriptionPayment(res, session_id);

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: 'Subscription created',
//       data: null,
//     })
//   }
// );

// export const cancelPaymentController = catchAsync(
//   async (req: Request, res: Response) => {
//     const { session_id } = req.query;

//     if (!session_id || typeof session_id !== 'string') {
//       sendResponse(res, {
//         statusCode: 400,
//         success: false,
//         message: 'Invalid session ID',
//         data: null,
//       })
//     }

//     await cancelSubscriptionPayment(res, session_id);
//   }
// );

// export const cancelAutoRenewalController = catchAsync(
//   async (req: Request, res: Response) => {
//     const employerId = req.user.userId;

//     const result = await cancelAutoRenewal(employerId);

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: 'Auto-renewal cancelled',
//       data: result,
//     });
//   }
// );

// export const resumeAutoRenewalController = catchAsync(
//   async (req: Request, res: Response) => {
//     const employerId = req.user.userId;

//     const result = await resumeAutoRenewal(employerId);

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: 'Auto-renewal resumed',
//       data: result,
//     });
//   }
// );

// export const getSubscriptionStatusController = catchAsync(
//   async (req: Request, res: Response) => {
//     const employerId = req.user.userId;

//     const result = await checkSubscriptionStatus(employerId);

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: 'Subscription status retrieved',
//       data: result,
//     });
//   }
// );


// import httpStatus from 'http-status';
// import sendResponse from '../../utils/sendResponse';
// import catchAsync from '../../utils/catchAsync';
// import { PaymentService } from './payment.service';
// import { Request, Response } from 'express';
// import AppError from '../../error/AppError';
// import { createStripePaymentSession } from './payment.utils';


// const createPaymentSession = catchAsync(async (req: Request, res: Response) => {

//   const { userId } = req.user;
//   req.body.employerId = userId;
  
//   const result = await createStripePaymentSession(req.body)

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Payment session created successfully",
//     data: result,
//   });
// });

// const createPayment = catchAsync(async (req, res) => {
//   const { userId } = req.user;
//   req.body.employerId = userId;

//   const result = await PaymentService.createPayment(req.body);

//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.CREATED,
//     message: 'Payment created successfully',
//     data: result,
//   });
// });

//  const completeSubscriptionPayment = catchAsync(async (req: Request, res: Response) => {

//   const { session_id } = req.query;

//     if (!session_id) {
//       throw new AppError(400, "Missing sessionId ");
//     }

  

//   const result = await PaymentService.completeSubscriptionPayment( res,
//     String(session_id)
//   );

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Payment confirmed successfully",
//     data: result,
//   });
// });

// const cancelSubscriptionPayment = catchAsync(async (req: Request, res: Response) => {

//   const { session_id } = req.query;

//     if (!session_id) {
//       throw new AppError(400, "Missing sessionId ");
//     }

  

//   const result = await PaymentService.cancelSubscriptionPayment(
//     res,
//     String(session_id)
//   );

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Payment cancelled successfully",
//     data: result,
//   });
  
// });

  

// const getAllPayments = catchAsync(async (req, res) => {
//   const result = await PaymentService.getAllPayments(req.query);

//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: 'Payments fetched successfully',
//     data: result,
//   });
// });

// const getAllPaymentsRecived = catchAsync(async (req, res) => {
//   const result = await PaymentService.getAllPaymentsRecived(req.query);

//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: 'Recived payments fetched successfully',
//     data: result,
//   });

// })

// const getPaymentById = catchAsync(async (req, res) => {
//   const result = await PaymentService.getPaymentById(req.params.id);

//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: 'Payment fetched successfully',
//     data: result,
//   });
// });

// const updatePayment = catchAsync(async (req, res) => {
//   const result = await PaymentService.updatePayment(req.params.id, req.body);

//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: 'Payment updated successfully',
//     data: result,
//   });
// });

// const deletePayment = catchAsync(async (req, res) => {
//   await PaymentService.deletePayment(req.params.id);

//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: 'Payment deleted successfully',
//     data: null,
//   });
// });

// export const PaymentController = {
//   createPaymentSession,
//   createPayment,
//   completeSubscriptionPayment,
//   cancelSubscriptionPayment,
//   getAllPayments,
//   getAllPaymentsRecived,
//   getPaymentById,
//   updatePayment,
//   deletePayment,
// };
