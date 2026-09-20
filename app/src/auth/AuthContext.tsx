/**
 * Authentication Context
 * Manages authentication state across the app
 * Security-critical: requires human review
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  setAuth: (user: AuthState['user'], deviceMode: AuthState['deviceMode']) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    deviceMode: 'READ_ONLY',
  });

  const setAuth = (user: AuthState['user'], deviceMode: AuthState['deviceMode']) => {
    setAuthState({
      isAuthenticated: !!user,
      user,
      deviceMode,
    });
  };

  const clearAuth = () => {
    setAuthState({
      isAuthenticated: false,
      user: null,
      deviceMode: 'READ_ONLY',
    });
  };

  return (
    <AuthContext.Provider value={{ ...authState, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
