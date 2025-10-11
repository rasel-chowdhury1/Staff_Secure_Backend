import { Schema, model } from 'mongoose';
import { TJob } from './job.interface';

const jobSchema = new Schema<TJob>(
  {
    employerId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    jobReferralCode: {
      type: String,
      required: true,
      unique: true,
    },
    title: { 
        type: String, 
        required: true 
    },
    location: {
      type: String,
      required: true
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

    jobType: {
      type: String,
      enum: ['Onsite', 'Remote', 'Hybrid'],
      required: true,
    },
    workType: {
      type: String,
      enum: ['Full-Time', 'Part-Time', 'Temporary'],
      required: true,
    },
    lengthOfWork: {
      type: String,
      required: false,
      default: ""
    },

    paymentType: {
      type: String,
      enum: ['Monthly', 'Fortnightly', "Weekly"]
    },
    salaryRange: {
      min: { 
        type: Number, 
        required: true 
      },
      max: { 
        type: Number, 
        required: true 
      },
    },
    overtimePayRate: {
      type: Number,
      required: true
    },
    annualPay: {
      type: Number,
      default: 0
    },
    hourlyRequired: {
      type: Number,
      required: true
    },
    
    startDate: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    finishTime: {
      type: String,
      required: true
    },
    daysOfWork: {
      type: [ String ],
      required: true
    },
    // workersNeeded: {
    //   type: Number,
    //   required: true
    // },
    experience: { 
        type: Number, 
        required: true 
    },


    description: { 
        type: String, 
        required: true 
    },
    candidateDuties: {
      type: [String],
      required: true,
    },
    documentationCertificates: {
      type: [String],
      required: true,
    },
    benefits: {
      type: [String],
      default: [],
    },
    additionalInformation: { 
        type: String, 
        required: true 
    },

    lastApplyDate: { 
        type: Date, 
        required: true 
    },

    status: {
      type: String,
      enum: ['New', 'Cvs Sent', "Closed"],
      default: 'New',
    },

    isDeleted: { 
        type: Boolean, default: false 
    },


    // keyResponsibilities: {
    //   type: [String],
    //   required: true,
    // },

    // requirements: {
    //   type: [String],
    //   required: true,
    // },


    // skillsRequired: {
    //   type: [String],
    //   default: [],
    // },

    
  },
  { timestamps: true },
);

const Job = model<TJob>('Job', jobSchema);
export default Job;
