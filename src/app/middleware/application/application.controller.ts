import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';
import { ApplicationService } from './application.service';
import { User } from '../user/user.model';

const createApplication = catchAsync(async (req, res) => {
  // candidateId should come from authenticated user
  const { userId } = req.user;
  
  const isExistUser = await User.IsUserExistById(userId);

  if (!isExistUser) {
    throw new Error('User not found');
  }

  if(!isExistUser.candidateProfileId) {
    throw new Error('Candidate profile data not found. please update your profile first.');
  }

  req.body.candidateId = isExistUser.candidateProfileId;
  req.body.jobId = req.params.jobId;

  const result = await ApplicationService.createApplication(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Application created successfully',
    data: result,
  });
});


const sentCv = catchAsync(async (req, res) => {
  const applicationId = req.params.applicationId;
  const {adminNotes} = req.body

  const result = await ApplicationService.sendCv(applicationId, adminNotes);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'CV sent successfully',
    data: result,
  });

});

const sendMultipleCvs = catchAsync(async (req, res) => {
  const { applications } = req.body;

  const result = await ApplicationService.sendMultipleCvs(applications);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'CVs sent successfully',
    data: result,
  });
});

const markApplicationSelected = catchAsync(async (req, res) => {

  const {userId} = req.user;
  const result = await ApplicationService.markApplicationSelected(userId, req.params.applicationId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Application selected successfully',
    data: result,
  });

})

const markApplicationRejected = catchAsync(async (req, res) => {

  const {userId} = req.user;
  const result = await ApplicationService.markApplicationRejected(userId, req.params.applicationId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Application rejected successfully',
    data: result,
  });

})

const getAllApplications = catchAsync(async (req, res) => {
  const result = await ApplicationService.getAllApplications(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Applications fetched successfully',
    data: result,
  });
});

const getAllRecivedCvsOfSpecificJobProvider = catchAsync(async (req, res) => {

  const {userId} = req.user;
  const result = await ApplicationService.getAllRecivedCvsOfSpecificJobProvider(userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Applications recived cv fetched successfully',
    data: result,
  });

})

const getAllApplicantCvsOfSpecificJob = catchAsync(async (req, res) => {

  const result = await ApplicationService.getAllApplicantCvsOfSpecificJob(req.params.jobId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Application cv of specific job fetched successfully',
    data: result,
  });
})

const getTopAiSuggestedCvsForJob = catchAsync(async (req, res) => {

  const result = await ApplicationService.getTopAiSuggestedCvsForJob(req.params.jobId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Application cv of specific job fetched successfully',
    data: result,
  });

})

const getAllCvDispatch = catchAsync(async (req, res) => {

  const result = await ApplicationService.getAllCvDispatch(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Application cv dispatch fetched successfully',
    data: result,
  });
})

const getAllPlacement = catchAsync(async (req, res) => {

  const result = await ApplicationService.getAllPlacement(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Application placement fetched successfully',
    data: result,
  });
})

const getApplicationById = catchAsync(async (req, res) => {
  const result = await ApplicationService.getApplicationById(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Application fetched successfully',
    data: result,
  });
});

const updateApplication = catchAsync(async (req, res) => {
  const result = await ApplicationService.updateApplication(req.params.id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Application updated successfully',
    data: result,
  });
});

const deleteApplication = catchAsync(async (req, res) => {
  await ApplicationService.deleteApplication(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Application deleted successfully',
    data: null,
  });
});

export const ApplicationController = {
  createApplication,
  sentCv,
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
