import { Router } from "express";
import { userRoutes } from "../middleware/user/user.route";
import { authRoutes } from "../middleware/auth/auth.route";
import { otpRoutes } from "../middleware/otp/otp.routes";
import { settingsRoutes } from "../middleware/setting/setting.route";
import { JobRoutes } from "../middleware/job/job.route";
import { applicationRoutes } from "../middleware/application/application.routes";
import { mySubscriptionRoutes } from "../middleware/mySubscription/mySubscription.routes";


const router = Router();

const moduleRoutes = [
    {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: "/otp",
    route: otpRoutes
  },
  {
    path: "/settings",
    route: settingsRoutes
  },
  {
    path: "/job",
    route: JobRoutes
  },
  {
    path: "/application",
    route: applicationRoutes
  },
  {
    path: "/subscription",
    route: mySubscriptionRoutes
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;