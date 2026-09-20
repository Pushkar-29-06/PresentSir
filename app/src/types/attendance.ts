/**
 * Attendance types
 * Domain-specific attendance types
 */

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED';
export type AttendanceSource = 'SCAN' | 'MANUAL' | 'SYSTEM';

export interface AttendanceRecord {
  id: number;
  session_id: number;
  student_id: number;
  status: AttendanceStatus;
  source: AttendanceSource;
  reason?: string;
  updated_at: string;
}

export interface AttendanceSummary {
  threshold_percent: number;
  warn_margin_percent: number;
  courses: CourseAttendance[];
}

export interface CourseAttendance {
  offering_id: number;
  course_code: string;
  course_name: string;
  faculty: string;
  conducted: number;
  present: number;
  excused: number;
  percentage: number;
  status: 'OK' | 'WARNING' | 'SHORTAGE';
  need_more: number;
  can_miss: number;
  remaining_scheduled: number;
  reachable: boolean;
}

export interface AttendanceSubmissionRequest {
  session_id: number;
  qr_token: string;
  client_nonce: string;
  android_id: string;
  signature: string;
}

export interface AttendanceSubmissionResponse {
  status: 'RECORDED';
  already_recorded: boolean;
  course: {
    code: string;
    name: string;
  };
  recorded_at: string;
}
