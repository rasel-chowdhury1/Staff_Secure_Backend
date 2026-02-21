import { Types } from 'mongoose';

// export type TPayment = {
//   employerId: Types.ObjectId | string;
//   subscriptionType: 'Bronze' | 'Platinum' | 'Diamond';
//   durationInMonths: number;
//   amount: number;
//   discount: number;
//   finalAmount: number;
//   paymentId: string;
//   paymentMethod: 'card' | 'bank_transfer' | 'wallet' | 'other' | '';
//   buyTime: Date;
//   expireDate: Date;
//   status: 'success' | 'failed' | 'pending' | 'cancelled';
//   isDeleted: boolean;
// };

export type TPayment = {
  employerId: Types.ObjectId | string;
  subscriptionType: 'Bronze' | 'Platinum' | 'Diamond';
  durationInMonths: number;
  amount: number;
  discount: number;
  finalAmount: number;
  paymentId: string;
  promotionCode?: string;
  paymentMethod: string;
  buyTime: Date;
  expireDate: Date;
  status: 'success' | 'failed' | 'pending' | 'cancelled';
  isDeleted: boolean;
  subscriptionId?: Types.ObjectId | string;
  isRenewal: boolean;
  stripeInvoiceId?: string;
  stripeHostedInvoiceUrl?: string;
};


export type TPaymentMethod = 'card' | 'bank_transfer' | 'wallet' | 'other';