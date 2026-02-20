import { count } from 'console';
import { z } from 'zod';

/*
|--------------------------------------------------------------------------
| Shared Schemas
|--------------------------------------------------------------------------
*/

const salaryRangeSchema = z
  .object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
  })
  .refine((data) => data.max >= data.min, {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['max'],
  });

/*
|--------------------------------------------------------------------------
| Create Job Validation
|--------------------------------------------------------------------------
*/

const createJobValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Job title is required'),

    location: z.string().min(1, 'Location is required'),
    area: z.string().min(1, 'Area is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    county: z.string().min(1, 'County is required'),

    jobType: z.enum(['Onsite', 'Remote', 'Hybrid']),
    workType: z.enum(['Full-Time', 'Part-Time', 'Temporary']),

    lengthOfWork: z.string().optional(),

    paymentType: z.enum(['Monthly', 'Fortnightly', 'Weekly']),

    salaryRange: salaryRangeSchema,

    overtimePayRate: z.number().nonnegative(),

    annualPay: z.number().nonnegative().optional(),

    hourlyRequired: z.number().nonnegative(),

    startDate: z.string().min(1, 'Start date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    finishTime: z.string().min(1, 'Finish time is required'),

    daysOfWork: z
      .array(z.string())
      .min(1, 'At least one working day is required'),

    // workersNeeded: z.number().positive(),

    experience: z.number().nonnegative(),

    description: z.string().min(1, 'Job description is required'),

    candidateDuties: z
      .array(z.string())
      .min(1, 'At least one duty is required'),

    documentationCertificates: z
      .array(z.string())
      .min(1, 'At least one document or certificate is required'),

    benefits: z.array(z.string()).optional(),

    additionalInformation: z.string().min(1, 'Additional information is required'),

    lastApplyDate: z.string().min(1, 'Last apply date is required'),

    status: z.enum(['New', 'Cvs Sent', 'Closed']).optional(),

    isDeleted: z.boolean().optional(),
  }),
});

/*
|--------------------------------------------------------------------------
| Update Job Validation
|--------------------------------------------------------------------------
*/

const updateJobValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    area: z.string().min(1).optional(),
    postalCode: z.string().min(1).optional(),
    county: z.string().min(1).optional(),

    jobType: z.enum(['Onsite', 'Remote', 'Hybrid']).optional(),
    workType: z.enum(['Full-Time', 'Part-Time', 'Temporary']).optional(),

    lengthOfWork: z.string().optional(),

    paymentType: z.enum(['Monthly', 'Fortnightly', 'Weekly']).optional(),

    salaryRange: salaryRangeSchema.optional(),

    overtimePayRate: z.number().nonnegative().optional(),
    annualPay: z.number().nonnegative().optional(),
    hourlyRequired: z.number().nonnegative().optional(),

    startDate: z.string().min(1).optional(),
    startTime: z.string().min(1).optional(),
    finishTime: z.string().min(1).optional(),

    daysOfWork: z.array(z.string()).min(1).optional(),

    // workersNeeded: z.number().positive().optional(),

    experience: z.number().nonnegative().optional(),

    description: z.string().min(1).optional(),

    candidateDuties: z.array(z.string()).min(1).optional(),

    documentationCertificates: z.array(z.string()).min(1).optional(),

    benefits: z.array(z.string()).optional(),

    additionalInformation: z.string().min(1).optional(),

    lastApplyDate: z.string().min(1).optional(),

    status: z.enum(['New', 'Cvs Sent', 'Closed']).optional(),

    isDeleted: z.boolean().optional(),
  }),
});

/*
|--------------------------------------------------------------------------
| Update Job Status Validation
|--------------------------------------------------------------------------
*/

const updateJobStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(['New', 'Cvs Sent', 'Closed']),
  }),
});

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

export const JobValidation = {
  createJobValidationSchema,
  updateJobValidationSchema,
  updateJobStatusValidationSchema,
};
