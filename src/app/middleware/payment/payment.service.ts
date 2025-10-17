// payment.service.ts
import Stripe from "stripe";
import mongoose from "mongoose";
import AppError from "../../error/AppError";
import { Payment } from "./payment.model";
import { User } from "../user/user.model";
import config from "../../config";
import { MySubscription } from "../mySubscription/mySubscription.model";
import { sendEmployerSubscriptionActivatedEmail } from "../../utils/eamilNotifiacation";

export const stripe = new Stripe(config.stripe.stripe_api_secret as string, {
  apiVersion: "2025-09-30.clover",
  typescript: true,
});

const calculateAmount = (amount: number) => Math.round(Number(amount) * 100);

// Create Stripe Subscription
export const createStripeSubscription = async (payload: {
  employerId: string;
  subscriptionType: 'Bronze' | 'Platinum' | 'Diamond';
  durationInMonths: number;
  amount: number;
  discount?: number;
}) => {
  const { employerId, subscriptionType, durationInMonths, amount, discount = 0 } = payload;

  if (!employerId || !subscriptionType || !durationInMonths || !amount) {
    throw new AppError(400, 'Missing required payment details');
  }

  const finalAmount = amount - discount;
  if (finalAmount < 0) throw new AppError(400, 'Discount cannot exceed amount');

  const user = await User.findById(employerId);
  if (!user) throw new AppError(404, 'User not found');

  let stripeCustomerId = (user as any).stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.companyName || user.email,
      metadata: {
        userId: employerId,
      },
    });
    stripeCustomerId = customer.id;
    await User.findByIdAndUpdate(employerId, { stripeCustomerId });
  }

  const price = await stripe.prices.create({
    currency: 'gbp',
    unit_amount: calculateAmount(finalAmount),
    recurring: {
      interval: 'month',
      interval_count: 1,
    },
    nickname: `${subscriptionType} subscription - Monthly auto-renewal`,
    product_data: {
      name: `${subscriptionType} Subscription`,
      // description: `${subscriptionType} subscription - Monthly auto-renewal`,
    },
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    success_url: `${config.backend_url}/api/v1/payment/confirm-subscription?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.backend_url}/api/v1/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
    subscription_data: {
      metadata: {
        employerId,
        subscriptionType,
        durationInMonths: durationInMonths.toString(),
      },
    },
    metadata: {
      employerId,
      subscriptionType,
      durationInMonths: durationInMonths.toString(),
    },
  });

  const yearEndDate = new Date();
  yearEndDate.setFullYear(yearEndDate.getFullYear() + 1);

  const paymentRecord = await Payment.create({
    employerId: new mongoose.Types.ObjectId(employerId),
    subscriptionType,
    durationInMonths,
    amount,
    discount,
    finalAmount,
    paymentId: session.id,
    paymentMethod: '',
    buyTime: new Date(),
    expireDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    status: 'pending',
    isDeleted: false,
    isRenewal: false,
  });

  return {
    checkoutUrl: session.url,
    paymentId: paymentRecord._id,
    finalAmount,
    currency: 'GBP',
    sessionId: session.id,
  };
};

// Complete Subscription Payment
export const completeSubscriptionPayment = async (res: any, sessionId: string) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const stripeSubscription = session.subscription as Stripe.Subscription;

    if (!stripeSubscription) {
      throw new AppError(400, "Subscription not found in Stripe session");
    }

    const payment = await Payment.findOne({ paymentId: sessionId }).session(dbSession);

    if (!payment) {
      throw new AppError(404, "Payment record not found");
    }

    if (session.payment_status === "paid") {
      payment.status = "success";
      payment.paymentMethod = "card";
      await payment.save({ session: dbSession });

      const yearEndDate = new Date();
      yearEndDate.setFullYear(yearEndDate.getFullYear() + 1);

      const expireDate = new Date();
      expireDate.setMonth(expireDate.getMonth() + 1);

      const subscription = await MySubscription.create(
        [
          {
            employerId: payment.employerId,
            type: payment.subscriptionType,
            buyTime: new Date(),
            howManyMonths: 1,
            expireDate,
            paymentId: payment._id,
            status: "active",
            isDeleted: false,
            autoRenewal: true,
            stripeSubscriptionId: stripeSubscription.id,
            yearEndDate,
            renewalCount: 0,
          },
        ],
        { session: dbSession }
      );

      await Payment.findByIdAndUpdate(
        payment._id,
        { subscriptionId: subscription[0]._id },
        { session: dbSession }
      );

      await User.findByIdAndUpdate(
        payment.employerId,
        { mySubscriptionsId: subscription[0]._id },
        { session: dbSession }
      );

      const user = await User.findById(payment.employerId).session(dbSession);

      if (user?.email && payment.subscriptionType !== 'Bronze') {
        console.log(`📧 Subscription activated for ${user.email}`);

                    // Fire-and-forget: send email without waiting
            sendEmployerSubscriptionActivatedEmail({
              sentTo: user.email,
              subject: `Your ${payment.subscriptionType} subscription is now active`,
              companyName: user.companyName || 'Your Company',
              packageType: payment.subscriptionType,
            })
              .then(() => console.log(`📧 Subscription activated email sent to ${user.email}`))
              .catch((emailError) =>
                console.error('❌ Failed to send subscription email:', emailError)
              );
      }

      console.log(`✅ Subscription created: ${subscription[0]._id}`);
    } else {
      payment.status = "failed";
      await payment.save({ session: dbSession });
    }

    await dbSession.commitTransaction();
    dbSession.endSession();

    const redirectUrl = config.frontend_url + '/payment-success';
    res.redirect(redirectUrl);
  } catch (error) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    console.error("❌ Transaction rolled back:", error);
    throw error;
  }
};

// Cancel Subscription Payment
export const cancelSubscriptionPayment = async (res: any, sessionId: string) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const payment = await Payment.findOne({ paymentId: sessionId }).session(dbSession);

    if (!payment) {
      throw new AppError(404, "Payment record not found");
    }

    if (payment.status !== "pending") {
      throw new AppError(400, `Cannot cancel payment with status: ${payment.status}`);
    }

    try {
      await stripe.checkout.sessions.expire(sessionId);
      console.log(`✅ Stripe session ${sessionId} expired`);
    } catch (err) {
      console.warn(`⚠️ Could not expire Stripe session: ${err}`);
    }

    payment.status = "cancelled";
    await payment.save({ session: dbSession });

    await dbSession.commitTransaction();
    dbSession.endSession();

    res.redirect(config.frontend_url + "/packages");
  } catch (error) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    console.error("❌ Transaction rolled back:", error);
    throw error;
  }
};

// Cancel Auto Renewal
export const cancelAutoRenewal = async (employerId: string) => {
  const user = await User.findById(employerId);
  if (!user) throw new AppError(404, 'User not found');

  const subscription = await MySubscription.findOne({
    _id: new mongoose.Types.ObjectId(user.mySubscriptionsId),
    employerId: new mongoose.Types.ObjectId(employerId),
    status: 'active',
    isDeleted: false,
  });

  if (!subscription) {
    throw new AppError(404, 'No active subscription found');
  }

  if (!subscription.stripeSubscriptionId) {
    throw new AppError(400, 'No Stripe subscription ID found');
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  subscription.autoRenewal = false;
  await subscription.save();

  return {
    message: 'Auto-renewal cancelled. Subscription remains active until expiry.',
    expireDate: subscription.expireDate,
  };
};

// Resume Auto Renewal
export const resumeAutoRenewal = async (employerId: string) => {

  const user = await User.findById(employerId);
  if (!user) throw new AppError(404, 'User not found');
  const subscription = await MySubscription.findOne({
    _id: new mongoose.Types.ObjectId(user.mySubscriptionsId),
    employerId: new mongoose.Types.ObjectId(employerId),
    status: 'active',
    isDeleted: false,
  });

  if (!subscription) {
    throw new AppError(404, 'No active subscription found');
  }

  if (!subscription.stripeSubscriptionId) {
    throw new AppError(400, 'No Stripe subscription ID found');
  }

  const now = new Date();
  if (now >= subscription.yearEndDate) {
    throw new AppError(400, 'Cannot resume after 1-year period');
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  subscription.autoRenewal = true;
  await subscription.save();

  return {
    message: 'Auto-renewal resumed successfully',
    nextRenewalDate: subscription.expireDate,
  };
};

// /* eslint-disable @typescript-eslint/no-explicit-any */
// import httpStatus from 'http-status';
// import AppError from '../../error/AppError';
// import { Payment } from './payment.model';
// import { TPayment } from './payment.interface';
// import QueryBuilder from '../../builder/QueryBuilder';
// import mongoose from 'mongoose';
// import { stripe } from './payment.utils';
// import { MySubscription } from '../mySubscription/mySubscription.model';
// import { User } from '../user/user.model';
// import { red } from 'colorette';
// import { sendEmployerSubscriptionActivatedEmail } from '../../utils/eamilNotifiacation';
// import config from '../../config';

// const createPayment = async (payload: TPayment) => {
//   const payment = await Payment.create(payload);
//   return payment;
// };



// const completeSubscriptionPayment = async (res: any, sessionId: string) => {
//   const dbSession = await mongoose.startSession();
//   dbSession.startTransaction();

//   try {
//     // 1️⃣ Retrieve Stripe Checkout Session
//     const session = await stripe.checkout.sessions.retrieve(sessionId);
//     const paymentIntentId = session.payment_intent as string | null;

//     if (!paymentIntentId) {
//       throw new AppError(400, "Payment intent not found in Stripe session");
//     }

//     // 2️⃣ Retrieve PaymentIntent to check status
//     const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

//     // 3️⃣ Find local payment record by sessionId
//     const payment = await Payment.findOne({ paymentId: sessionId }).session(dbSession);
//     if (!payment) {
//       throw new AppError(404, "Payment record not found for this session");
//     }

//     // 4️⃣ Update payment status
//     if (paymentIntent.status === "succeeded") {
//       payment.status = "success";
//       payment.paymentMethod = paymentIntent.payment_method_types?.[0] || "card" as any;
//       await payment.save({ session: dbSession });

//       // 5️⃣ Create new MySubscription
//       const expireDate = new Date(new Date().setMonth(new Date().getMonth() + payment.durationInMonths));

//       const subscription = await MySubscription.create(
//         [
//           {
//             employerId: payment.employerId,
//             type: payment.subscriptionType,
//             buyTime: new Date(),
//             howManyMonths: payment.durationInMonths,
//             expireDate,
//             paymentId: payment._id,
//             status: "active",
//             isDeleted: false,
//           },
//         ],
//         { session: dbSession }
//       );

//       // 6️⃣ Update User reference to latest MySubscription
//       const user = await User.findByIdAndUpdate(
//         payment.employerId,
//         { mySubscriptionsId: subscription[0]._id },
//         { session: dbSession }
//       );

//         if (user?.email) {

//           if(payment.subscriptionType !== 'Bronze') {
            
//             // Fire-and-forget: send email without waiting
//             sendEmployerSubscriptionActivatedEmail({
//               sentTo: user.email,
//               subject: `Your ${payment.subscriptionType} subscription is now active`,
//               companyName: user.companyName || 'Your Company',
//               packageType: payment.subscriptionType,
//             })
//               .then(() => console.log(`📧 Subscription activated email sent to ${user.email}`))
//               .catch((emailError) =>
//                 console.error('❌ Failed to send subscription email:', emailError)
//               );
//           }
//           }
//       console.log(`✅ Payment completed & new subscription created for employer: ${payment.employerId}`);
//     } else {
//       payment.status = "failed";
//       await payment.save({ session: dbSession });
//       console.log(`❌ Payment failed for session: ${sessionId}`);
//     }



//     await dbSession.commitTransaction();
//     dbSession.endSession();

//     const redirectUrl = config.frontend_url + '/payment-success';

//     if(redirectUrl) {
//       res.redirect(redirectUrl);
//     }

//     // res.redirect("http://localhost:3000");
//     // return payment;
//   } catch (error) {
//     await dbSession.abortTransaction();
//     dbSession.endSession();
//     console.error("❌ Transaction rolled back due to error:", error);
//     throw error;
//   }
// };

// const cancelSubscriptionPayment = async (res: any,sessionId: string) => {
//   const dbSession = await mongoose.startSession();
//   dbSession.startTransaction();

//   try {
//     // 1️⃣ Find local payment record
//     const payment = await Payment.findOne({ paymentId: sessionId }).session(dbSession);
//     if (!payment) {
//       throw new AppError(404, "Payment record not found for this session");
//     }

//     // 2️⃣ Only allow cancel if payment is pending
//     if (payment.status !== "pending") {
//       throw new AppError(400, `Cannot cancel a payment with status: ${payment.status}`);
//     }

//     // 3️⃣ Cancel the Stripe session (if still pending)
//     try {
//       await stripe.checkout.sessions.expire(sessionId);
//       console.log(`✅ Stripe session ${sessionId} expired successfully`);
//     } catch (err) {
//       console.warn(`⚠️ Could not expire Stripe session: ${err}`);
//       // Continue: the payment record should still be marked as cancelled
//     }

//     // 4️⃣ Update local payment status
//     payment.status = "cancelled";
//     await payment.save({ session: dbSession });

//     await dbSession.commitTransaction();
//     dbSession.endSession();

    
//     // return payment;
//     res.redirect("http://localhost:3000/packages");
//   } catch (error) {
//     await dbSession.abortTransaction();
//     dbSession.endSession();
//     console.error("❌ Transaction rolled back due to error:", error);
//     throw error;
//   }
// };


// const getAllPayments = async (query: Record<string, any> = {}) => {
//   const baseFilter = { isDeleted: false };

//   const paymentQuery = new QueryBuilder(
//     Payment.find(baseFilter).populate('employerId', 'fullName email'),
//     query
//   )
//     .filter()
//     .sort()
//     .paginate()
//     .fields();

//   const result = await paymentQuery.modelQuery;
//   const meta = await paymentQuery.countTotal();

//   return { meta, result };
// };

// const getAllPaymentsRecived = async (query: Record<string, any> = {}) => {
//   const baseFilter = { isDeleted: false, status: "success" };

//   const paymentQuery = new QueryBuilder(
//     Payment.find(baseFilter).populate('employerId', 'name email phone companyName'),
//     query
//   )
//      .search(["employerId.name", "employerId.email", "employerId.phone", 'employerId.companyName', "subscriptionType", "paymentId", "paymentMethod"])
//     .filter()
//     .sort()
//     .paginate()
//     .fields();

//   const result = await paymentQuery.modelQuery;
//   const meta = await paymentQuery.countTotal();

//   return { meta, result };
// };

// const getPaymentById = async (id: string) => {
//   const payment = await Payment.findById(id);

//   if (!payment || payment.isDeleted) {
//     throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
//   }

//   return payment;
// };

// const updatePayment = async (id: string, payload: Partial<TPayment>) => {
//   const payment = await Payment.findById(id);

//   if (!payment || payment.isDeleted) {
//     throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
//   }

//   const updated = await Payment.findByIdAndUpdate(id, payload, { new: true });
//   return updated;
// };

// const deletePayment = async (id: string) => {
//   const payment = await Payment.findById(id);

//   if (!payment || payment.isDeleted) {
//     throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
//   }

//   payment.isDeleted = true;
//   await payment.save();

//   return true;
// };

// export const PaymentService = {
//   createPayment,
//   completeSubscriptionPayment,
//   cancelSubscriptionPayment,
//   getAllPayments,
//   getAllPaymentsRecived,
//   getPaymentById,
//   updatePayment,
//   deletePayment,
// };
