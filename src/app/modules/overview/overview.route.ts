import { Router } from "express";
import { OverviewController } from "./overview.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";


export const overviewRoutes = Router();

overviewRoutes
.get(
  '/admin/user-statistics',
  auth(USER_ROLE.ADMIN),
  OverviewController.getUserOverviewByYear
)

.get(
  '/admin/earning-statistics',
  auth(USER_ROLE.ADMIN),
  OverviewController.getEarningsOverviewByYear
)

.get(
  "/admin/total-overview",
  auth(USER_ROLE.ADMIN),
  OverviewController.adminOverview
)

.get(
  '/admin/latest-notifications-and-jobs',
  auth(USER_ROLE.ADMIN),
  OverviewController.getLatestNotificationsAndJobs
)

.get(
    "/cv-dispatch",
    auth(USER_ROLE.ADMIN),
    OverviewController.CvDispatchOverview
)

.get(
  "/placement",
  auth(USER_ROLE.ADMIN),
  OverviewController.placementOverview
)


.get(
  "/employee",
  auth(USER_ROLE.EMPLOYER),
  OverviewController.getEmployeeOverview
)