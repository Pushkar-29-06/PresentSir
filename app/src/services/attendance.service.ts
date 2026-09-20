/**
 * Attendance Service
 * Handles QR scanning, attendance submission, and attendance history
 * Security-critical: requires human review
 */

import type { AttendanceSubmissionRequest, AttendanceSubmissionResponse } from '../types/attendance';

// TODO: Implement with API client
// import { apiClient } from '../api/client';

export class AttendanceService {
  /**
   * Submit attendance with QR scan and biometric signature
   * Critical path: must be fast (<3s excluding biometric prompt)
   */
  static async submitAttendance(
    data: AttendanceSubmissionRequest,
  ): Promise<AttendanceSubmissionResponse> {
    // TODO: Implement with API client
    throw new Error('Not implemented');
  }

  /**
   * Get attendance summary
   */
  static async getAttendanceSummary() {
    // TODO: Implement with API client
    throw new Error('Not implemented');
  }

  /**
   * Get course attendance records
   */
  static async getCourseRecords(offeringId: number, from?: string, to?: string) {
    // TODO: Implement with API client
    throw new Error('Not implemented');
  }

  /**
   * Create attendance dispute
   */
  static async createDispute(recordId: number, message: string) {
    // TODO: Implement with API client
    throw new Error('Not implemented');
  }

  /**
   * Get attendance trend
   */
  static async getAttendanceTrend(offeringId?: number, granularity?: string) {
    // TODO: Implement with API client
    throw new Error('Not implemented');
  }
}
