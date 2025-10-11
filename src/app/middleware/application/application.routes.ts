import { Router } from 'express';
import { ApplicationController } from './application.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { applicationValidation } from './application.validation';
import { USER_ROLE } from '../user/user.constants';
import path from 'path';

export const applicationRoutes = Router();

// Candidate applies for a job
applicationRoutes
    .post(
        '/apply/:jobId',
        auth(USER_ROLE.CANDIDATE),
        // validateRequest(applicationValidation.createApplicationSchema),
        ApplicationController.createApplication,
    )

    .patch(
        "/send-cv/:applicationId",
        auth(USER_ROLE.ADMIN),
        ApplicationController.sentCv
    )

    .patch(
        "/sent-multiple-cvs",
        auth(USER_ROLE.ADMIN),
        ApplicationController.sendMultipleCvs
    )

    .patch(
        "/select-candidate/:applicationId",
        auth(USER_ROLE.EMPLOYER),
        ApplicationController.markApplicationSelected
    )

    .patch(
        "/reject-candidate/:applicationId",
        auth(USER_ROLE.EMPLOYER),
        ApplicationController.markApplicationRejected
    )

    // Get all applications (admin/employer)
    .get(
        '/',
        // auth(USER_ROLE.ADMIN, USER_ROLE.EMPLOYER),
        ApplicationController.getAllApplications,
    )
    .get(
        "/received-cvs",
        auth(USER_ROLE.EMPLOYER),
        ApplicationController.getAllRecivedCvsOfSpecificJobProvider
    )

    .get(
        "/view-cvs/:jobId",
        auth(USER_ROLE.ADMIN),
        ApplicationController.getAllApplicantCvsOfSpecificJob
    )

    .get(
        "/top-ai-suggested-cvs/:jobId",
        auth(USER_ROLE.ADMIN),
        ApplicationController.getTopAiSuggestedCvsForJob
    )

    .get(
        "/cv-dispatch",
        auth(USER_ROLE.ADMIN),
        ApplicationController.getAllCvDispatch
    )

    .get(
        "/placement-candidates",
        auth(USER_ROLE.ADMIN),
        ApplicationController.getAllPlacement
    )

    // Get a single application by ID
    .get(
        '/:id',
        auth(USER_ROLE.ADMIN, USER_ROLE.EMPLOYER),
        ApplicationController.getApplicationById,
    )

    // Update application status/adminNotes/AI info (admin only)
    .patch(
        '/:id',
        auth(USER_ROLE.ADMIN),
        validateRequest(applicationValidation.updateApplicationSchema),
        ApplicationController.updateApplication,
    )

    // Soft delete application (admin only)
    .delete(
        '/:id',
        auth(USER_ROLE.ADMIN),
        ApplicationController.deleteApplication,
    );
