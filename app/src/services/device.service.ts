/**
 * Device Service
 * Handles device registration, status, and change requests
 * Security-critical: requires human review
 */

import type {
  DeviceBinding,
  ChangeRequest,
  ChangeRequestType,
} from '../types/device';

// TODO: Implement with API client
// import { apiClient } from '../api/client';

export class DeviceService {
  /**
   * Get registration challenge
   */
  static async getRegistrationChallenge(androidId: string) {
    // TODO: Implement with API client
    throw new Error('Not implemented');
  }

  /**
   * Register or re-register device
   */
  static async registerDevice(data: {
    android_id: string;
    public_key: string;
    key_algorithm: string;
    signature: string;
  }) {
    // TODO: Implement with API client
    throw new Error('Not implemented');
  }

  /**
   * Get device status
   */
  static async getDeviceStatus() {
    // TODO: Implement with API client
    throw new Error('Not implemented');
  }

  /**
   * Create device change request
   */
  static async createChangeRequest(data: {
    type: ChangeRequestType;
    reason: string;
  }): Promise<ChangeRequest> {
    // TODO: Implement with API client
    throw new Error('Not implemented');
  }

  /**
   * Get device change requests
   */
  static async getChangeRequests(): Promise<ChangeRequest[]> {
    // TODO: Implement with API client
    throw new Error('Not implemented');
  }
}
