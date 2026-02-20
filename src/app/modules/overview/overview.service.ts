import mongoose from 'mongoose'
import { Application } from '../application/application.model'
import { Payment } from '../../modules/payment/payment.model'
import { USER_ROLE } from '../user/user.constants'
import { User } from '../user/user.model'
import Job from '../job/job.model'
import { Notification } from '../notifications/notifications.model'
import AppError from '../../error/AppError'

const adminOverview = async () => {
  const [userStats, paymentStats, applicationStats] = await Promise.all([
    // ===============================
    // 1️⃣ USER STATS
    // ===============================
    User.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]),

    // ===============================
    // 2️⃣ PAYMENT STATS
    // ===============================
    Payment.aggregate([
      {
        $match: {
          status: 'success',
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$finalAmount' },
        },
      },
    ]),

    // ===============================
    // 3️⃣ APPLICATION STATS
    // ===============================
    Application.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalCvsDispatch: {
            $sum: {
              $cond: [{ $ne: ['$forwardedAt', null] }, 1, 0],
            },
          },
          totalPlacement: {
            $sum: {
              $cond: [{ $eq: ['$status', 'selected'] }, 1, 0],
            },
          },
        },
      },
    ]),
  ])

  // ===============================
  // 📊 Parse User Stats
  // ===============================
  const totalEmployers =
    userStats.find((u) => u._id === USER_ROLE.EMPLOYER)?.count || 0

  const totalCandidates =
    userStats.find((u) => u._id === USER_ROLE.CANDIDATE)?.count || 0

  // ===============================
  // 💰 Parse Earnings
  // ===============================
  const totalEarnings =
    paymentStats.length > 0 ? paymentStats[0].totalEarnings : 0

  // ===============================
  // 📄 Parse Application Stats
  // ===============================
  const totalCvsDispatch =
    applicationStats.length > 0 ? applicationStats[0].totalCvsDispatch : 0

  const totalPlacement =
    applicationStats.length > 0 ? applicationStats[0].totalPlacement : 0

  return {
    totalEmployers,
    totalCandidates,
    totalEarnings,
    totalCvsDispatch,
    totalPlacement,
  }
}

// user overview statistics
const getUserOverviewByYear = async (
  role: 'candidate' | 'employer',
  year: number
) => {
  const startOfYear = new Date(year, 0, 1) // Jan 1
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999) // Dec 31

  const overview = await User.aggregate([
    {
      $match: {
        role,
        createdAt: { $gte: startOfYear, $lte: endOfYear },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: { month: { $month: '$createdAt' } },
        totalUsers: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        month: '$_id.month',
        totalUsers: 1,
      },
    },
  ])

  // Fill all months from Jan to Dec
  const result = []
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  for (let i = 1; i <= 12; i++) {
    const data = overview.find((o) => o.month === i)
    result.push({
      month: `${monthNames[i - 1]}`,
      totalUsers: data?.totalUsers || 0,
    })
  }

  return result
}

// earning overview statistics
const getEarningsOverviewByYear = async (year: number) => {
  const startOfYear = new Date(year, 0, 1) // Jan 1
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999) // Dec 31

  // Aggregate payments by month
  const overview = await Payment.aggregate([
    {
      $match: {
        status: 'success',
        isDeleted: false,
        buyTime: { $gte: startOfYear, $lte: endOfYear },
      },
    },
    {
      $group: {
        _id: { month: { $month: '$buyTime' } },
        totalEarnings: { $sum: '$finalAmount' },
      },
    },
    {
      $project: {
        _id: 0,
        month: '$_id.month',
        totalEarnings: 1,
      },
    },
  ])

  // Fill all months Jan → Dec
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  const result = []
  for (let i = 1; i <= 12; i++) {
    const data = overview.find((o) => o.month === i)
    result.push({
      month: `${monthNames[i - 1]}`,
      totalEarnings: data?.totalEarnings || 0,
    })
  }

  return result
}

const getLatestNotificationsAndJobs = async (userId: string) => {
  const notifications = await Notification.find({
    receiverId: new mongoose.Types.ObjectId(userId),
  })
    .sort({ createdAt: -1 })
    .limit(8)

  const jobs = await Job.find()
    .sort({ createdAt: -1 })
    .populate('employerId', 'name companyName email')
    .select('title createdAt status ')
    .limit(6)

  return {
    notifications,
    jobs,
  }
}

const CvDispatchOverview = async () => {
  const now = new Date()

  // Start of today
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  // Start of this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const totalForwarded = await Application.countDocuments({
    forwardedAt: { $ne: null },
    isDeleted: false,
  })

  const totalThisMonth = await Application.countDocuments({
    forwardedAt: { $gte: startOfMonth },
    isDeleted: false,
  })

  const totalToday = await Application.countDocuments({
    forwardedAt: { $gte: startOfToday },
    isDeleted: false,
  })

  return {
    totalForwarded,
    totalThisMonth,
    totalToday,
  }
}

const placementOverview = async () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // start of today

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1) // first day of current month

  // Base filter for selected applications
  const baseFilter = { status: 'selected', isDeleted: false }

  // Total selected applications
  const totalPlacement = await Application.countDocuments(baseFilter)

  // Selected this month
  const totalPlacementThisMonth = await Application.countDocuments({
    ...baseFilter,
    selectedAt: { $gte: startOfMonth },
  })

  // Selected today
  const totalPlacementToday = await Application.countDocuments({
    ...baseFilter,
    selectedAt: { $gte: today },
  })

  return {
    totalPlacement,
    totalPlacementThisMonth,
    totalPlacementToday,
  }
}

// Employee overview
const getEmployeeOverview = async (userId: string) => {
  const employerId = new mongoose.Types.ObjectId(userId)
  const now = new Date()

  /* 1️⃣ User + Subscription */
  const user = await User.findById(userId).populate('mySubscriptionsId').lean()

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found')
  }

  const subscription = user.mySubscriptionsId as any | null

  /* 2️⃣ Job statistics (single aggregation) */
  const [jobStats] = await Job.aggregate([
    {
      $match: {
        employerId,
        lastApplyDate: { $gte: now },
        isDeleted: false,
      },
    },
    {
      $count: 'totalActiveRequirements',
    },
  ])

  /* 3️⃣ Application statistics (ONE QUERY using $facet) */
  const [applicationStats] = await Application.aggregate([
    {
      $match: {
        jobProviderOwnerId: employerId,
        isDeleted: false,
      },
    },
    {
      $facet: {
        totalCvReceived: [
          { $match: { forwardedAt: { $ne: null } } },
          { $count: 'count' },
        ],
        totalNewCv: [{ $match: { status: 'forwarded' } }, { $count: 'count' }],
        totalPlacement: [
          { $match: { status: 'selected' } },
          { $count: 'count' },
        ],
        usedCV: subscription?.buyTime
          ? [
              {
                $match: {
                  forwardedAt: {
                    $ne: null,
                    $gte: subscription.buyTime,
                  },
                },
              },
              { $count: 'count' },
            ]
          : [],
      },
    },
  ])

  /* 4️⃣ Notifications */
  const notifications = await Notification.find({
    receiverId: employerId,
  })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean()

  /* 5️⃣ CV limits */
  const CV_LIMIT: Record<string, number | null> = {
    Bronze: 3,
    Platinum: 10,
    Diamond: null,
  }

  const limit = subscription ? (CV_LIMIT[subscription.type] ?? 0) : 0

  return {
    totalActiveRequirements: jobStats?.totalActiveRequirements ?? 0,

    totalCvReceived: applicationStats?.totalCvReceived?.[0]?.count ?? 0,

    totalNewCv: applicationStats?.totalNewCv?.[0]?.count ?? 0,

    totalPlacement: applicationStats?.totalPlacement?.[0]?.count ?? 0,

    mySubscription: subscription
      ? {
          ...subscription,
          limit,
          usedCV: applicationStats?.usedCV?.[0]?.count ?? 0,
        }
      : null,

    notifications,
  }
}

export const OverviewService = {
  adminOverview,
  CvDispatchOverview,
  placementOverview,
  getUserOverviewByYear,
  getEarningsOverviewByYear,
  getLatestNotificationsAndJobs,
  getEmployeeOverview,
}
