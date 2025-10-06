export const USER_ROLE = {
  ADMIN: 'admin',
  EMPLOYER: 'employer',
  CANDIDATE: 'candidate',
} as const;

export const gender = ['Male', 'Female', 'Others'] as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  BLOCKED: 'blocked',
} as const;

export const Role = Object.values(USER_ROLE);

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];