import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';
import { JobService } from './job.service';

const createJob = catchAsync(async (req, res) => {

  const {userId} = req.user;

  req.body.employerId = userId;


  const result = await JobService.createJob(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Job created successfully',
    data: result,
  });
});

const getAllJobs = catchAsync(async (req, res) => {
  console.log("req user ", req.user)
  const {candidateProfileId} = req.user;
  const result = await JobService.getAllJobs(req.query, candidateProfileId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Jobs fetched successfully',
    data: result,
  });

});

const getAllJobsWithApplicantCount = catchAsync(async (req, res) => {
    
  const result = await JobService.getAllJobsWithApplicantCount(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Jobs fetched successfully',
    data: result,
  });

})

const getMyJobs = catchAsync(async (req, res) => {
    
  const {userId} = req.user;

  const result = await JobService.getMyJobs(userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'My jobs fetched successfully',
    data: result,
  });
})

const getJobById = catchAsync(async (req, res) => {
  const result = await JobService.getJobById(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Job fetched successfully',
    data: result,
  });

});

const updateJob = catchAsync(async (req, res) => {
  const result = await JobService.updateJob(req.params.id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Job updated successfully',
    data: result,
  });

});

const updateJobStatus = catchAsync(async (req, res) => {
  const result = await JobService.updateJobStatus(req.params.id, req.body.status);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Job status updated successfully',
    data: result,
  });
})

const deleteJob = catchAsync(async (req, res) => {
  await JobService.deleteJob(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Job deleted successfully',
    data: null,
  });

});

export const JobController = {
  createJob,
  getAllJobs,
  getAllJobsWithApplicantCount,
  getMyJobs,
  getJobById,
  updateJob,
  updateJobStatus,
  deleteJob,
};
