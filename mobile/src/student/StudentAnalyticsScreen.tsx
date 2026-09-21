import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthProvider";

type Summary = { offering_id: number; percentage: number; shortage: number };
type Trend = { week_start: string; percentage: number; present: number; absent: number };
type Overview = { attendance: Summary[] };
export function StudentAnalyticsScreen() {
  const { api, user } = useAuth(); const [summary, setSummary] = useState<Summary[]>([]); const [trend, setTrend] = useState<Trend[]>([]);
  useEffect(() => { if (!user) return; void Promise.all([api.request<Overview>(`/analytics/students/${user.id}/overview`), api.request<Trend[]>(`/analytics/students/${user.id}/trend`)]).then(([overview, nextTrend]) => { setSummary(overview.attendance); setTrend(nextTrend); }); }, [user]);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Analytics</Text><Text style={styles.subtitle}>75% threshold</Text>{summary.map((item) => <View style={styles.card} key={item.offering_id}><Text>Offering {item.offering_id}</Text><View style={styles.track}><View style={[styles.bar, { width: `${Math.min(100, item.percentage)}%` }]} /></View><Text>{item.percentage.toFixed(1)}% · {item.shortage > 0 ? `${item.shortage.toFixed(1)} points short` : "Reachable"}</Text></View>)}<Text style={styles.section}>Weekly trend</Text>{trend.map((item) => <View style={styles.row} key={item.week_start}><Text>{item.week_start}</Text><Text>{item.percentage.toFixed(1)}% · {item.present} present · {item.absent} absent</Text></View>)}</ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#f7f9fc" }, content: { padding: 20, gap: 14 }, title: { fontSize: 30, fontWeight: "700" }, subtitle: { color: "#475569" }, card: { padding: 18, borderRadius: 14, backgroundColor: "#fff", gap: 10 }, track: { height: 12, backgroundColor: "#e2e8f0", borderRadius: 8 }, bar: { height: 12, backgroundColor: "#2563eb", borderRadius: 8 }, section: { fontSize: 22, fontWeight: "700", marginTop: 10 }, row: { padding: 16, borderRadius: 12, backgroundColor: "#fff" } });
