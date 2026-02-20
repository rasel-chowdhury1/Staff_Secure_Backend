/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import Job from './job.model';
import { TJob } from './job.interface';
import mongoose from 'mongoose';
import AppError from '../../error/AppError';
import { generateReferralCode } from './job.utils';
import QueryBuilder from '../../builder/QueryBuilder';
import { Application } from '../application/application.model';
import { emit } from 'process';
import { emitNotification } from '../../../socketIo';
import { getAdminId } from '../../DB/adminStrore';
import { User } from '../user/user.model';



const createJob = async (payload: TJob) => {

  const isExistEmployer = await User.findById(payload.employerId);

  if (!isExistEmployer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employer not found');
  }

  payload.jobReferralCode = generateReferralCode();

  const job = await Job.create(payload);

  if(!job) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Job created failed');
  }

  // sent notification to admin
    emitNotification({
      senderId: job.employerId,
      receiverId: getAdminId(),
      message: `New requirement submitted by ${isExistEmployer.companyName}`,
    });


  return job;
  
};

// const getAllJobs = async (query: Record<string, any> = {}) => {
//   const baseFilter = {
//     isDeleted: false,
//   };

//   const jobQuery = new QueryBuilder(Job.find(baseFilter), query)
//     .search(["title", "description", "requirements", "skillsRequired"])
//     .filter()
//     .sort()
//     .paginate()
//     .fields();

//   const result = await jobQuery.modelQuery;
//   const meta = await jobQuery.countTotal();

//   return { meta, result };
// };

const getAllJobs = async (query: Record<string, any> = {}, userId: string ) => {
  const baseFilter = {
    isDeleted: false,
  };

  const jobQuery = new QueryBuilder(
    Job.find(baseFilter).sort({
      // 👇 Custom priority
      status: 1,
      createdAt: -1,
    }),
    query
  )
    .search(['title', 'description', 'requirements', 'keyResponsibilities', 'skillsRequired'])
    .filter()
    .paginate()
    .fields();

  const jobs = await jobQuery.modelQuery;

    /* ----------------------------------------
     STEP 1: Get applied jobs for this user
  ----------------------------------------- */
  let appliedJobIds = new Set<string>();

  if (userId) {

    const applications = await Application.find({
      candidateId: new mongoose.Types.ObjectId(userId), // userId,
      isDeleted: false,
    }).select('jobId');

    appliedJobIds = new Set(
      applications.map(app => app.jobId.toString())
    );

  }

  /* ----------------------------------------
     STEP 2: Attach isApplied flag
  ----------------------------------------- */
  const result = jobs.map((job: any) => ({
    ...job.toObject(),
    isApplied: appliedJobIds.has(job._id.toString()),
  }));

  // 🔥 MANUAL SORT FIX (preserves QueryBuilder)
  const statusPriority = (status: string) => {
    if (status === 'New') return 1;
    if (status === 'Cvs Sent') return 2;
    if (status === 'Closed') return 3;
    return 4;
  };

  result.sort((a: any, b: any) => {
    const statusDiff =
      statusPriority(a.status) - statusPriority(b.status);

    if (statusDiff !== 0) return statusDiff;

    return (
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
    );
  });

  const meta = await jobQuery.countTotal();

  return { meta, result };
};



// const getMyJobs = async (userId: string, query: Record<string, any> = {}) => {
//   const baseFilter = {
//     employerId: new mongoose.Types.ObjectId(userId),
//     isDeleted: false,
//   };

//   const jobQuery = new QueryBuilder(Job.find(baseFilter), query)
//     .search(["title", "description", "requirements", "skillsRequired"])
//     .filter()
//     .sort()
//     .paginate()
//     .fields();

//   const result = await jobQuery.modelQuery;
//   const meta = await jobQuery.countTotal();

//   return { meta, result };
// };

const getMyJobs = async (userId: string, query: Record<string, any> = {}) => {
  const baseFilter = {
    employerId: new mongoose.Types.ObjectId(userId),
    isDeleted: false,
  };

  const jobQuery = new QueryBuilder(Job.find(baseFilter), query)
    .search(['title', 'description', 'requirements', 'skillsRequired'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const jobs = await jobQuery.modelQuery;
  const jobIds = jobs.map((job: any) => job._id);

  // 🔥 CV statistics aggregation (your logic applied)
  const applicationStats = await Application.aggregate([
    {
      $match: {
        jobId: { $in: jobIds },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$jobId',

        // ✅ total received (forwarded exists)
        totalReceivedCv: {
          $sum: {
            $cond: [{ $ne: ['$forwardedAt', null] }, 1, 0],
          },
        },

        // ✅ reviewed (selected or rejected)
        reviewedCv: {
          $sum: {
            $cond: [
              { $in: ['$status', ['selected', 'rejected']] },
              1,
              0,
            ],
          },
        },

        // ✅ new CV (forwarded but not reviewed yet)
        newCv: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$forwardedAt', null] },
                  { $not: { $in: ['$status', ['selected', 'rejected']] } },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  // 🧠 Map by jobId
  const cvStatsMap = new Map(
    applicationStats.map(stat => [
      stat._id.toString(),
      {
        totalReceivedCv: stat.totalReceivedCv,
        reviewedCv: stat.reviewedCv,
        newCv: stat.newCv,
      },
    ])
  );

  // ✅ Attach stats to jobs
  const result = jobs.map((job: any) => {
    const stats = cvStatsMap.get(job._id.toString()) || {
      totalReceivedCv: 0,
      reviewedCv: 0,
      newCv: 0,
    };

    return {
      ...job.toObject(),
      ...stats,
    };
  });

  const meta = await jobQuery.countTotal();

  return { meta, result };
};


const getJobById = async (id: string) => {
  const job = await Job.findById(id);

  if (!job || job.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Job not found');
  }

  return job;
};

const updateJob = async (id: string, payload: Partial<TJob>) => {
  const job = await Job.findById(id);

  if (!job || job.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Job not found');
  }

  const updated = await Job.findByIdAndUpdate(id, payload, { new: true });
  return updated;
};

const updateJobStatus = async (id: string, status: string) => {
  const job = await Job.findById(id);

  if (!job || job.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Job not found');
  }

  const updated = await Job.findByIdAndUpdate(id, { status }, { new: true });

  return updated;
}



const deleteJob = async (id: string) => {
  const job = await Job.findById(id);

  if (!job || job.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Job not found');
  }

  job.isDeleted = true;
  await job.save();

  return true;
};



const getAllJobsWithApplicantCount = async (
  query: Record<string, any> = {}
) => {
  /* 1️⃣ Base filter */
  const baseFilter = {
    isDeleted: false,
  };

  /* 2️⃣ QueryBuilder */
  const jobQuery = new QueryBuilder(
    Job.find(baseFilter)
      .populate('employerId', 'name companyName email')
    , query)
    .search(['title', 'description', 'requirements', 'skillsRequired'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const jobs = await jobQuery.modelQuery;
  const meta = await jobQuery.countTotal();

  /* 3️⃣ Attach totalApplicant */
  const result = await Promise.all(
    jobs.map(async (job: any) => {
      const totalApplicant = await Application.countDocuments({
        jobId: job._id,
        isDeleted: false,
        // status: { $ne: 'rejected' } // ✅ optional
      });

      return {
        ...job.toObject(),
        totalApplicant,
      };
    })
  );

  return { meta, result };
};

export const JobService = {
  createJob,
  getAllJobs,
  getAllJobsWithApplicantCount,
  getMyJobs,
  getJobById,
  updateJob,
  updateJobStatus,
  deleteJob,
};
