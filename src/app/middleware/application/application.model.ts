import { model, Schema } from 'mongoose'
import { IApplication } from './application.interface'

const applicationSchema = new Schema<IApplication>(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'CandidateProfile',
      required: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    jobProviderOwnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['applied', 'forwarded', 'selected', 'rejected'],
      default: 'applied',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    aiScore: {
      type: Number,
      default: null,
    },
    aiReason: {
      type: String,
      default: '',
    },
    matchedSkills: {
      type: [String],
      default: [],
    },
    aiMatchLevel: {
      type: String,
      default: 'unknown',
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    forwardedAt: {
      type: Date,
      default: null,
    },
    selectedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

export const Application = model<IApplication>('Application', applicationSchema)
