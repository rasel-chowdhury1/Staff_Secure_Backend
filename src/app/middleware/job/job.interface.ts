import { Types } from "mongoose";

export type TSalaryRange = {
  min: number;
  max: number;
};

export type TJobType = 'Onsite' | 'Remote' | 'Hybrid';
export type TJobStatus = 'New' | 'Cvs Sent' | 'Closed';
export type TWorkType = 'Full-Time' | 'Part-Time' | 'Temporary';
export type TPaymentType = 'Monthly' | 'Fortnightly' | 'Weekly';

export type TJob = {
  employerId: Types.ObjectId; // ref User
  jobReferralCode: string;
  title: string;
  location: string;
  area: string;
  postalCode: string;
  county: string;
  jobType: TJobType;
  workType: TWorkType;
  lengthOfWork: string;
  paymentType: TPaymentType;
  salaryRange: TSalaryRange;
  overtimePayRate: number;
  annualPay?: number;
  hourlyRequired: number;
  startDate: Date;
  startTime: string;
  finishTime: string;
  daysOfWork: [string];
  workersNeeded: number;
  experience: number;
  description: string;
  candidateDuties: string[];
  documentationCertificates: string[];
  benefits: string[];
  additionalInformation: string;
  lastApplyDate: Date;
  status: TJobStatus;
  isDeleted: boolean;
  // keyResponsibilities: string[];
  // requirements: string[];
  // skillsRequired: string[];
  
};
