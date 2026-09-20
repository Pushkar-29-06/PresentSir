/**
 * Authentication types
 * Domain-specific authentication types
 */

export type AuthMode = 'FULL' | 'READ_ONLY' | 'WEB';

export interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: number;
    role: 'STUDENT' | 'FACULTY' | 'ADMIN';
    name: string;
    login_id: string;
  } | null;
  deviceMode: AuthMode;
}
