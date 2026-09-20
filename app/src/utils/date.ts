/**
 * Date utilities
 * Using dayjs for date operations
 */

import dayjs from 'dayjs';

/**
 * Format date to DD-MM-YYYY
 */
export function formatDate(date: string | Date): string {
  return dayjs(date).format('DD-MM-YYYY');
}

/**
 * Format time to hh:mm A
 */
export function formatTime(date: string | Date): string {
  return dayjs(date).format('hh:mm A');
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | Date): string {
  return dayjs(date).format('DD-MM-YYYY hh:mm A');
}
