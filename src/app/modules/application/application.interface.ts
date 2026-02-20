import { Document, Types } from 'mongoose';

export type TApplicationStatus = 'applied' | 'forwarded' | 'selected' | 'rejected';

export interface IApplication extends Document {
  candidateId: Types.ObjectId;
  jobId: Types.ObjectId;
  jobProviderOwnerId: Types.ObjectId;
  status: TApplicationStatus;
  adminNotes: string;
  aiScore?: number;
  aiReason?: string;
  matchedSkills?: string[];
  aiMatchLevel?: string;
  appliedAt: Date;
  forwardedAt?: Date;
  selectedAt?: Date;
  rejectedAt?: Date;
  isDeleted: boolean;
}
