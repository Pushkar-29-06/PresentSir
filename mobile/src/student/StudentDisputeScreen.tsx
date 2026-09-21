import { useState } from "react";
import { Button, SafeAreaView, StyleSheet, Text, TextInput } from "react-native";
import { useAuth } from "../auth/AuthProvider";

export function StudentDisputeScreen({ route, navigation }: { route: { params?: { recordId?: number } }; navigation: { goBack: () => void } }) {
  const { api } = useAuth(); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function submit() {
    if (!route.params?.recordId || message.trim().length < 1) { setError("Enter a dispute message."); return; }
    try { await api.request(`/attendance/records/${route.params.recordId}/disputes`, { method: "POST", body: JSON.stringify({ message: message.trim() }) }); navigation.goBack(); } catch { setError("Unable to submit the dispute."); }
  }
  return <SafeAreaView style={styles.safe}><Text style={styles.title}>Raise dispute</Text><TextInput style={styles.input} multiline value={message} onChangeText={setMessage} placeholder="Explain the attendance issue" /><Text style={styles.error}>{error}</Text><Button title="Submit dispute" onPress={() => void submit()} /><Button title="Cancel" onPress={navigation.goBack} /></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, padding: 24, gap: 16, backgroundColor: "#f7f9fc" }, title: { fontSize: 28, fontWeight: "700" }, input: { minHeight: 120, padding: 12, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, textAlignVertical: "top" }, error: { color: "#b91c1c" } });
