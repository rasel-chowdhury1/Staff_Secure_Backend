// payment.model.ts
import { Schema, model } from 'mongoose';
import { TPayment } from './payment.interface';

const paymentSchema = new Schema<TPayment>(
  {
    employerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subscriptionType: {
      type: String,
      enum: ['Bronze', 'Platinum', 'Diamond'],
      required: true,
    },
    durationInMonths: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    paymentId: {
      type: String,
      required: true,
    },
    promotionCode: {
      type: String,
      default: null, // store applied Stripe coupon code
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'bank_transfer', 'wallet', 'other', ''],
      default: '',
    },
    buyTime: {
      type: Date,
      default: () => new Date(),
    },
    expireDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending', 'cancelled'],
      default: 'pending',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'MySubscription',
      required: false,
    },
    isRenewal: {
      type: Boolean,
      default: false,
    },
    stripeInvoiceId: {
      type: String,
      required: false,
    },
    stripeHostedInvoiceUrl: {
      type: String,
      required: false,
    }
  },
  { timestamps: true }
);

export const Payment = model<TPayment>('Payment', paymentSchema);

// import { Schema, model } from 'mongoose';
// import { TPayment } from './payment.interface';

// const paymentSchema = new Schema<TPayment>(
//   {
//     employerId: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     subscriptionType: {
//       type: String,
//       enum: ['Bronze', 'Platinum', 'Diamond'],
//       required: true,
//     },
//     durationInMonths: {
//       type: Number,
//       required: true,
//     },
//     amount: {
//       type: Number,
//       required: true, // original price
//     },
//     discount: {
//       type: Number,
//       default: 0, // store discount amount
//     },
//     finalAmount: {
//       type: Number,
//       required: true, // amount after discount
//     },
//     paymentId: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     paymentMethod: {
//       type: String,
//       enum: ['card', 'bank_transfer', 'wallet', 'other', ''],
//       default: '',
//     },
//     buyTime: {
//       type: Date,
//       default: new Date(),
//     },
//     expireDate: {
//       type: Date,
//       required: true,
//     },
//     status: {
//       type: String,
//       enum: ['success', 'failed', 'pending', 'cancelled'],
//       default: 'pending',
//     },
//     isDeleted: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true }
// );

// export const Payment = model<TPayment>('Payment', paymentSchema);
