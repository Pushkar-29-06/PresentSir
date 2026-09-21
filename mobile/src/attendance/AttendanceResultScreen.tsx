import { Button, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { IconCircleCheck, IconCircleX } from "@tabler/icons-react-native";

export function AttendanceResultScreen({
  success,
  message,
  sessionLabel,
  timeLabel,
  onRetry,
}: {
  success: boolean;
  message: string;
  sessionLabel?: string;
  timeLabel?: string;
  onRetry: () => void;
}) {
  return <SafeAreaView style={styles.safe}><View style={styles.content}>
    {success ? <IconCircleCheck size={64} color="#16a34a" /> : <IconCircleX size={64} color="#b91c1c" />}
    <Text style={styles.title}>{success ? "Attendance recorded" : "Attendance not recorded"}</Text>
    {success && <><Text style={styles.course}>{sessionLabel ?? "Attendance session"}</Text><Text style={styles.time}>{timeLabel ?? ""}</Text></>}
    <Text style={styles.message}>{message}</Text>
    {!success && <Button title="Scan again" onPress={onRetry} />}
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f9fc" },
  content: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center", gap: 14 },
  title: { fontSize: 28, fontWeight: "700", color: "#172033", textAlign: "center" },
  course: { fontSize: 20, fontWeight: "600", color: "#172033" },
  time: { color: "#64748b" },
  message: { color: "#64748b", textAlign: "center", lineHeight: 22 },
});
