import { useEffect, useState } from "react";
import { ActivityIndicator, Button, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { IconCheck, IconFingerprint, IconShieldLock } from "@tabler/icons-react-native";

import { useAuth } from "../auth/AuthProvider";
import {
  DeviceRegistrationError,
  registerAndroidDevice,
  type DeviceRegistrationResult,
} from "./registration";
import { getStoredDeviceStatus, storeDeviceStatus } from "./status";

export function DeviceRegistrationScreen() {
  const { api } = useAuth();
  const [result, setResult] = useState<DeviceRegistrationResult | null>(null);
  const [error, setError] = useState<DeviceRegistrationError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getStoredDeviceStatus().then(setResult);
  }, []);

  async function register() {
    setBusy(true);
    setError(null);
    try {
      const registered = await registerAndroidDevice(api);
      await storeDeviceStatus(registered);
      setResult(registered);
    } catch (registrationError) {
      setError(
        registrationError instanceof DeviceRegistrationError
          ? registrationError
          : new DeviceRegistrationError("UNKNOWN", "Device registration failed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <IconShieldLock size={42} color="#2563eb" />
        <Text style={styles.title}>Register this device</Text>
        <Text style={styles.subtitle}>
          PresentSir uses a device-bound key to protect attendance submissions.
          An administrator must open a registration window first.
        </Text>
        <View style={styles.statusCard}>
          {result ? <IconCheck size={24} color="#16a34a" /> : <IconFingerprint size={24} color="#2563eb" />}
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>{result ? "Device active" : "Device not registered"}</Text>
            <Text style={styles.statusBody}>
              {result ? `Binding #${result.deviceId} • ${result.status}` : "No attendance scan can be submitted until this device is active."}
            </Text>
          </View>
        </View>
        {error && <Text style={styles.error} accessibilityRole="alert">{error.message}</Text>}
        <Button
          title={busy ? "Registering..." : result ? "Register replacement device" : "Register device"}
          onPress={() => void register()}
          disabled={busy}
        />
        {busy && <ActivityIndicator style={styles.loader} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f9fc" },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#172033" },
  subtitle: { fontSize: 16, lineHeight: 24, color: "#64748b" },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 14, backgroundColor: "#fff" },
  statusText: { flex: 1, gap: 4 },
  statusTitle: { fontSize: 17, fontWeight: "600", color: "#172033" },
  statusBody: { color: "#64748b" },
  error: { color: "#b91c1c", lineHeight: 20 },
  loader: { marginTop: 8 },
});
