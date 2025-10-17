// payment.cron.ts
import cron from 'node-cron';
import { stripe } from './payment.service';
import { User } from '../user/user.model';
import { MySubscription } from '../mySubscription/mySubscription.model';

export const startSubscriptionCronJobs = () => {
  cron.schedule('0 2 * * *', async () => {
    console.log('🕐 Running subscription cron...');

    try {
      await checkAndHandleExpiredSubscriptions();
      await checkAndCancelYearEndSubscriptions();
    } catch (error) {
      console.error('❌ Cron error:', error);
    }
  });

  console.log('✅ Cron jobs started');
};

const checkAndHandleExpiredSubscriptions = async () => {
  try {
    const now = new Date();

    const expired = await MySubscription.find({
      status: 'active',
      expireDate: { $lt: now },
      autoRenewal: false,
      isDeleted: false,
    });

    for (const sub of expired) {
      sub.status = 'expired';
      await sub.save();

      const user = await User.findById(sub.employerId);
      if (user?.email) {
        console.log(`📧 Expired email to ${user.email}`);
      }

      console.log(`⏰ Expired: ${sub._id}`);
    }

    if (expired.length > 0) {
      console.log(`✅ Processed ${expired.length} expired subscriptions`);
    }
  } catch (error) {
    console.error('❌ Error checking expired:', error);
  }
};

const checkAndCancelYearEndSubscriptions = async () => {
  try {
    const now = new Date();

    const yearEnd = await MySubscription.find({
      status: 'active',
      autoRenewal: true,
      yearEndDate: { $lte: now },
      isDeleted: false,
    });

    for (const sub of yearEnd) {
      if (sub.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(sub.stripeSubscriptionId);

          sub.autoRenewal = false;
          await sub.save();

          const user = await User.findById(sub.employerId);
          if (user?.email) {
            console.log(`📧 Year-end notice to ${user.email}`);
          }

          console.log(`✅ Year-end cancelled: ${sub._id}`);
        } catch (err) {
          console.error(`❌ Error cancelling Stripe sub:`, err);
        }
      }
    }

    if (yearEnd.length > 0) {
      console.log(`✅ Processed ${yearEnd.length} year-end subscriptions`);
    }
  } catch (error) {
    console.error('❌ Error checking year-end:', error);
  }
};

export const checkSubscriptionStatus = async (employerId: string) => {
  const subscription = await MySubscription.findOne({
    employerId,
    status: 'active',
    isDeleted: false,
  }).populate('paymentId');

  if (!subscription) {
    return {
      hasActiveSubscription: false,
      message: 'No active subscription',
    };
  }

  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (subscription.expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysUntilYearEnd = Math.ceil(
    (subscription.yearEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    hasActiveSubscription: true,
    subscriptionType: subscription.type,
    expireDate: subscription.expireDate,
    autoRenewal: subscription.autoRenewal,
    daysUntilExpiry,
    yearEndDate: subscription.yearEndDate,
    daysUntilYearEnd,
    renewalCount: subscription.renewalCount,
    maxRenewals: 12,
    canCancelAutoRenewal: subscription.autoRenewal && now < subscription.yearEndDate,
  };
};