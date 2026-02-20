import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { userService } from './user.service';

import httpStatus from 'http-status';
import { storeFile, storeFiles } from '../../utils/fileHelper';
import AppError from '../../error/AppError';
import { User } from './user.model';


const createUser = catchAsync(async (req: Request, res: Response) => {

  const createUserToken = await userService.createUserToken(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Check email for OTP',
    data:  createUserToken ,
  });
});


const userCreateVarification = catchAsync(async (req, res) => {

    let token: any = req.headers?.authorization || req?.headers?.token;


    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }

    // 1️⃣ Missing Token → 401 Unauthorized
    if (!token) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'Authorization token is missing'
      );
    }

  const { otp } = req.body;
  const newUser = await userService.otpVerifyAndCreateUser({ otp, token });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User create successfully',
    data: newUser,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  if (req?.file) {
    req.body.profileImage = storeFile('profile', req?.file?.filename);
  }

  const result = await userService.updateUser(req?.user?.userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'profile updated successfully',
    data: result,
  });
});

const updateCandidateProfile = catchAsync(async (req: Request, res: Response) => {

  const {userId} = req.user;

  // const isExist = await User.IsUserExistById(userId);

  const isExist = await User.findById(userId).populate("candidateProfileId").lean();

  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }


  //   // Check if there are uploaded files
  if (req.files) {
    try {
      // Use storeFiles to process all uploaded files
      const filePaths = storeFiles(
        'profile',
        req.files as { [fieldName: string]: Express.Multer.File[] },
      );


      if ( filePaths.image && filePaths.image.length > 0) {
        req.body.profileImage = filePaths.image[0];
      }

      
      if ( filePaths.cv && filePaths.cv.length > 0) {
        req.body.cv = filePaths.cv[0];
      }
      // Set documents (multiple files)
      if (filePaths.documents && filePaths.documents.length > 0) {
        req.body.documentAndCertifications = filePaths.documents; // Assign full array of documents
      }

    } catch (error: any) {
      console.error('Error processing files:', error.message);
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: 'Failed to process uploaded files',
        data: null,
      });
    }
  }

  const result = await userService.updateUserCandidateProfile(isExist, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Candidateprofile updated successfully',
    data: result,
  });

})

const updateUserStatus = catchAsync(async (req, res) => {

  const result = await userService.updateUserStatus(req.params.userId, req.body.status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User status updated successfully',
    data: result,
  });

});


const getMyProfile = catchAsync(async (req, res) => {
   const { userId } = req.user;

  const result = await userService.getMyProfile(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile fetched successfully',
    data: result,
  });
})

const getMyCandidateProfile = catchAsync(async (req, res) => {
  const { userId } = req.user;

 const result = await userService.getMyCandidateProfile(userId);

 sendResponse(res, {
   statusCode: httpStatus.OK,
   success: true,
   message: 'My candidate profile fetched successfully',
   data: result,
 });
})


const getAllCandidates = catchAsync(async (req, res) => {
  const result = await userService.getAllCandidates(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Candidates fetched successfully',
    data: result,
  });
})

const getAllEmployers = catchAsync(async (req, res) => {
  const result = await userService.getAllEmployers(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employers fetched successfully',
    data: result,
  });

})






export const userController = {
  createUser,
  userCreateVarification,
  updateMyProfile,
  updateCandidateProfile,
  updateUserStatus,
  getMyProfile,
  getMyCandidateProfile,
  getAllCandidates,
  getAllEmployers
};
