import type { AuthUser, MeResponse, Role } from "./types";

export const mockUsers: Record<Role, AuthUser> = {
  STUDENT: {
    id: 1,
    role: "STUDENT",
    name: "Dev Student",
  },
  FACULTY: {
    id: 2,
    role: "FACULTY",
    name: "Dev Faculty",
  },
  ADMIN: {
    id: 3,
    role: "ADMIN",
    name: "Dev Admin",
  },
};

export const mockMeResponses: Record<Role, MeResponse> = {
  STUDENT: {
    user: {
      id: 1,
      role: "STUDENT",
      name: "Dev Student",
      login_id: "STU001",
      email: "student.dev@presentsir.edu",
      phone: "+91-9876543210",
      department_id: 1,
      status: "active",
    },
    role: "STUDENT",
  },
  FACULTY: {
    user: {
      id: 2,
      role: "FACULTY",
      name: "Dev Faculty",
      login_id: "FAC001",
      email: "faculty.dev@presentsir.edu",
      phone: "+91-9876543211",
      department_id: 1,
      status: "active",
    },
    role: "FACULTY",
  },
  ADMIN: {
    user: {
      id: 3,
      role: "ADMIN",
      name: "Dev Admin",
      login_id: "ADM001",
      email: "admin.dev@presentsir.edu",
      phone: "+91-9876543212",
      department_id: null,
      status: "active",
    },
    role: "ADMIN",
  },
};

// Mock API responses for common endpoints
export const mockApiResponses: Record<string, unknown> = {
  "/faculty/slots": [
    {
      id: 1,
      offering_id: 101,
      course_code: "CS301",
      course_name: "Data Structures",
      day_of_week: 1,
      start_time: "09:00",
      end_time: "10:00",
      room: "A101",
      active: true,
    },
    {
      id: 2,
      offering_id: 102,
      course_code: "CS302",
      course_name: "Database Systems",
      day_of_week: 1,
      start_time: "11:00",
      end_time: "12:00",
      room: "A102",
      active: true,
    },
    {
      id: 3,
      offering_id: 103,
      course_code: "CS303",
      course_name: "Software Engineering",
      day_of_week: 2,
      start_time: "14:00",
      end_time: "15:00",
      room: "A103",
      active: true,
    },
    {
      id: 4,
      offering_id: 101,
      course_code: "CS301",
      course_name: "Data Structures",
      day_of_week: 3,
      start_time: "10:00",
      end_time: "11:00",
      room: "A101",
      active: true,
    },
  ],
  "/attendance/sessions": [
    {
      id: 1,
      status: "OPEN",
      opened_at: "2026-10-02T09:00:00",
      close_at: "2026-10-02T10:00:00",
      scheduled_start: "2026-10-02T09:00:00",
      scheduled_end: "2026-10-02T10:00:00",
    },
    {
      id: 2,
      status: "CLOSED",
      opened_at: "2026-10-01T11:00:00",
      close_at: "2026-10-01T12:00:00",
      scheduled_start: "2026-10-01T11:00:00",
      scheduled_end: "2026-10-01T12:00:00",
    },
    {
      id: 3,
      status: "SCHEDULED",
      scheduled_start: "2026-10-03T14:00:00",
      scheduled_end: "2026-10-03T15:00:00",
    },
  ],
  "/admin/users": [
    { id: 1, role: "STUDENT", login_id: "STU001", name: "Aarav Sharma", department_id: 1, status: "ACTIVE", registration_status: "REGISTERED", device_id: 101, registration_window_id: null },
    { id: 2, role: "FACULTY", login_id: "FAC001", name: "Dr. Rajesh Kumar", department_id: 1, status: "ACTIVE", registration_status: "REGISTERED", device_id: 102, registration_window_id: null },
    { id: 3, role: "STUDENT", login_id: "STU002", name: "Priya Patel", department_id: 2, status: "ACTIVE", registration_status: "PENDING", device_id: null, registration_window_id: 50 },
    { id: 4, role: "STUDENT", login_id: "STU003", name: "Rohan Verma", department_id: 1, status: "ACTIVE", registration_status: "NOT_REGISTERED", device_id: null, registration_window_id: null }
  ],
  "/admin/requests": [
    { id: 1, user_id: 3, type: "DEVICE_CHANGE", reason: "Phone upgraded to new model", status: "PENDING", new_android_id: "and_98765", created_at: "2026-10-01T11:20:00Z" },
    { id: 2, user_id: 4, type: "REBIND", reason: "Lost old device", status: "PENDING", new_android_id: "and_43210", created_at: "2026-10-01T09:15:00Z" }
  ],
  "/admin/policies": [
    { id: 1, scope: "GLOBAL", scope_id: null, threshold_percent: 75, effective_from: "2026-08-01T00:00:00Z", set_by: 3 }
  ],
  "/analytics/institution": {
    sessions_held: 1420,
    students: 850,
    offerings: 48,
    attendance_percentage: 84.5,
    shortage_students: 42,
    open_flags: 12
  },
  "/admin/audit": [
    { id: 1, action: "EDIT", old_status: "ABSENT", new_status: "PRESENT", reason: "Technical QR glitch verified", actor_id: 2, at: "2026-10-01T15:30:00Z" },
    { id: 2, action: "POST_SUBMIT_EDIT", old_status: "PRESENT", new_status: "EXCUSED", reason: "Medical certificate submitted", actor_id: 3, at: "2026-10-01T14:10:00Z" }
  ],
  "/analytics/students/1/overview": {
    student_id: 1,
    attendance: [
      { student_id: 1, offering_id: 101, sessions_held: 12, present: 10, absent: 2, excused: 0, percentage: 83.3, shortage: 0 },
      { student_id: 1, offering_id: 102, sessions_held: 10, present: 8, absent: 2, excused: 0, percentage: 80.0, shortage: 0 },
      { student_id: 1, offering_id: 103, sessions_held: 8, present: 5, absent: 3, excused: 0, percentage: 62.5, shortage: 12.5 }
    ],
    marks_available: 300,
    marks: 245
  },
  "/attendance/students/me/history": [
    { record_id: 1, offering_id: 101, course_code: "CS301", course_name: "Data Structures", session_id: 1, lecture_date: "2026-10-01", scheduled_start: "2026-10-01T10:30:00", status: "PRESENT", source: "QR" },
    { record_id: 2, offering_id: 102, course_code: "CS302", course_name: "Database Systems", session_id: 2, lecture_date: "2026-10-01", scheduled_start: "2026-10-01T14:00:00", status: "PRESENT", source: "QR" },
    { record_id: 3, offering_id: 101, course_code: "CS301", course_name: "Data Structures", session_id: 3, lecture_date: "2026-09-30", scheduled_start: "2026-09-30T10:30:00", status: "ABSENT", source: "MANUAL" },
    { record_id: 4, offering_id: 103, course_code: "CS303", course_name: "Software Engineering", session_id: 4, lecture_date: "2026-09-30", scheduled_start: "2026-09-30T09:00:00", status: "PRESENT", source: "QR" },
    { record_id: 5, offering_id: 102, course_code: "CS302", course_name: "Database Systems", session_id: 5, lecture_date: "2026-09-29", scheduled_start: "2026-09-29T14:00:00", status: "PRESENT", source: "QR" }
  ],
  "/notifications": [
    { id: 1, user_id: 1, type: "ATTENDANCE", title: "Attendance Warning", body: "Your attendance for Software Engineering is below 75%. Please ensure regular attendance.", read_at: null },
    { id: 2, user_id: 1, type: "GENERAL", title: "Mid-term Schedule", body: "Mid-term examinations will begin from October 15th. Check your schedule.", read_at: "2026-10-01T10:00:00Z" },
    { id: 3, user_id: 1, type: "ACADEMIC", title: "Assignment Due", body: "Data Structures assignment is due on October 5th.", read_at: null }
  ],
  "/analytics/students/1/trend": [
    { week_start: "2026-09-20", percentage: 85.0, present: 12, absent: 2 },
    { week_start: "2026-09-27", percentage: 78.5, present: 11, absent: 3 },
    { week_start: "2026-10-04", percentage: 82.0, present: 14, absent: 3 }
  ],
  "/attendance/disputes": [
    { id: 1, record_id: 45, student_id: 101, student_name: "John Doe", course_code: "CS301", lecture_date: "2026-10-01", status: "OPEN", message: "I was present but marked absent", response: null },
    { id: 2, record_id: 46, student_id: 102, student_name: "Jane Smith", course_code: "CS302", lecture_date: "2026-09-30", status: "OPEN", message: "Network issue during QR scan", response: null },
    { id: 3, record_id: 47, student_id: 103, student_name: "Bob Johnson", course_code: "CS303", lecture_date: "2026-09-29", status: "ACCEPTED", message: "Medical emergency", response: "Accepted with medical proof" }
  ],
  "/analytics/risk/queue": [
    { id: 1, session_id: 2, student_id: 201, kind: "LOCATION", score: 0.85, level: "HIGH", status: "OPEN", reasons: { location_mismatch: true } },
    { id: 2, session_id: 2, student_id: 202, kind: "TIMING", score: 0.72, level: "MEDIUM", status: "OPEN", reasons: { late_submission: true } },
    { id: 3, session_id: 1, student_id: 203, kind: "DEVICE", score: 0.65, level: "MEDIUM", status: "OPEN", reasons: { device_change: true } }
  ],
  "/analytics/offerings/101/summary": {
    offering_id: 101,
    sessions_held: 12,
    enrolled_students: 45,
    total_records: 540,
    present_records: 450,
    absent_records: 90,
    attendance_percentage: 83.3
  },
  "/analytics/offerings/102/summary": {
    offering_id: 102,
    sessions_held: 10,
    enrolled_students: 40,
    total_records: 400,
    present_records: 320,
    absent_records: 80,
    attendance_percentage: 80.0
  },
  "/analytics/offerings/103/summary": {
    offering_id: 103,
    sessions_held: 8,
    enrolled_students: 35,
    total_records: 280,
    present_records: 175,
    absent_records: 105,
    attendance_percentage: 62.5
  },
  "/analytics/offerings/101/trend": [
    { week_start: "2026-09-20", sessions: 4, present: 35, absent: 10, percentage: 77.8 },
    { week_start: "2026-09-27", sessions: 4, present: 38, absent: 7, percentage: 84.4 },
    { week_start: "2026-10-04", sessions: 4, present: 37, absent: 8, percentage: 82.2 }
  ],
  "/analytics/offerings/102/trend": [
    { week_start: "2026-09-20", sessions: 3, present: 32, absent: 8, percentage: 80.0 },
    { week_start: "2026-09-27", sessions: 4, present: 34, absent: 6, percentage: 85.0 },
    { week_start: "2026-10-04", sessions: 3, present: 28, absent: 12, percentage: 70.0 }
  ],
  "/analytics/offerings/103/trend": [
    { week_start: "2026-09-20", sessions: 3, present: 20, absent: 15, percentage: 57.1 },
    { week_start: "2026-09-27", sessions: 3, present: 22, absent: 13, percentage: 62.9 },
    { week_start: "2026-10-04", sessions: 2, present: 15, absent: 20, percentage: 42.9 }
  ],
  "/analytics/early-warnings": [
    { student_id: 201, offering_id: 103, percentage: 42.9, shortage: 32.1 },
    { student_id: 202, offering_id: 103, percentage: 55.0, shortage: 20.0 },
    { student_id: 203, offering_id: 102, percentage: 68.0, shortage: 7.0 }
  ],
  "/analytics/risk/statistics": {
    total: 15,
    open: 3,
    resolved: 10,
    false_flags: 2,
    false_flag_rate: 13.3
  }
};
