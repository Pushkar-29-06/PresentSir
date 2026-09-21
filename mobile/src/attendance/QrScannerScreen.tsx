import { useEffect, useRef, useState } from "react";
import { Button, Pressable, SafeAreaView, StyleSheet, Text, Vibration, View } from "react-native";
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from "react-native-vision-camera";
import ReactNativeBiometrics from "react-native-biometrics";
import DeviceInfo from "react-native-device-info";
import { v4 as uuid } from "uuid";
import { IconBolt, IconBoltOff, IconX } from "@tabler/icons-react-native";

import { useAuth } from "../auth/AuthProvider";
import { ApiError } from "../api/client";
import { getStoredDeviceStatus } from "../device/status";
import { attendanceErrorMessage, isAttendanceNetworkError } from "./messages";
import { decodeAttendanceQr, submissionProof } from "./qr";
import { AttendanceResultScreen } from "./AttendanceResultScreen";

type ScanState = "scanning" | "signing" | "submitting" | "result";

export function QrScannerScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { api } = useAuth();
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [torch, setTorch] = useState(false);
  const [state, setState] = useState<ScanState>("scanning");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [retryable, setRetryable] = useState(false);
  const processingRef = useRef(false);
  const [nonce, setNonce] = useState<string | null>(null);
  const [retryPayload, setRetryPayload] = useState<{
    sessionId: number;
    qrToken: string;
    androidId: string;
    signature: string;
  } | null>(null);

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  const submit = async (
    sessionId: number,
    qrToken: string,
    androidId: string,
    clientNonce: string,
    signature: string,
  ) => {
    setState("submitting");
    setRetryPayload({ sessionId, qrToken, androidId, signature });
    try {
      await api.request("/attendance/submissions", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          android_id: androidId,
          qr_token: qrToken,
          client_nonce: clientNonce,
          signature,
          app_version: DeviceInfo.getVersion(),
        }),
      });
      setSuccess(true);
      setMessage("Your attendance was submitted successfully.");
      setState("result");
    } catch (error) {
      setSuccess(false);
      setRetryable(isAttendanceNetworkError(error));
      setMessage(attendanceErrorMessage(error));
      setState("result");
    }
  };

  const handleDecoded = async (value: string) => {
    if (state !== "scanning" || processingRef.current) return;
    const decoded = decodeAttendanceQr(value);
    if (!decoded) return;
    processingRef.current = true;
    Vibration.vibrate(40);
    setState("signing");
    const deviceStatus = await getStoredDeviceStatus();
    if (!deviceStatus) {
      setMessage("Register this device before scanning attendance.");
      setSuccess(false);
      setState("result");
      return;
    }
    const clientNonce = uuid();
    setNonce(clientNonce);
    try {
      const biometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });
      const signed = await biometrics.createSignature({
        promptMessage: "Confirm attendance",
        payload: submissionProof(decoded.sessionId, decoded.qrToken, deviceStatus.androidId, clientNonce),
      });
      if (!signed.success || !signed.signature) {
        throw new Error("Biometric verification was cancelled.");
      }
      await submit(decoded.sessionId, decoded.qrToken, deviceStatus.androidId, clientNonce, signed.signature);
    } catch (error) {
      setSuccess(false);
      setMessage(attendanceErrorMessage(error));
      setState("result");
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: (codes) => {
      const value = codes[0]?.value;
      if (value) void handleDecoded(value);
    },
  });

  const retry = async () => {
    if (!retryPayload || !nonce) return;
    await submit(
      retryPayload.sessionId,
      retryPayload.qrToken,
      retryPayload.androidId,
      nonce,
      retryPayload.signature,
    );
  };

  if (state === "result") {
    return <AttendanceResultScreen success={success} message={message} onRetry={() => {
      if (retryable && retryPayload && nonce) {
        void retry();
      } else {
        setMessage("");
        processingRef.current = false;
        setState("scanning");
      }
    }} />;
  }
  if (!hasPermission) {
    return <SafeAreaView style={styles.permission}><Text style={styles.permissionTitle}>Camera permission required</Text><Text style={styles.permissionBody}>Allow camera access to scan the classroom QR code.</Text><Button title="Allow camera" onPress={() => void requestPermission()} /><Button title="Cancel" onPress={navigation.goBack} /></SafeAreaView>;
  }
  if (!device) return <SafeAreaView style={styles.permission}><Text>Camera unavailable on this device.</Text><Button title="Cancel" onPress={navigation.goBack} /></SafeAreaView>;
  return <View style={styles.container}><Camera style={StyleSheet.absoluteFill} device={device} isActive={state === "scanning"} codeScanner={codeScanner} torch={torch ? "on" : "off"} /><View style={styles.overlay}><View style={styles.top}><Text style={styles.heading}>{state === "scanning" ? "Scan attendance QR" : "Confirm attendance"}</Text><Pressable onPress={navigation.goBack}><IconX color="#fff" size={26} /></Pressable></View><View style={styles.finder} /><View style={styles.bottom}><Text style={styles.hint}>{state === "scanning" ? "Align the A1 QR code inside the frame" : "Complete biometric confirmation"}</Text><Pressable onPress={() => setTorch(!torch)}>{torch ? <IconBoltOff color="#fff" /> : <IconBolt color="#fff" />}</Pressable></View></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between", padding: 24 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heading: { color: "#fff", fontSize: 20, fontWeight: "700" },
  finder: { alignSelf: "center", width: "78%", aspectRatio: 1, borderWidth: 3, borderColor: "#fff", borderRadius: 18 },
  bottom: { alignItems: "center", gap: 18 },
  hint: { color: "#fff", textAlign: "center" },
  permission: { flex: 1, padding: 28, justifyContent: "center", gap: 16 },
  permissionTitle: { fontSize: 26, fontWeight: "700" },
  permissionBody: { color: "#64748b", lineHeight: 22 },
});
