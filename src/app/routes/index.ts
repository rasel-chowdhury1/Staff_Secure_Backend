import { Router } from "express";
import { userRoutes } from "../middleware/user/user.route";
import { authRoutes } from "../middleware/auth/auth.route";
import { otpRoutes } from "../middleware/otp/otp.routes";
import { settingsRoutes } from "../middleware/setting/setting.route";
import { JobRoutes } from "../middleware/job/job.route";
import { applicationRoutes } from "../middleware/application/application.routes";
import { mySubscriptionRoutes } from "../middleware/mySubscription/mySubscription.routes";
import { paymentRoutes } from "../middleware/payment/payment.route";
import { notificationRoutes } from "../middleware/notifications/notifications.route";
import { ContactRoutes } from "../middleware/contactUs/contactUs.route";


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
     path: "/notifications",
     route: notificationRoutes
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
  {
    path: "/payment",
    route: paymentRoutes
  },
  {
    path: "/notification",
    route: notificationRoutes
  },
  {
    path: "/contactUs",
    route: ContactRoutes
  }
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;