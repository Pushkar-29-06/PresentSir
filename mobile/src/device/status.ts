import AsyncStorage from "@react-native-async-storage/async-storage";

import type { DeviceRegistrationResult } from "./registration";

const DEVICE_STATUS_KEY = "presentsir.device_status";

export async function getStoredDeviceStatus(): Promise<DeviceRegistrationResult | null> {
  const value = await AsyncStorage.getItem(DEVICE_STATUS_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as DeviceRegistrationResult;
  } catch {
    await AsyncStorage.removeItem(DEVICE_STATUS_KEY);
    return null;
  }
}

export async function storeDeviceStatus(status: DeviceRegistrationResult): Promise<void> {
  await AsyncStorage.setItem(DEVICE_STATUS_KEY, JSON.stringify(status));
}
