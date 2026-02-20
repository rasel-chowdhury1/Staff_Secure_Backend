import { Schema, model, Document } from 'mongoose';
import { ICandidateProfile } from './candidateProfile.interface';


const candidateProfileSchema = new Schema<ICandidateProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One profile per user
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      default: ""
    },
    area: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    county: {
      type: String,
      required: true
    },
    designation: {
      type: String,
      default: "",
    },
    availability: {
      type: String,
      default: "",
    },
    dateOfBirth: {
      type: Date,
      default: null
    },
    yearsOfExperience: {
      type: Number,
      required: true,
      default: 0,
    },
    qualifications: {
      type: [String],
      default: [],
    },
    skills: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      default: '',
    },
    cv: {
      type: String,
      default: ""
    },
    documentAndCertifications: {
      type: [ String ] ,
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Optional: Exclude _id and __v in JSON output if needed
candidateProfileSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export const CandidateProfile = model<ICandidateProfile>(
  'CandidateProfile',
  candidateProfileSchema
);
