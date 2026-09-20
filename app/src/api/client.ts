/**
 * API Client
 * Centralized Axios client for all API requests
 * Handles authentication, error mapping, and request/response interceptors
 */

import axios, { AxiosError, AxiosInstance } from 'axios';

// TODO: Implement with proper configuration
// This is a placeholder - will be implemented with full auth flow

export const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api/v1', // TODO: Use react-native-config or similar for env vars
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// TODO: Add request interceptor for auth headers
// TODO: Add response interceptor for token refresh
// TODO: Add error interceptor for centralized error mapping
