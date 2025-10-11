/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import mongoose, { Types } from 'mongoose';
import AppError from '../../error/AppError';
import { Application } from './application.model';
import { IApplication } from './application.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import Job from '../job/job.model';
import { generateAiScoreForApplication, generateAiScoresForJob } from './application.utils';
import { emitNotification } from '../../../socketIo';
import { getAdminId } from '../../DB/adminStrore';
import { sendJobApplicationSuccessEmail } from '../../utils/eamilNotifiacation';
import { User } from '../user/user.model';
import { CandidateProfile } from '../candidateProfile/candidateProfile.model';

const createApplication = async (payload: IApplication) => {

  console.log("payload from application =>>>> ", payload);

  const isExistJob = await Job.findById(payload.jobId);

  if (!isExistJob) {
    throw new AppError(httpStatus.NOT_FOUND, 'Job not found');
  }

  payload.jobProviderOwnerId = isExistJob.employerId;
  
  // Check if candidate already applied
  const exist = await Application.findOne({
    candidateId: payload.candidateId,
    jobId: payload.jobId,
    isDeleted: false,
  }).populate('candidateId');


  console.log("exist =>>>> ", exist);

  if (exist) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You have already applied for this job');
  }

  const application = await Application.create({
    ...payload,
    appliedAt: new Date(),
    status: 'applied',
  }) as any;

  console.log("application =>>>> ", application);

  if(!application) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create application');
  }

  // ✅ Fetch candidate user
  const candidate = await CandidateProfile.findById(payload.candidateId)
    .select('email name');

  if (candidate?.email) {
    sendJobApplicationSuccessEmail({
      sentTo: candidate.email,
      candidateName: candidate.name as any,
      jobTitle: isExistJob.title,
    }).catch(err =>
      console.error('Application email failed:', err)
    );
  }

  // 🔥 fire-and-forget AI (DON’T await)
  generateAiScoresForJob(application.jobId.toString())
    .catch(err => console.error("AI scoring failed:", err));

  return application;
};


const sendCv = async (
  applicationId: string,
  adminNotes?:  string 
) => {
  // 1️⃣ Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid application ID');
  }

  // 2️⃣ Find application with job populated
  const application = await Application.findById(applicationId).populate<{
    jobId: typeof Job;
  }>('jobId', 'status title jobProviderOwnerId');

  if (!application) {
    throw new AppError(httpStatus.NOT_FOUND, 'Application not found');
  }

  // 3️⃣ Prevent double forwarding
  if (application.forwardedAt) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This CV has already been forwarded'
    );
  }

  // 4️⃣ Update application
  application.status = 'forwarded';
  application.forwardedAt = new Date();

  if (adminNotes) {
    application.adminNotes = adminNotes;
  }

  await application.save();

  // 5️⃣ Update job status if New
  const job = application.jobId as any;

  if (job?.status === 'New') {
    job.status = 'Cvs Sent';
    await job.save();
  }


  
    // 6️⃣ Send notification to employer
  const employerId = job?.jobProviderOwnerId;

  if (employerId) {
    await emitNotification({
      senderId: getAdminId(), // Admin/system sender
      receiverId: employerId,
      message: `A new CV has been received for your job posting (${job?.title})`,
    });
  }

  // 6️⃣ Return updated application
  return application;

};


const sendMultipleCvs = async (
  applications: {
    applicationId: string;
    adminNotes?: string;
  }[]
) => {
  // 1️⃣ Validate input
  if (!Array.isArray(applications) || applications.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'applications must be a non-empty array'
    );
  }

  // 2️⃣ Validate ObjectIds
  const applicationIds = applications.map(app => app.applicationId);

  const invalidIds = applicationIds.filter(
    id => !mongoose.Types.ObjectId.isValid(id)
  );

  if (invalidIds.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid application IDs: ${invalidIds.join(', ')}`
    );
  }

  // 3️⃣ Fetch applications with job populated
  const dbApplications = await Application.find({
    _id: { $in: applicationIds },
  }).populate<{
    jobId: typeof Job;
  }>('jobId', 'status title jobProviderOwnerId');

  if (dbApplications.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'No applications found');
  }

  // 4️⃣ Prevent already-forwarded CVs
  const alreadyForwarded = dbApplications.filter(app => app.forwardedAt);

  if (alreadyForwarded.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `${alreadyForwarded.length} CV(s) have already been forwarded`
    );
  }

  // 5️⃣ Build bulk updates (different notes per application)
  const now = new Date();

  const bulkOps = dbApplications.map(app => {
    const payload = applications.find(
      a => a.applicationId === ( app as any)._id.toString()
    );

    return {
      updateOne: {
        filter: { _id: app._id },
        update: {
          $set: {
            status: 'forwarded',
            forwardedAt: now,
            ...(payload?.adminNotes && { adminNotes: payload.adminNotes }),
          },
        },
      },
    };
  });

  await Application.bulkWrite(bulkOps);

  // 6️⃣ Group by job
  const jobMap = new Map<string, any>();

  dbApplications.forEach(app => {
    const job = app.jobId as any;
    if (job?._id) {
      jobMap.set(job._id.toString(), job);
    }
  });

  // 7️⃣ Update job status + notify employer (once per job)
  for (const job of jobMap.values()) {
    if (job.status === 'New') {
      job.status = 'Cvs Sent';
      await job.save();
    }

    if (job.jobProviderOwnerId) {
      await emitNotification({
        senderId: getAdminId(),
        receiverId: job.jobProviderOwnerId,
        message: `New CVs have been received for your job posting (${job.title})`,
      });
    }
  }

  // 8️⃣ Return updated applications
  const updatedApplications = await Application.find({
    _id: { $in: applicationIds },
  });

  return {
    totalSent: updatedApplications.length,
    applications: updatedApplications,
  };
};

const markApplicationSelected = async (
  userId: string,
  applicationId: string,
) => {

  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid application ID');
  }

  const application = await Application.findById(applicationId).populate('candidateId jobProviderOwnerId jobId');

  if (!application) {
    throw new AppError(httpStatus.NOT_FOUND, 'Application not found');
  }

  const jobProvider = application.jobProviderOwnerId as any;

  if(jobProvider._id.toString() !== userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You are not authorized to select this application');
  }

  // Update only if not already selected
  if (application.status === 'selected') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Application is already selected');
  }

  application.status = 'selected';
  application.selectedAt = new Date();

  await application.save();

  const candidate = application.candidateId as any;

  const job = application.jobId as any;

  const adminId = getAdminId();

  // Send notifications in parallel
  await Promise.all([
    // Admin notification
    emitNotification({
      senderId: new mongoose.Types.ObjectId(userId),
      receiverId: adminId,
      message: `New placement confirmed: ${candidate.name } at ${jobProvider.companyName}`,
    }),

    // Candidate notification
    emitNotification({
      senderId: new mongoose.Types.ObjectId(userId),
      receiverId: candidate.userId,
      message: `🎉 Congratulations ${candidate.name}! You have been selected for a ${job.title} at ${jobProvider.companyName}. Our team will contact you soon with the next steps.`,
    }),

  ]);
  

  return application;

};

const markApplicationRejected = async (
  userId: string,
  applicationId: string,
) => {

  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid application ID');
  }

  const application = await Application.findById(applicationId);


  if (!application) {
    throw new AppError(httpStatus.NOT_FOUND, 'Application not found');
  }

  if(application.jobProviderOwnerId.toString() !== userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You are not authorized to reject this application');
  }

  // Update only if not already rejected
  if (application.status === 'rejected') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Application is already rejected');
  }

  application.status = 'rejected';
  application.rejectedAt = new Date();

  await application.save();

  return application;
};

const getAllApplications = async (query: Record<string, any> = {}) => {
  const baseFilter = { isDeleted: false };

  const appQuery = new QueryBuilder(Application.find(baseFilter)
    .populate('candidateId', 'fullName email')
    .populate('jobId', 'title')
    .populate('jobProviderOwnerId', 'fullName email'), query)
    .search(['adminNotes'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await appQuery.modelQuery;
  const meta = await appQuery.countTotal();

  return { meta, result };
};

const getAllRecivedCvsOfSpecificJobProvider = async (
  jobProviderId: string,
  query: Record<string, any> = {}
) => {
  const baseFilter = {
    jobProviderOwnerId: jobProviderId,
    forwardedAt: { $ne: null },
    isDeleted: false,
  };

  const appQuery = new QueryBuilder(
    Application.find(baseFilter)
      .populate('candidateId', 'name email yearsOfExperience cv bio documentAndCertifications')
      .populate('jobId', 'title jobReferralCode')
      .populate('jobProviderOwnerId', 'name email'),
    query
  )
    .search(['adminNotes'])
    .filter()
    // ✅ latest forwarded first
    .sort('-forwardedAt')
    .paginate()
    .fields();

  const result = await appQuery.modelQuery;
  const meta = await appQuery.countTotal();

  return { meta, result };
}

const getAllApplicantCvsOfSpecificJob = async (
  jobId: string,
  query: Record<string, any> = {}
) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw new Error('Invalid jobId');
  }

  const baseFilter = {
    jobId: new mongoose.Types.ObjectId(jobId),
    isDeleted: false,
  };

  const appQuery = new QueryBuilder(
    Application.find(baseFilter)
      .select('status appliedAt candidateId')
      .populate({
        path: 'candidateId',
        select:
          'name email cv documentAndCertifications',
      }),
    query
  )
    // 🔍 search inside candidate profile fields
    .search([
      'candidateId.name',
      'candidateId.email',
      'candidateId.location',
      'candidateId.designation',
      'candidateId.skills',
    ])
    .filter()
    // 🕒 latest applied first
    .sort(query.sort || '-appliedAt')
    .paginate()
    .fields();

  const result = await appQuery.modelQuery;
  const meta = await appQuery.countTotal();

  return { meta, result };
};

const getTopAiSuggestedCvsForJob = async (jobId: string) => {

  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw new Error("Invalid jobId");
  }

  // Filter applications that have an AI score
  const baseFilter = {
    jobId: new mongoose.Types.ObjectId(jobId),
    isDeleted: false,
    status: 'applied',
    aiScore: { $ne: null },
  };

  // Fetch top 3 applications sorted by AI score descending
  const topApplications = await Application.find(baseFilter)
    .select("status appliedAt aiScore aiReason matchedSkills aiMatchLevel candidateId jobId jobProviderOwnerId adminNotes ")
    .populate({
      path: "candidateId",
      select: "name email cv designation skills yearsOfExperience bio location area postalCode county availability documentAndCertifications",
    })
    .populate({
      path: "jobId",
      select: "title skillsRequired experience description",
    })
    .populate("jobProviderOwnerId", "name companyName email")
    .sort({ aiScore: -1 }) // descending order
    .limit(3);

  return topApplications;
};


const getAllCvDispatch = async (
  query: Record<string, any> = {}
) => {
  const baseFilter = {
    forwardedAt: { $ne: null }, // ✅ only forwarded
    isDeleted: false,
  };

  const appQuery = new QueryBuilder(
    Application.find(baseFilter)
      // ✅ select only necessary application fields
      .select('status appliedAt forwardedAt adminNotes candidateId jobId')
      .populate({
        path: 'candidateId',
        select: 'name email cv designation',
      })
      .populate({
        path: 'jobId',
        select: 'title',
      })
      .populate("jobProviderOwnerId", "name companyName email"),
    query
  )
    // 🔍 allow search on candidate or job fields
    .search([
      'candidateId.name',
      'candidateId.email',
      'candidateId.location',
      'candidateId.designation',
      'candidateId.skills',
      'jobId.title'
    ])
    .filter()
    // 🕒 latest forwarded first
    .sort(query.sort || '-forwardedAt')
    .paginate()
    .fields();

  const result = await appQuery.modelQuery;
  const meta = await appQuery.countTotal();

  return { meta, result };
};




const getAllPlacement = async (query: Record<string, any> = {}) => {
  const baseFilter = {
    status: 'selected', // Only selected applications
    isDeleted: false,
  };

  const placementQuery = new QueryBuilder(
    Application.find(baseFilter)
      .populate({
        path: 'candidateId',
        select: 'name email cv location designation skills',
      })
      .populate({
        path: 'jobId',
        select: 'title location jobType',
      })
      .populate({
        path: 'jobProviderOwnerId',
        select: 'name email companyName',
      }),
    query
  )
    .search(['candidateId.name', 'candidateId.email', 'jobId.title', 'jobProviderOwnerId.name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await placementQuery.modelQuery;
  const meta = await placementQuery.countTotal();

  return { meta, result };
};



const getApplicationById = async (id: string) => {
  const application = await Application.findById(id);

  if (!application || application.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Application not found');
  }

  return application;
};

const updateApplication = async (id: string, payload: Partial<IApplication>) => {
  const application = await Application.findById(id);

  if (!application || application.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Application not found');
  }

  if (payload.status) {
    application.status = payload.status;
    const now = new Date();
    if (payload.status === 'forwarded') application.forwardedAt = now;
    else if (payload.status === 'selected') application.selectedAt = now;
    else if (payload.status === 'rejected') application.rejectedAt = now;
  }

  if (payload.adminNotes) application.adminNotes = payload.adminNotes;
  if (payload.aiScore !== undefined) application.aiScore = payload.aiScore;
  if (payload.aiReason) application.aiReason = payload.aiReason;

  await application.save();
  return application;
};

const deleteApplication = async (id: string) => {
  const application = await Application.findById(id);

  if (!application || application.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Application not found');
  }

  application.isDeleted = true;
  await application.save();

  return true;
};

export const ApplicationService = {
  createApplication,
  sendCv,
  sendMultipleCvs,
  markApplicationSelected,
  markApplicationRejected,
  getAllApplications,
  getAllRecivedCvsOfSpecificJobProvider,
  getAllApplicantCvsOfSpecificJob,
  getTopAiSuggestedCvsForJob,
  getAllCvDispatch,
  getAllPlacement,
  getApplicationById,
  updateApplication,
  deleteApplication,
};
