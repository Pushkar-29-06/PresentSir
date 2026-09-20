/**
 * API Endpoints
 * Centralized endpoint definitions based on BACKEND_SPEC.md
 */

export const endpoints = {
  // Auth
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    password: '/auth/password',
    me: '/me',
    serverTime: '/meta/server-time',
  },

  // Device
  device: {
    registerChallenge: '/device/register/challenge',
    register: '/device/register',
    status: '/device/status',
    changeRequests: '/device/change-requests',
  },

  // Attendance
  attendance: {
    submissions: '/attendance/submissions',
  },

  // Student
  student: {
    dashboard: '/student/dashboard',
    attendanceSummary: '/student/attendance/summary',
    courseRecords: (offeringId: number) => `/student/attendance/courses/${offeringId}/records`,
    trend: '/student/attendance/trend',
    schedule: '/student/schedule',
    academics: '/student/academics',
    dispute: (recordId: number) => `/student/attendance/records/${recordId}/disputes`,
  },

  // Notifications
  notifications: {
    list: '/notifications',
    markRead: (id: number) => `/notifications/${id}/read`,
  },
} as const;
