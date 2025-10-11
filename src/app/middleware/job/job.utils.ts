// Generate random referral code
export const generateReferralCode = () =>
  'JOB-' + Math.random().toString(36).substring(2, 10).toUpperCase();