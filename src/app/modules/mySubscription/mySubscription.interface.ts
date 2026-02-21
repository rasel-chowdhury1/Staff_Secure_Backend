import { Types } from 'mongoose';

export type TMySubscription = {
  employerId: Types.ObjectId | string;
  type: 'Bronze' | 'Platinum' | 'Diamond';
  buyTime: Date;
  howManyMonths: number;
  expireDate: Date;
  paymentId: Types.ObjectId | string;
  status: 'active' | 'expired' | 'cancelled';
  isDeleted: boolean;
  // New fields for auto-renewal
  autoRenewal: boolean;
  stripeSubscriptionId?: string;
  yearEndDate: Date;
  cancelDeadline: Date;
  renewalCount: number;
  lastPaymentAmount: number;
  promotionCode: string;
  stripeHostedInvoiceUrl: string;
};

// export type TMySubscription = {
//   employerId: Types.ObjectId | string;
//   type: 'Bronze' | 'Platinum' | 'Diamond';
//   buyTime: Date;
//   howManyMonths: number;
//   expireDate: Date;
//   paymentId: Types.ObjectId | string;
//   status: 'active' | 'expired' | 'cancelled';
//   isDeleted: boolean;
// };
