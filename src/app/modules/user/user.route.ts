import { Router } from 'express';
import auth from '../../middleware/auth';
import fileUpload from '../../middleware/fileUpload';
import parseData from '../../middleware/parseData';
import validateRequest from '../../middleware/validateRequest';
import { verifyOtpValidations } from '../otp/otp.validation';
import { userController } from './user.controller';
import { userValidation } from './user.validation';
import { USER_ROLE } from './user.constants';
import { limiter } from '../../utils/limiter';
const upload = fileUpload('./public/uploads/profile');

export const userRoutes = Router();

userRoutes
  .post(
    '/create',
    limiter.createUserLimiter,
    validateRequest(userValidation?.userValidationSchema),
    userController.createUser,
  )

  .post(
    '/create-user-verify-otp',
    validateRequest(verifyOtpValidations.verifyOtpZodSchema),
    userController.userCreateVarification,
  )

  .patch(
    "/update-my-profile",
    auth(USER_ROLE.CANDIDATE, USER_ROLE.EMPLOYER, USER_ROLE.ADMIN),
    upload.single('image'),
    parseData(),
    userController.updateMyProfile
  )

  .patch(
    "/update-candidate-profile",
    auth(USER_ROLE.CANDIDATE),
    upload.fields([
      { name: 'image', maxCount: 1 },
      { name: 'cv', maxCount: 1 },
      { name: 'documents', maxCount: 10 },
    ]),
    parseData(),
    userController.updateCandidateProfile
  )

  .patch(
    "/update-status/:userId",
    auth(USER_ROLE.ADMIN),
    userController.updateUserStatus
  )

  .get(
    '/my-profile',
    auth(USER_ROLE.CANDIDATE, USER_ROLE.EMPLOYER, USER_ROLE.ADMIN),
    userController.getMyProfile,
  )


  .get(
    '/candidate/my-profile',
    auth(USER_ROLE.CANDIDATE),
    userController.getMyCandidateProfile,
  )

  .get(
    "/candidate/all",
    auth(USER_ROLE.ADMIN),
    userController.getAllCandidates
  )

  .get(
    "/employer/all",
    auth(USER_ROLE.ADMIN),
    userController.getAllEmployers
  )



