import { Router } from 'express'
import { userRoutes } from '../modules/user/user.route'
import { authRoutes } from '../modules/auth/auth.route'
import { otpRoutes } from '../modules/otp/otp.routes'
import { settingsRoutes } from '../modules/setting/setting.route'
import { notificationRoutes } from '../modules/notifications/notifications.route'
import { JobRoutes } from '../modules/job/job.route'
import { applicationRoutes } from '../modules/application/application.routes'
import { ChatRoutes } from '../modules/chat/chat.route'
import { messageRoutes } from '../modules/message/message.route'
import { overviewRoutes } from '../modules/overview/overview.route'
import { mySubscriptionRoutes } from '../modules/mySubscription/mySubscription.routes'
import { paymentRoutes } from '../modules/payment/payment.route'
import { ContactRoutes } from '../modules/contactUs/contactUs.route'


const router = Router()

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
    path: '/otp',
    route: otpRoutes
    ,

  },
  {
    path: '/settings',
    route: settingsRoutes,
  },
  {
    path: '/notifications',
    route: notificationRoutes,
  },
  {
    path: '/job',
    route: JobRoutes,
  },
  {
    path: '/application',
    route: applicationRoutes,
  },
  {
    path: '/chat',
    route: ChatRoutes,
  },
  {
    path: '/message',
    route: messageRoutes,
  },
  {
    path: '/overview',
    route: overviewRoutes,
  },
  {
    path: '/subscription',
    route: mySubscriptionRoutes,
  },
  {
    path: '/payment',
    route: paymentRoutes,
  },
  {
    path: '/notification',
    route: notificationRoutes,
  },
  {
    path: '/contactUs',
    route: ContactRoutes,
  },
]

moduleRoutes.forEach((route) => router.use(route.path, route.route))

export default router
