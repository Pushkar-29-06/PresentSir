/**
 * Notification Service
 * Handles notification operations
 */

import type { Notification } from '../types/notification';

// TODO: Implement with API client
// import { apiClient } from '../api/client';

export class NotificationService {
  /**
   * Get notifications list
   */
  static async getNotifications(): Promise<Notification[]> {
    // TODO: Implement with API client
    throw new Error('Not implemented');
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(id: number): Promise<void> {
    // TODO: Implement with API client
    throw new Error('Not implemented');
  }
}
