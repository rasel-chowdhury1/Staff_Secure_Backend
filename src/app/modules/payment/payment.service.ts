import Stripe from "stripe";
import { User } from "../user/user.model";
import { MySubscription } from "../mySubscription/mySubscription.model";
import { Payment } from "./payment.model";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

const stripePriceIds: Record<
  "Bronze" | "Platinum" | "Diamond",
  string
> = {
  Bronze: process.env.STRIPE_BRONZE_PRICE_ID!,
  Platinum: process.env.STRIPE_PLATINUM_PRICE_ID!,
  Diamond: process.env.STRIPE_DIAMOND_PRICE_ID!,
};

export const createCheckoutSession = async (
  userId: string,
  subscriptionType: "Bronze" | "Platinum" | "Diamond",
  promotionCode?: string
): Promise<string> => {
  // ================================
  // 1️⃣ Find User
  // ================================
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // ================================
  // 2️⃣ Prevent Multiple Active Subscriptions
  // ================================
  const activeSubscription = await MySubscription.findOne({
    employerId: user._id,
    status: "active",
  });

  if (activeSubscription) {
    throw new Error("User already has an active subscription");
  }

  // ================================
  // 3️⃣ Create / Reuse Stripe Customer
  // ================================
  let customerId = user.stipeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: user._id.toString(),
      },
    });

    customerId = customer.id;
    user.stipeCustomerId = customerId;
    await user.save();
  }

  // ================================
  // 4️⃣ Validate Price
  // ================================
  const priceId = stripePriceIds[subscriptionType];
  if (!priceId) {
    throw new Error("Invalid subscription type");
  }

  // ================================
  // 5️⃣ Create Checkout Session
  // ================================
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    payment_method_types: ["card"],

    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],

    discounts: promotionCode
      ? [{ promotion_code: promotionCode }]
      : undefined,

    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,

    metadata: {
      userId: user._id.toString(),
      subscriptionType,
    },

    subscription_data: {
      metadata: {
        userId: user._id.toString(),
        subscriptionType,
      },
    },
  });

  if (!session.url) {
    throw new Error("Failed to create Stripe checkout session");
  }

  return session.url;
};



const handleWebhook = async (event: Stripe.Event) => {
  console.log("Stripe Event:", event.type);

  try {
    // =========================================================
    // 1️⃣ PAYMENT SUCCESS (First + Renewal)
    // =========================================================
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;

      console.log("==== invoice.payment_succeeded =>>>>> ", invoice)

      // 🔹 Safely get subscription ID
      const subscriptionId =
        ((invoice as any).subscription as string) ||
        (invoice.parent?.subscription_details?.subscription as string);

      if (!subscriptionId) {
        console.log("No subscription ID found for invoice:", invoice.id);
        return;
      }


      // 🔥 Prevent duplicate webhook retry
      const existingPayment = await Payment.findOne({
        paymentId: invoice.id,
      });

      if (existingPayment) {
        console.log("Duplicate webhook ignored");
        return;
      }

      // Get Stripe Subscription
      const stripeSub = await stripe.subscriptions.retrieve(
        subscriptionId as string
      );

      console.log("==== stripeSub =>>>>> ", stripeSub)

      const user = await User.findOne({
        stipeCustomerId: stripeSub.customer,
      });

      if (!user) return;

      const line = invoice.lines.data[0];

      const periodStart = new Date(line.period.start * 1000);
      const periodEnd = new Date(line.period.end * 1000);

      const discount =
        invoice.total_discount_amounts?.length
          ? invoice.total_discount_amounts[0].amount / 100
          : 0;

      const finalAmount = invoice.amount_paid / 100;

      console.log("subscriptionType items data =>>>>> ", stripeSub.items.data)
      const subscriptionType =
        stripeSub.items.data[0].price.nickname  || stripeSub.metadata.subscriptionType  as
          | "Bronze"
          | "Platinum"
          | "Diamond";

      // =====================================================
      // Create Payment
      // =====================================================
      const paymentDoc = await Payment.create({
        employerId: user._id,
        subscriptionType,
        durationInMonths: 1,
        amount: finalAmount + discount,
        discount,
        finalAmount,
        paymentId: invoice.id,
        paymentMethod: "card",
        buyTime: periodStart,
        expireDate: periodEnd,
        status: "success",
        stripeInvoiceId: invoice.id,
        isRenewal: invoice.billing_reason === "subscription_cycle",
      });

      // =====================================================
      // Update or Create Subscription
      // =====================================================
      let mySub = await MySubscription.findOne({
        stripeSubscriptionId: stripeSub.id,
      });

      if (mySub) {
        // 🔁 Renewal
        mySub.expireDate = periodEnd;
        mySub.paymentId = paymentDoc._id;
        mySub.status = "active";
        mySub.renewalCount += 1;
        await mySub.save();

        paymentDoc.subscriptionId = mySub._id;
        await paymentDoc.save();
      } else {
        // 🆕 First Time Subscription
        mySub = await MySubscription.create({
          employerId: user._id,
          type: subscriptionType,
          buyTime: periodStart,
          howManyMonths: 12,
          expireDate: periodEnd,
          paymentId: paymentDoc._id,
          status: "active",
          autoRenewal: true,
          stripeSubscriptionId: stripeSub.id,
          yearEndDate: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1)
          ),
        });

        user.mySubscriptionsId = mySub._id;
        await user.save();

        paymentDoc.subscriptionId = mySub._id;
        await paymentDoc.save();
      }

      console.log("Payment processed successfully");
      return;
    }

    // =========================================================
    // 2️⃣ PAYMENT FAILED
    // =========================================================
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;

      console.log("==== invoice.payment_failed =>>>>> ", invoice)

      await MySubscription.findOneAndUpdate(
        { stripeSubscriptionId: invoice.subscription },
        { status: "expired" }
      );

      console.log("Subscription marked as expired (payment failed)");
      return;
    }

    // =========================================================
    // 3️⃣ SUBSCRIPTION CANCELLED
    // =========================================================
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      await MySubscription.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        {
          status: "cancelled",
          autoRenewal: false,
        }
      );

      console.log("Subscription cancelled successfully");
      return;
    }

    console.log("Unhandled event:", event.type);
  } catch (error) {
    console.error("Webhook processing error:", error);
  }
};


// morning work feature

// import Stripe from 'stripe'
// import { User } from '../user/user.model'
// import { Payment } from './payment.model'
// import { MySubscription } from '../mySubscription/mySubscription.model'

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2025-09-30.clover',
// })

// const stripePriceIds: Record<string, string> = {
//   Bronze: process.env.STRIPE_BRONZE_PRICE_ID!,
//   Platinum: process.env.STRIPE_PLATINUM_PRICE_ID!,
//   Diamond: process.env.STRIPE_DIAMOND_PRICE_ID!,
// }

// const createCheckoutSession = async (
//   userId: string,
//   subscriptionType: string,
//   promotionCode?: string
// ): Promise<string> => {
//   const user = await User.findById(userId)
//   if (!user) throw new Error('User not found')

//   console.log({
//     userId,
//     subscriptionType,
//     promotionCode,
//   })

//   // Create Stripe customer if not exists
//   let customerId = user.stipeCustomerId
//   if (!customerId) {
//     const customer = await stripe.customers.create({ email: user.email })
//     customerId = customer.id
//     user.stipeCustomerId = customerId
//     await user.save()
//   }

//   const priceId = stripePriceIds[subscriptionType]
//   if (!priceId) throw new Error('Invalid subscription type')

//   const session = await stripe.checkout.sessions.create({
//     mode: 'subscription',
//     payment_method_types: ['card'],
//     line_items: [{ price: priceId, quantity: 1 }],
//     discounts: promotionCode ? [{ promotion_code: promotionCode }] : [],
//     customer: customerId,
//     success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}`,
//     cancel_url: `http://localhost:3000/cancel`,
//     metadata: {
//       userId,
//       subscriptionType,
//     },
//   })
//   if (!session.url) {
//     throw new Error('Failed to create Stripe checkout session URL')
//   }


//   return session.url // Now guaranteed to be string
// }

// export const handleWebhook = async (event: Stripe.Event) => {
  
//   console.log("handleWebhook called here event =>>>>> ", event.type);

  

//   // === 1️⃣ First-time subscription completed ===
//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object as Stripe.Checkout.Session;
//     console.log("Payment succeeded from completed event:", session);

//     if (!session.subscription || !session.customer) return;

//     const subscription = await stripe.subscriptions.retrieve(
//       session.subscription as string
//     );
//     const user = await User.findOne({ stipeCustomerId: session.customer });
//     if (!user) return;

//     const buyTime = new Date();
//     const expireDate = new Date();
//     expireDate.setMonth(expireDate.getMonth() + 1); // first month expiry

//     let discount = 0;
//     if (session.total_details?.amount_discount)
//       discount = session.total_details.amount_discount / 100;

//     const finalAmount = session.amount_total! / 100;

//     try {
//       const paymentDoc = await Payment.create({
//         employerId: user._id,
//         subscriptionType: ( session as any ).metadata.subscriptionType,
//         durationInMonths: 1,
//         amount: finalAmount + discount,
//         discount,
//         finalAmount,
//         paymentId: session.id,
//         paymentMethod: session.payment_method_types[0],
//         buyTime,
//         expireDate,
//         status: "success",
//         stripeInvoiceId: session.subscription,
//         isRenewal: false,
//       });

//       const mySub = await MySubscription.create({
//         employerId: user._id,
//         type: ( session as any ).metadata.subscriptionType,
//         buyTime,
//         howManyMonths: 12,
//         expireDate: new Date(expireDate.setMonth(expireDate.getMonth() + 12)),
//         paymentId: paymentDoc._id,
//         status: "active",
//         stripeSubscriptionId: subscription.id,
//         yearEndDate: new Date(
//           new Date().setFullYear(new Date().getFullYear() + 1)
//         ),
//       });

//       user.mySubscriptionsId = mySub._id;
//       await user.save();
      
//       return
//     } catch (error) {
//       console.log("Error creating payment or subscription:", error);
//     }
//   }

//   // === 2️⃣ Recurring payment success ===
//   else if (
//     event.type === "invoice.paid" ||
//     event.type === "invoice.payment_succeeded"
//   ) {
//     const invoice = event.data.object as Stripe.Invoice;

//     // subscription ID comes from invoice.subscription
//     const subscriptionId = invoice.subscription as string;
//     if (!subscriptionId) {
//       console.log("Recurring invoice does not have subscription ID");
//       return;
//     }

//     const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
//     const user = await User.findOne({ stipeCustomerId: stripeSub.customer });
//     if (!user) return;

//     const buyTime = new Date();
//     const expireDate = new Date();
//     expireDate.setMonth(expireDate.getMonth() + 1); // 1 month for recurring

//     await Payment.create({
//       employerId: user._id,
//       subscriptionType: stripeSub.items.data[0].plan.nickname,
//       durationInMonths: 1,
//       amount: invoice.amount_paid / 100,
//       discount: 0,
//       finalAmount: invoice.amount_paid / 100,
//       paymentId: invoice.id,
//       paymentMethod: invoice.payment_settings?.payment_method_types?.[0] || "card",
//       buyTime,
//       expireDate,
//       status: "success",
//       stripeInvoiceId: subscriptionId,
//       isRenewal: true,
//     });
//     console.log("Recurring payment saved successfully");
//   }

//   // === 3️⃣ Failed payment ===
//   else if (event.type === "invoice.payment_failed") {
//     console.log("Payment failed:", event.data.object);
//   }

//   // === 4️⃣ Subscription cancelled ===
//   else if (event.type === "customer.subscription.deleted") {
//     console.log("Subscription canceled:", event.data.object);
//   }

//   // === 5️⃣ All other events ===
//   else {
//     console.log("Unhandled event type:", event.type);
//   }
// };

const cancelSubscription = async (subscriptionId: string): Promise<string> => {

  const mySub = await MySubscription.findById(subscriptionId)

  if (!mySub) throw new Error('Subscription not found')

  const now = new Date()

  const diffDays = Math.floor(
    (now.getTime() - mySub.buyTime.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays <= 3) {
    await stripe.subscriptions.del(mySub.stripeSubscriptionId!)
    mySub.status = 'cancelled'
    mySub.autoRenewal = false
    await mySub.save()
    return 'Cancelled within 3 days. Only first month charged.'
  } else {
    await stripe.subscriptions.update(mySub.stripeSubscriptionId!, {
      cancel_at_period_end: true,
    })
    mySub.autoRenewal = false
    await mySub.save()
    return 'Subscription will cancel at the end of the current billing cycle.'
  }
}

export const paymentService = {
  createCheckoutSession,
  handleWebhook,
  cancelSubscription,
}

// // payment.service.ts
// import Stripe from "stripe";
// import mongoose from "mongoose";
// import AppError from "../../error/AppError";
// import { Payment } from "./payment.model";
// import { User } from "../user/user.model";
// import config from "../../config";
// import { MySubscription } from "../mySubscription/mySubscription.model";
// import { sendEmployerSubscriptionActivatedEmail } from "../../utils/eamilNotifiacation";

// export const stripe = new Stripe(config.stripe.stripe_api_secret as string, {
//   apiVersion: "2025-09-30.clover",
//   typescript: true,
// });

// const calculateAmount = (amount: number) => Math.round(Number(amount) * 100);

// // Create Stripe Subscription
// export const createStripeSubscription = async (payload: {
//   employerId: string;
//   subscriptionType: 'Bronze' | 'Platinum' | 'Diamond';
//   durationInMonths: number;
//   amount: number;
//   discount?: number;
// }) => {
//   const { employerId, subscriptionType, durationInMonths, amount, discount = 0 } = payload;

//   if (!employerId || !subscriptionType || !durationInMonths || !amount) {
//     throw new AppError(400, 'Missing required payment details');
//   }

//   const finalAmount = amount - discount;
//   if (finalAmount < 0) throw new AppError(400, 'Discount cannot exceed amount');

//   const user = await User.findById(employerId);
//   if (!user) throw new AppError(404, 'User not found');

//   let stripeCustomerId = (user as any).stripeCustomerId;

//   if (!stripeCustomerId) {
//     const customer = await stripe.customers.create({
//       email: user.email,
//       name: user.companyName || user.email,
//       metadata: {
//         userId: employerId,
//       },
//     });
//     stripeCustomerId = customer.id;
//     await User.findByIdAndUpdate(employerId, { stripeCustomerId });
//   }

//   const price = await stripe.prices.create({
//     currency: 'gbp',
//     unit_amount: calculateAmount(finalAmount),
//     recurring: {
//       interval: 'month',
//       interval_count: 1,
//     },
//     nickname: `${subscriptionType} subscription - Monthly auto-renewal`,
//     product_data: {
//       name: `${subscriptionType} Subscription`,
//       // description: `${subscriptionType} subscription - Monthly auto-renewal`,
//     },
//   });

//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ['card'],
//     mode: 'subscription',
//     customer: stripeCustomerId,
//     line_items: [
//       {
//         price: price.id,
//         quantity: 1,
//       },
//     ],
//     success_url: `${config.backend_url}/api/v1/payment/confirm-subscription?session_id={CHECKOUT_SESSION_ID}`,
//     cancel_url: `${config.backend_url}/api/v1/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
//     subscription_data: {
//       metadata: {
//         employerId,
//         subscriptionType,
//         durationInMonths: durationInMonths.toString(),
//       },
//     },
//     metadata: {
//       employerId,
//       subscriptionType,
//       durationInMonths: durationInMonths.toString(),
//     },
//   });

//   const yearEndDate = new Date();
//   yearEndDate.setFullYear(yearEndDate.getFullYear() + 1);

//   const paymentRecord = await Payment.create({
//     employerId: new mongoose.Types.ObjectId(employerId),
//     subscriptionType,
//     durationInMonths,
//     amount,
//     discount,
//     finalAmount,
//     paymentId: session.id,
//     paymentMethod: '',
//     buyTime: new Date(),
//     expireDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
//     status: 'pending',
//     isDeleted: false,
//     isRenewal: false,
//   });

//   return {
//     checkoutUrl: session.url,
//     paymentId: paymentRecord._id,
//     finalAmount,
//     currency: 'GBP',
//     sessionId: session.id,
//   };
// };

// // Complete Subscription Payment
// export const completeSubscriptionPayment = async (res: any, sessionId: string) => {
//   const dbSession = await mongoose.startSession();
//   dbSession.startTransaction();

//   try {
//     const session = await stripe.checkout.sessions.retrieve(sessionId, {
//       expand: ['subscription'],
//     });

//     const stripeSubscription = session.subscription as Stripe.Subscription;

//     if (!stripeSubscription) {
//       throw new AppError(400, "Subscription not found in Stripe session");
//     }

//     const payment = await Payment.findOne({ paymentId: sessionId }).session(dbSession);

//     if (!payment) {
//       throw new AppError(404, "Payment record not found");
//     }

//     if (session.payment_status === "paid") {
//       payment.status = "success";
//       payment.paymentMethod = "card";
//       await payment.save({ session: dbSession });

//       const yearEndDate = new Date();
//       yearEndDate.setFullYear(yearEndDate.getFullYear() + 1);

//       const expireDate = new Date();
//       expireDate.setMonth(expireDate.getMonth() + 1);

//       const subscription = await MySubscription.create(
//         [
//           {
//             employerId: payment.employerId,
//             type: payment.subscriptionType,
//             buyTime: new Date(),
//             howManyMonths: 1,
//             expireDate,
//             paymentId: payment._id,
//             status: "active",
//             isDeleted: false,
//             autoRenewal: true,
//             stripeSubscriptionId: stripeSubscription.id,
//             yearEndDate,
//             renewalCount: 0,
//           },
//         ],
//         { session: dbSession }
//       );

//       await Payment.findByIdAndUpdate(
//         payment._id,
//         { subscriptionId: subscription[0]._id },
//         { session: dbSession }
//       );

//       await User.findByIdAndUpdate(
//         payment.employerId,
//         { mySubscriptionsId: subscription[0]._id },
//         { session: dbSession }
//       );

//       const user = await User.findById(payment.employerId).session(dbSession);

//       if (user?.email && payment.subscriptionType !== 'Bronze') {
//         console.log(`📧 Subscription activated for ${user.email}`);

//                     // Fire-and-forget: send email without waiting
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
//       }

//       console.log(`✅ Subscription created: ${subscription[0]._id}`);
//     } else {
//       payment.status = "failed";
//       await payment.save({ session: dbSession });
//     }

//     await dbSession.commitTransaction();
//     dbSession.endSession();

//     const redirectUrl = config.frontend_url + '/payment-success';
//     res.redirect(redirectUrl);
//   } catch (error) {
//     await dbSession.abortTransaction();
//     dbSession.endSession();
//     console.error("❌ Transaction rolled back:", error);
//     throw error;
//   }
// };

// // Cancel Subscription Payment
// export const cancelSubscriptionPayment = async (res: any, sessionId: string) => {
//   const dbSession = await mongoose.startSession();
//   dbSession.startTransaction();

//   try {
//     const payment = await Payment.findOne({ paymentId: sessionId }).session(dbSession);

//     if (!payment) {
//       throw new AppError(404, "Payment record not found");
//     }

//     if (payment.status !== "pending") {
//       throw new AppError(400, `Cannot cancel payment with status: ${payment.status}`);
//     }

//     try {
//       await stripe.checkout.sessions.expire(sessionId);
//       console.log(`✅ Stripe session ${sessionId} expired`);
//     } catch (err) {
//       console.warn(`⚠️ Could not expire Stripe session: ${err}`);
//     }

//     payment.status = "cancelled";
//     await payment.save({ session: dbSession });

//     await dbSession.commitTransaction();
//     dbSession.endSession();

//     res.redirect(config.frontend_url + "/packages");
//   } catch (error) {
//     await dbSession.abortTransaction();
//     dbSession.endSession();
//     console.error("❌ Transaction rolled back:", error);
//     throw error;
//   }
// };

// // Cancel Auto Renewal
// export const cancelAutoRenewal = async (employerId: string) => {
//   const user = await User.findById(employerId);
//   if (!user) throw new AppError(404, 'User not found');

//   const subscription = await MySubscription.findOne({
//     _id: new mongoose.Types.ObjectId(user.mySubscriptionsId),
//     employerId: new mongoose.Types.ObjectId(employerId),
//     status: 'active',
//     isDeleted: false,
//   });

//   if (!subscription) {
//     throw new AppError(404, 'No active subscription found');
//   }

//   if (!subscription.stripeSubscriptionId) {
//     throw new AppError(400, 'No Stripe subscription ID found');
//   }

//   await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
//     cancel_at_period_end: true,
//   });

//   subscription.autoRenewal = false;
//   await subscription.save();

//   return {
//     message: 'Auto-renewal cancelled. Subscription remains active until expiry.',
//     expireDate: subscription.expireDate,
//   };
// };

// // Resume Auto Renewal
// export const resumeAutoRenewal = async (employerId: string) => {

//   const user = await User.findById(employerId);
//   if (!user) throw new AppError(404, 'User not found');
//   const subscription = await MySubscription.findOne({
//     _id: new mongoose.Types.ObjectId(user.mySubscriptionsId),
//     employerId: new mongoose.Types.ObjectId(employerId),
//     status: 'active',
//     isDeleted: false,
//   });

//   if (!subscription) {
//     throw new AppError(404, 'No active subscription found');
//   }

//   if (!subscription.stripeSubscriptionId) {
//     throw new AppError(400, 'No Stripe subscription ID found');
//   }

//   const now = new Date();
//   if (now >= subscription.yearEndDate) {
//     throw new AppError(400, 'Cannot resume after 1-year period');
//   }

//   await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
//     cancel_at_period_end: false,
//   });

//   subscription.autoRenewal = true;
//   await subscription.save();

//   return {
//     message: 'Auto-renewal resumed successfully',
//     nextRenewalDate: subscription.expireDate,
//   };
// };

// // /* eslint-disable @typescript-eslint/no-explicit-any */
// // import httpStatus from 'http-status';
// // import AppError from '../../error/AppError';
// // import { Payment } from './payment.model';
// // import { TPayment } from './payment.interface';
// // import QueryBuilder from '../../builder/QueryBuilder';
// // import mongoose from 'mongoose';
// // import { stripe } from './payment.utils';
// // import { MySubscription } from '../mySubscription/mySubscription.model';
// // import { User } from '../user/user.model';
// // import { red } from 'colorette';
// // import { sendEmployerSubscriptionActivatedEmail } from '../../utils/eamilNotifiacation';
// // import config from '../../config';

// // const createPayment = async (payload: TPayment) => {
// //   const payment = await Payment.create(payload);
// //   return payment;
// // };

// // const completeSubscriptionPayment = async (res: any, sessionId: string) => {
// //   const dbSession = await mongoose.startSession();
// //   dbSession.startTransaction();

// //   try {
// //     // 1️⃣ Retrieve Stripe Checkout Session
// //     const session = await stripe.checkout.sessions.retrieve(sessionId);
// //     const paymentIntentId = session.payment_intent as string | null;

// //     if (!paymentIntentId) {
// //       throw new AppError(400, "Payment intent not found in Stripe session");
// //     }

// //     // 2️⃣ Retrieve PaymentIntent to check status
// //     const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

// //     // 3️⃣ Find local payment record by sessionId
// //     const payment = await Payment.findOne({ paymentId: sessionId }).session(dbSession);
// //     if (!payment) {
// //       throw new AppError(404, "Payment record not found for this session");
// //     }

// //     // 4️⃣ Update payment status
// //     if (paymentIntent.status === "succeeded") {
// //       payment.status = "success";
// //       payment.paymentMethod = paymentIntent.payment_method_types?.[0] || "card" as any;
// //       await payment.save({ session: dbSession });

// //       // 5️⃣ Create new MySubscription
// //       const expireDate = new Date(new Date().setMonth(new Date().getMonth() + payment.durationInMonths));

// //       const subscription = await MySubscription.create(
// //         [
// //           {
// //             employerId: payment.employerId,
// //             type: payment.subscriptionType,
// //             buyTime: new Date(),
// //             howManyMonths: payment.durationInMonths,
// //             expireDate,
// //             paymentId: payment._id,
// //             status: "active",
// //             isDeleted: false,
// //           },
// //         ],
// //         { session: dbSession }
// //       );

// //       // 6️⃣ Update User reference to latest MySubscription
// //       const user = await User.findByIdAndUpdate(
// //         payment.employerId,
// //         { mySubscriptionsId: subscription[0]._id },
// //         { session: dbSession }
// //       );

// //         if (user?.email) {

// //           if(payment.subscriptionType !== 'Bronze') {

// //             // Fire-and-forget: send email without waiting
// //             sendEmployerSubscriptionActivatedEmail({
// //               sentTo: user.email,
// //               subject: `Your ${payment.subscriptionType} subscription is now active`,
// //               companyName: user.companyName || 'Your Company',
// //               packageType: payment.subscriptionType,
// //             })
// //               .then(() => console.log(`📧 Subscription activated email sent to ${user.email}`))
// //               .catch((emailError) =>
// //                 console.error('❌ Failed to send subscription email:', emailError)
// //               );
// //           }
// //           }
// //       console.log(`✅ Payment completed & new subscription created for employer: ${payment.employerId}`);
// //     } else {
// //       payment.status = "failed";
// //       await payment.save({ session: dbSession });
// //       console.log(`❌ Payment failed for session: ${sessionId}`);
// //     }

// //     await dbSession.commitTransaction();
// //     dbSession.endSession();

// //     const redirectUrl = config.frontend_url + '/payment-success';

// //     if(redirectUrl) {
// //       res.redirect(redirectUrl);
// //     }

// //     // res.redirect("http://localhost:3000");
// //     // return payment;
// //   } catch (error) {
// //     await dbSession.abortTransaction();
// //     dbSession.endSession();
// //     console.error("❌ Transaction rolled back due to error:", error);
// //     throw error;
// //   }
// // };

// // const cancelSubscriptionPayment = async (res: any,sessionId: string) => {
// //   const dbSession = await mongoose.startSession();
// //   dbSession.startTransaction();

// //   try {
// //     // 1️⃣ Find local payment record
// //     const payment = await Payment.findOne({ paymentId: sessionId }).session(dbSession);
// //     if (!payment) {
// //       throw new AppError(404, "Payment record not found for this session");
// //     }

// //     // 2️⃣ Only allow cancel if payment is pending
// //     if (payment.status !== "pending") {
// //       throw new AppError(400, `Cannot cancel a payment with status: ${payment.status}`);
// //     }

// //     // 3️⃣ Cancel the Stripe session (if still pending)
// //     try {
// //       await stripe.checkout.sessions.expire(sessionId);
// //       console.log(`✅ Stripe session ${sessionId} expired successfully`);
// //     } catch (err) {
// //       console.warn(`⚠️ Could not expire Stripe session: ${err}`);
// //       // Continue: the payment record should still be marked as cancelled
// //     }

// //     // 4️⃣ Update local payment status
// //     payment.status = "cancelled";
// //     await payment.save({ session: dbSession });

// //     await dbSession.commitTransaction();
// //     dbSession.endSession();

// //     // return payment;
// //     res.redirect("http://localhost:3000/packages");
// //   } catch (error) {
// //     await dbSession.abortTransaction();
// //     dbSession.endSession();
// //     console.error("❌ Transaction rolled back due to error:", error);
// //     throw error;
// //   }
// // };

// // const getAllPayments = async (query: Record<string, any> = {}) => {
// //   const baseFilter = { isDeleted: false };

// //   const paymentQuery = new QueryBuilder(
// //     Payment.find(baseFilter).populate('employerId', 'fullName email'),
// //     query
// //   )
// //     .filter()
// //     .sort()
// //     .paginate()
// //     .fields();

// //   const result = await paymentQuery.modelQuery;
// //   const meta = await paymentQuery.countTotal();

// //   return { meta, result };
// // };

// // const getAllPaymentsRecived = async (query: Record<string, any> = {}) => {
// //   const baseFilter = { isDeleted: false, status: "success" };

// //   const paymentQuery = new QueryBuilder(
// //     Payment.find(baseFilter).populate('employerId', 'name email phone companyName'),
// //     query
// //   )
// //      .search(["employerId.name", "employerId.email", "employerId.phone", 'employerId.companyName', "subscriptionType", "paymentId", "paymentMethod"])
// //     .filter()
// //     .sort()
// //     .paginate()
// //     .fields();

// //   const result = await paymentQuery.modelQuery;
// //   const meta = await paymentQuery.countTotal();

// //   return { meta, result };
// // };

// // const getPaymentById = async (id: string) => {
// //   const payment = await Payment.findById(id);

// //   if (!payment || payment.isDeleted) {
// //     throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
// //   }

// //   return payment;
// // };

// // const updatePayment = async (id: string, payload: Partial<TPayment>) => {
// //   const payment = await Payment.findById(id);

// //   if (!payment || payment.isDeleted) {
// //     throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
// //   }

// //   const updated = await Payment.findByIdAndUpdate(id, payload, { new: true });
// //   return updated;
// // };

// // const deletePayment = async (id: string) => {
// //   const payment = await Payment.findById(id);

// //   if (!payment || payment.isDeleted) {
// //     throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
// //   }

// //   payment.isDeleted = true;
// //   await payment.save();

// //   return true;
// // };

// // export const PaymentService = {
// //   createPayment,
// //   completeSubscriptionPayment,
// //   cancelSubscriptionPayment,
// //   getAllPayments,
// //   getAllPaymentsRecived,
// //   getPaymentById,
// //   updatePayment,
// //   deletePayment,
// // };
