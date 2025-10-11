import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import { JobValidation } from './job.validation';
import { JobController } from './job.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = express.Router();

router
    .post(
        '/create',
        auth(USER_ROLE.EMPLOYER, USER_ROLE.ADMIN),
        validateRequest(JobValidation.createJobValidationSchema),
        JobController.createJob,
    )

    .get(
        '/all', 
        auth(USER_ROLE.CANDIDATE,USER_ROLE.EMPLOYER, USER_ROLE.ADMIN),
        JobController.getAllJobs
    )

    .get(
        "/all/withApplicantsCount",
        auth(USER_ROLE.CANDIDATE,USER_ROLE.EMPLOYER, USER_ROLE.ADMIN),
        JobController.getAllJobsWithApplicantCount
    )

    .get(
        '/my', 
        auth(USER_ROLE.CANDIDATE,USER_ROLE.EMPLOYER, USER_ROLE.ADMIN),
        JobController.getMyJobs 
    )

    .get(
        '/:id', 
        auth(USER_ROLE.CANDIDATE,USER_ROLE.EMPLOYER, USER_ROLE.ADMIN),
        JobController.getJobById
    )

    .patch(
        '/update/:id',
        auth(USER_ROLE.EMPLOYER, USER_ROLE.ADMIN),
        validateRequest(JobValidation.updateJobValidationSchema),
        JobController.updateJob,
    )

    .patch(
        "/update/status/:id",
        auth(USER_ROLE.EMPLOYER, USER_ROLE.ADMIN),
        validateRequest(JobValidation.updateJobStatusValidationSchema),
        JobController.updateJobStatus
    )

    .delete(
        '/:id', 
        auth(USER_ROLE.EMPLOYER, USER_ROLE.ADMIN),
        JobController.deleteJob
    );

export const JobRoutes = router;
