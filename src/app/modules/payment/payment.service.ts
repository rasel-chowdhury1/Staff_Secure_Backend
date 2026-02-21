import Stripe from "stripe";
import { User } from "../user/user.model";
import { MySubscription } from "../mySubscription/mySubscription.model";
import { Payment } from "./payment.model";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const stripePriceIds: Record<"Bronze" | "Platinum" | "Diamond", string> = {
  Bronze: process.env.STRIPE_BRONZE_PRICE_ID!,
  Platinum: process.env.STRIPE_PLATINUM_PRICE_ID!,
  Diamond: process.env.STRIPE_DIAMOND_PRICE_ID!,
};

// ================= Create Checkout Session =================
const createCheckoutSession = async (
  userId: string,
  subscriptionType: "Bronze" | "Platinum" | "Diamond"
): Promise<string> => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Prevent multiple active subscriptions
  const activeSubscription = await MySubscription.findOne({ employerId: user._id, status: "active" });
  if (activeSubscription) throw new Error("User already has an active subscription");

  // Create or reuse Stripe customer
  let customerId = user.stipeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user._id.toString() } });
    customerId = customer.id;
    user.stipeCustomerId = customerId;
    await user.save();
  }

  const priceId = stripePriceIds[subscriptionType];
  if (!priceId) throw new Error("Invalid subscription type");

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    payment_method_types: ["card"],
    allow_promotion_codes: true, // user can apply coupon
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/payment-success`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    subscription_data: {
      metadata: { userId: user._id.toString(), subscriptionType },
      // trial period can be added here if needed
    },
  });

  if (!session.url) throw new Error("Failed to create Stripe checkout session");
  return session.url;
};



const handleWebhook = async (event: Stripe.Event) => {
  console.log("=== Stripe Event Received ===>", event.type);

  try {
    /**
     * ============================================================
     * 1️⃣ HANDLE SUCCESSFUL INVOICE PAYMENT (Subscription Payment)
     * ============================================================
     */
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;

      console.log("Processing invoice:", invoice.id);

      // ------------------------------------------------------------
      // STEP 1: Prevent duplicate webhook processing
      // ------------------------------------------------------------
      const existingPayment = await Payment.findOne({ paymentId: invoice.id });
      if (existingPayment) {
        console.log("Invoice already processed:", invoice.id);
        return;
      }

      // ------------------------------------------------------------
      // STEP 2: Extract subscription ID from invoice
      // ------------------------------------------------------------
      const subscriptionId =
        invoice.parent?.subscription_details?.subscription as string;

      if (!subscriptionId) {
        console.log("No subscription linked to invoice:", invoice.id);
        return;
      }

      // ------------------------------------------------------------
      // STEP 3: Retrieve full subscription from Stripe
      // Expand discounts to access coupon details
      // ------------------------------------------------------------
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscriptionId,
        { expand: ["discounts.coupon"] }
      );

      if (!stripeSubscription) {
        console.log("Stripe subscription not found:", subscriptionId);
        return;
      }

      // ------------------------------------------------------------
      // STEP 4: Extract Promotion Code (if applied)
      // ------------------------------------------------------------
      let promoCodeUsed: string | null = null;

      if (stripeSubscription.discounts?.length) {
        const discount = stripeSubscription.discounts[0];

        // promotion_code contains the promo object ID (promo_xxx)
        const promotionCodeId = (discount as any).promotion_code;

        if (promotionCodeId) {
          const promo = await stripe.promotionCodes.retrieve(promotionCodeId);
          promoCodeUsed = promo.code; // actual user-entered code (e.g., SUMMER10)
        }
      }

      console.log("Promotion code used:", promoCodeUsed);

      // ------------------------------------------------------------
      // STEP 5: Find user using Stripe customer ID
      // ------------------------------------------------------------
      const user = await User.findOne({
        stipeCustomerId: stripeSubscription.customer,
      });

      if (!user) {
        console.log("User not found for Stripe customer:", stripeSubscription.customer);
        return;
      }

      // ------------------------------------------------------------
      // STEP 6: Extract invoice line & billing period
      // ------------------------------------------------------------
      const line = invoice.lines.data[0];
      const periodStart = new Date(line.period.start * 1000);
      const periodEnd = new Date(line.period.end * 1000);

      // ------------------------------------------------------------
      // STEP 7: Calculate payment amounts
      // ------------------------------------------------------------
      const discountAmount = invoice.total_discount_amounts?.length
        ? invoice.total_discount_amounts[0].amount / 100
        : 0;

      const finalAmount = invoice.amount_paid / 100;

      // ------------------------------------------------------------
      // STEP 8: Determine subscription type
      // ------------------------------------------------------------
      const subscriptionType =
        (stripeSubscription.metadata.subscriptionType as
          | "Bronze"
          | "Platinum"
          | "Diamond") ||
        (line.metadata.subscriptionType as
          | "Bronze"
          | "Platinum"
          | "Diamond") ||
        "Bronze";

      /**
       * ============================================================
       * 2️⃣ CREATE PAYMENT RECORD
       * ============================================================
       */
      const paymentDoc = await Payment.create({
        employerId: user._id,
        subscriptionType,
        durationInMonths: 1,
        amount: finalAmount + discountAmount,
        discount: discountAmount,
        finalAmount,
        paymentId: invoice.id,
        paymentMethod: "card",
        buyTime: periodStart,
        expireDate: periodEnd,
        status: "success",
        stripeInvoiceId: invoice.id,
        isRenewal: invoice.billing_reason === "subscription_cycle",
        promotionCode: promoCodeUsed,
        stripeHostedInvoiceUrl: invoice.hosted_invoice_url,
      });

      /**
       * ============================================================
       * 3️⃣ CREATE OR UPDATE LOCAL SUBSCRIPTION
       * ============================================================
       */
      let mySubscription = await MySubscription.findOne({
        stripeSubscriptionId: stripeSubscription.id,
      });

      if (mySubscription) {
        // -------------------------
        // 🔄 RENEWAL CASE
        // -------------------------
        mySubscription.expireDate = periodEnd;
        mySubscription.paymentId = paymentDoc._id;
        mySubscription.status = "active";
        mySubscription.renewalCount += 1;
        mySubscription.lastPaymentAmount = finalAmount;

        await mySubscription.save();

        paymentDoc.subscriptionId = mySubscription._id;
        await paymentDoc.save();

        console.log("Subscription renewed successfully.");
      } else {
        // -------------------------
        // 🆕 FIRST TIME SUBSCRIPTION
        // -------------------------
        const cancelDeadline = new Date();
        cancelDeadline.setMonth(cancelDeadline.getMonth() + 1);

        mySubscription = await MySubscription.create({
          employerId: user._id,
          type: subscriptionType,
          buyTime: periodStart,
          howManyMonths: 12,
          expireDate: periodEnd,
          paymentId: paymentDoc._id,
          status: "active",
          autoRenewal: true,
          stripeSubscriptionId: stripeSubscription.id,
          yearEndDate: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1)
          ),
          cancelDeadline,
          lastPaymentAmount: finalAmount,
          promotionCode: promoCodeUsed,
          stripeHostedInvoiceUrl: invoice.hosted_invoice_url,
        });

        user.mySubscriptionsId = mySubscription._id;
        await user.save();

        paymentDoc.subscriptionId = mySubscription._id;
        await paymentDoc.save();

        console.log("New subscription created successfully.");
      }

      console.log("Invoice processed successfully:", invoice.id);
      return;
    }

    /**
     * ============================================================
     * 4️⃣ HANDLE SUBSCRIPTION CANCELLATION
     * ============================================================
     */
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      await MySubscription.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        { status: "cancelled", autoRenewal: false }
      );

      console.log("Subscription cancelled:", subscription.id);
      return;
    }

    /**
     * ============================================================
     * 5️⃣ HANDLE PAYMENT FAILURE
     * ============================================================
     */
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;

      console.log("Payment failed for invoice:", invoice);

        const stripeSubId = invoice.parent?.subscription_details?.subscription;
 
        console.log("stripeSubId", stripeSubId);
        if (!stripeSubId) {
          console.log("No subscription found for invoice:", invoice.id);
          return;
        }

       const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);

       console.log("stripeSub", stripeSub);



      await MySubscription.findOneAndUpdate(
        { stripeSubscriptionId: stripeSubId},
        {
          status: stripeSub.status, // past_due / unpaid / canceled
          lastPaymentAttemptFailed: true,
        }
      );

      console.log("Payment failed for invoice:", invoice.id);
      return;
    }

    console.log("Unhandled event type:", event.type);
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
  }
};


// ================= Cancel Subscription Manually =================
const cancelSubscription = async (subscriptionId: string) => {
  const mySub = await MySubscription.findById(subscriptionId);
  if (!mySub) throw new Error("Subscription not found");

  const now = new Date();
  if (now > mySub.cancelDeadline) throw new Error("Cannot cancel after cancel deadline");

  await stripe.subscriptions.del(mySub.stripeSubscriptionId!);

  mySub.status = "cancelled";
  mySub.autoRenewal = false;
  await mySub.save();

  return "Subscription cancelled successfully";
};


export const paymentService = {
  createCheckoutSession,
  handleWebhook,
  cancelSubscription
}
