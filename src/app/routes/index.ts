import { Router } from "express";
import { userRoutes } from "../middleware/user/user.route";
import { authRoutes } from "../middleware/auth/auth.route";
import { otpRoutes } from "../middleware/otp/otp.routes";


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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;