/**
 * Student types
 * Domain-specific student types
 */

export interface Student {
  user_id: number;
  roll_no: string;
  prn: string;
  semester: number;
  division: string;
  batch: string;
}

export interface StudentDashboard {
  today_schedule: ScheduleItem[];
  overall_percentage: number;
  alerts: string[];
}

export interface ScheduleItem {
  offering_id: number;
  course_code: string;
  course_name: string;
  room: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
}
