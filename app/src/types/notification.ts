/**
 * Notification types
 * Domain-specific notification types
 */

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}
