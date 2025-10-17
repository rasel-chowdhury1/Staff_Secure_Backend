import Stripe from "stripe";
import mongoose from "mongoose";
import AppError from "../../error/AppError";
import { Payment } from "./payment.model";
import config from "../../config";

console.log("process.env.STRIPE_SECRET_KEY", config.stripe.stripe_api_secret);

export const stripe = new Stripe(config.stripe.stripe_api_secret as string, {
  apiVersion: "2025-09-30.clover",
  typescript: true,
});

// Convert Euro to cents
const calculateAmount = (amount: number) => Math.round(Number(amount) * 100);

export const createStripePaymentSession = async (payload: {
  employerId: string;
  subscriptionType: 'Bronze' | 'Platinum' | 'Diamond';
  durationInMonths: number;
  amount: number;
  discount?: number; // optional
}) => {
  const { employerId, subscriptionType, durationInMonths, amount, discount = 0 } = payload;

  if (!employerId || !subscriptionType || !durationInMonths || !amount) {
    throw new AppError(400, 'Missing required payment details');
  }

  const finalAmount = amount - discount;
  if (finalAmount < 0) throw new AppError(400, 'Discount cannot exceed amount');

  // ✅ Use camelCase for Stripe properties
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'], // ✅ snake_case
    mode: 'payment',

    line_items: [
      {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `${subscriptionType} Subscription`,
            description: `A month for a 12-month subscription`,
          },
          unit_amount: calculateAmount(finalAmount), // cents
        },
        quantity: 1,
      },
    ],

    success_url: `${process.env.BACKEND_URL}/api/v1/payment/confirm-payment?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BACKEND_URL}/api/v1/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,

    invoice_creation: {
      enabled: true,
    },
  });

  const paymentRecord = await Payment.create({
    employerId: new mongoose.Types.ObjectId(employerId),
    subscriptionType,
    durationInMonths,
    amount,
    discount,
    finalAmount,
    paymentId: session.id,
    paymentMethod: '', // will update on confirmation
    buyTime: new Date(),
    expireDate: new Date(new Date().setMonth(new Date().getMonth() + durationInMonths)),
    status: 'pending',
    isDeleted: false,
  });

  return {
    checkoutUrl: session.url,
    paymentId: paymentRecord._id,
    finalAmount,
    currency: 'GBP',
  };
};



