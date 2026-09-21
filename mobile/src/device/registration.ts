import ReactNativeBiometrics from "react-native-biometrics";
import DeviceInfo from "react-native-device-info";

import { ApiError, type createApiClient } from "../api/client";

type Api = ReturnType<typeof createApiClient>;

export type DeviceRegistrationResult = {
  deviceId: number;
  status: string;
  androidId: string;
};

export type DeviceRegistrationErrorCode =
  | "REGISTRATION_WINDOW_UNAVAILABLE"
  | "DEVICE_OWNED_BY_OTHER"
  | "DEVICE_ALREADY_BOUND"
  | "INVALID_SIGNATURE"
  | "REGISTRATION_EXPIRED"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export class DeviceRegistrationError extends Error {
  constructor(
    readonly code: DeviceRegistrationErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function mapRegistrationError(error: unknown): DeviceRegistrationError {
  const apiDetail = error instanceof ApiError && typeof error.body === "object" && error.body !== null
    ? (error.body as { detail?: unknown }).detail
    : undefined;
  const message = typeof apiDetail === "string"
    ? apiDetail
    : error instanceof Error
      ? error.message
      : "Device registration failed";
  if (message.includes("DEVICE_OWNED_BY_OTHER")) {
    return new DeviceRegistrationError(
      "DEVICE_OWNED_BY_OTHER",
      "This Android device is already registered to another account.",
    );
  }
  if (message.includes("Registration window") || message.includes("challenge")) {
    return new DeviceRegistrationError(
      "REGISTRATION_WINDOW_UNAVAILABLE",
      "Ask an administrator to open a device registration window, then try again.",
    );
  }
  if (message.includes("active device")) {
    return new DeviceRegistrationError(
      "DEVICE_ALREADY_BOUND",
      "This account already has an active device.",
    );
  }
  if (message.includes("signature")) {
    return new DeviceRegistrationError(
      "INVALID_SIGNATURE",
      "The device proof could not be verified. Try registration again.",
    );
  }
  if (message.includes("Network request failed")) {
    return new DeviceRegistrationError(
      "NETWORK_ERROR",
      "Could not reach PresentSir. Check your connection and try again.",
    );
  }
  return new DeviceRegistrationError("UNKNOWN", message);
}

export async function registerAndroidDevice(api: Api): Promise<DeviceRegistrationResult> {
  try {
    const androidId = await DeviceInfo.getAndroidId();
    const biometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: true,
    });
    const { publicKey } = await biometrics.createKeys();
    const challenge = await api.request<{ challenge: string }>("/device/register/challenge", {
      method: "POST",
      body: JSON.stringify({ android_id: androidId }),
    });
    const signed = await biometrics.createSignature({
      promptMessage: "Confirm this device for PresentSir",
      payload: `${androidId}:${challenge.challenge}`,
    });
    const registered = await api.request<{ device_id: number; status: string }>("/device/register", {
      method: "POST",
      body: JSON.stringify({
        android_id: androidId,
        challenge: challenge.challenge,
        public_key: publicKey,
        signature: signed.signature,
        key_algorithm: "RSA",
        device_model: await DeviceInfo.getModel(),
        app_version: DeviceInfo.getVersion(),
      }),
    });
    return {
      deviceId: registered.device_id,
      status: registered.status,
      androidId,
    };
  } catch (error) {
    throw mapRegistrationError(error);
  }
}
