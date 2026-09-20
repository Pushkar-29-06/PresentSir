/**
 * Device types
 * Domain-specific device types
 */

export type DeviceStatus =
  | 'ACTIVE'
  | 'PENDING'
  | 'INVALIDATED'
  | 'REVOKED'
  | 'NOT_REGISTERED';

export type DeviceMode = 'FULL' | 'READ_ONLY' | 'WEB';

export type ChangeRequestType =
  | 'NEW_PHONE'
  | 'BIOMETRIC_RESET'
  | 'REINSTALL_REVIEW';

export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DeviceBinding {
  id: number;
  user_id: number;
  android_id: string;
  public_key: string;
  key_algorithm: string;
  key_fingerprint: string;
  device_model: string;
  app_version: string;
  status: DeviceStatus;
  attestation_verified: boolean;
  reinstall_count: number;
  registered_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
}

export interface ChangeRequest {
  id: number;
  user_id: number;
  type: ChangeRequestType;
  reason: string;
  new_android_id: string | null;
  status: ChangeRequestStatus;
  decided_by: number | null;
  decided_at: string | null;
  note: string | null;
}
