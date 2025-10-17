// payment.webhook.ts
import Stripe from "stripe";
import mongoose from "mongoose";
import { stripe } from "./payment.service";
import { Payment } from "./payment.model";
import { User } from "../user/user.model";
import config from "../../config";
import { MySubscription } from "../mySubscription/mySubscription.model";

export const handleStripeWebhook = async (req: any, res: any) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = config.stripe.stripe_webhook_secret as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('⚠️ Webhook verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  res.json({ received: true });
};

const handleInvoicePaymentSucceeded = async (invoice: Stripe.Invoice) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const subscriptionId = (invoice as any).subscription as string;

    if (!subscriptionId) {
      console.log('No subscription in invoice');
      await dbSession.abortTransaction();
      dbSession.endSession();
      return;
    }

    const subscription = await MySubscription.findOne({
      stripeSubscriptionId: subscriptionId,
    }).session(dbSession);

    if (!subscription) {
      console.log('Subscription not found:', subscriptionId);
      await dbSession.abortTransaction();
      dbSession.endSession();
      return;
    }

    const now = new Date();

    // Check if 1 year ended
    if (now >= subscription.yearEndDate) {
      console.log('1 year ended, cancelling subscription');

      await stripe.subscriptions.cancel(subscriptionId);

      subscription.autoRenewal = false;
      subscription.status = 'expired';
      await subscription.save({ session: dbSession });

      await dbSession.commitTransaction();
      dbSession.endSession();
      return;
    }

    // Handle renewal payment
    if (invoice.billing_reason === 'subscription_cycle') {
      const user = await User.findById(subscription.employerId).session(dbSession);

      const newExpireDate = new Date(subscription.expireDate);
      newExpireDate.setMonth(newExpireDate.getMonth() + 1);

      await Payment.create(
        [
          {
            employerId: subscription.employerId,
            subscriptionType: subscription.type,
            durationInMonths: 1,
            amount: invoice.amount_paid / 100,
            discount: 0,
            finalAmount: invoice.amount_paid / 100,
            paymentId: invoice.id,
            paymentMethod: 'card',
            buyTime: new Date(),
            expireDate: newExpireDate,
            status: 'success',
            isDeleted: false,
            subscriptionId: subscription._id,
            isRenewal: true,
            stripeInvoiceId: invoice.id,
          },
        ],
        { session: dbSession }
      );

      subscription.expireDate = newExpireDate;
      subscription.renewalCount += 1;
      subscription.status = 'active';
      await subscription.save({ session: dbSession });

      console.log(`✅ Renewal processed: ${subscription._id}`);

      if (user?.email && subscription.type !== 'Bronze') {
        console.log(`📧 Renewal email to ${user.email}`);
      }
    }

    await dbSession.commitTransaction();
    dbSession.endSession();
  } catch (error) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    console.error('❌ Error in invoice.payment_succeeded:', error);
  }
};

const handleInvoicePaymentFailed = async (invoice: Stripe.Invoice) => {
  try {
    const subscriptionId = (invoice as any).subscription as string;

    if (!subscriptionId) return;

    const subscription = await MySubscription.findOne({
      stripeSubscriptionId: subscriptionId,
    });

    if (!subscription) return;

    await Payment.create({
      employerId: subscription.employerId,
      subscriptionType: subscription.type,
      durationInMonths: 1,
      amount: invoice.amount_due / 100,
      discount: 0,
      finalAmount: invoice.amount_due / 100,
      paymentId: invoice.id,
      paymentMethod: 'card',
      buyTime: new Date(),
      expireDate: subscription.expireDate,
      status: 'failed',
      isDeleted: false,
      subscriptionId: subscription._id,
      isRenewal: true,
      stripeInvoiceId: invoice.id,
    });

    console.log(`❌ Payment failed: ${subscription._id}`);

    const user = await User.findById(subscription.employerId);
    if (user?.email) {
      console.log(`📧 Payment failed email to ${user.email}`);
    }
  } catch (error) {
    console.error('❌ Error in invoice.payment_failed:', error);
  }
};

const handleSubscriptionDeleted = async (stripeSubscription: Stripe.Subscription) => {
  try {
    const subscription = await MySubscription.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (!subscription) return;

    subscription.status = 'cancelled';
    subscription.autoRenewal = false;
    await subscription.save();

    console.log(`✅ Subscription cancelled: ${subscription._id}`);
  } catch (error) {
    console.error('❌ Error in subscription.deleted:', error);
  }
};

const handleSubscriptionUpdated = async (stripeSubscription: Stripe.Subscription) => {
  try {
    const subscription = await MySubscription.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (!subscription) return;

    subscription.autoRenewal = !stripeSubscription.cancel_at_period_end;
    await subscription.save();

    console.log(`✅ Subscription updated: ${subscription._id}`);
  } catch (error) {
    console.error('❌ Error in subscription.updated:', error);
  }
};