import { useState } from "react";
import { Button, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { IconBell, IconBook, IconChartBar, IconMenu2, IconSettings, IconUsers, IconX } from "@tabler/icons-react-native";
import { useAuth } from "../auth/AuthProvider";
import { useTheme } from "../theme/ThemeProvider";
import { useNavigation } from "@react-navigation/native";

export function RoleHomeScreen({ role }: { role: string }) {
  const { signOut } = useAuth();
  const navigation = useNavigation();
  const { mode, setMode } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dark = mode === "dark";
  const colors = dark ? { background: "#101827", surface: "#182235", text: "#edf2f7", muted: "#94a3b8", accent: "#60a5fa" } : { background: "#f7f9fc", surface: "#fff", text: "#172033", muted: "#64748b", accent: "#2563eb" };
  const tiles = role === "STUDENT" ? [["Attendance", IconChartBar], ["Assessments", IconBook], ["Notifications", IconBell]] : [["Sessions", IconChartBar], ["Roster", IconUsers], ["Analytics", IconBook]];
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}><View style={styles.header}><Pressable onPress={() => setDrawerOpen(true)}><IconMenu2 color={colors.text} /></Pressable><Text style={[styles.brand, { color: colors.text }]}>PresentSir</Text><IconBell color={colors.text} /></View>
    {drawerOpen && <View style={[styles.drawer, { backgroundColor: colors.surface }]}><View style={styles.drawerHeader}><Text style={[styles.drawerTitle, { color: colors.text }]}>{role}</Text><Pressable onPress={() => setDrawerOpen(false)}><IconX color={colors.text} /></Pressable></View><Text style={[styles.drawerItem, { color: colors.text }]}>Home</Text><Text style={[styles.drawerItem, { color: colors.text }]}>Settings</Text><Button title="Sign out" onPress={() => void signOut()} /></View>}
    <View style={styles.content}><Text style={[styles.title, { color: colors.text }]}>{role} home</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Your workspace at a glance</Text><View style={styles.grid}>{tiles.map(([label, Icon]) => <Pressable key={label as string} style={[styles.tile, { backgroundColor: colors.surface }]} onPress={() => {
      if (role === "STUDENT" && label === "Attendance") navigation.navigate("StudentAttendance" as never);
      if (role === "STUDENT" && label === "Assessments") navigation.navigate("StudentAnalytics" as never);
    }}><Icon color={colors.accent} /><Text style={[styles.tileText, { color: colors.text }]}>{label as string}</Text><Text style={{ color: colors.muted }}>Coming soon</Text></Pressable>)}</View>{role === "STUDENT" && <View style={styles.scanAction}><Button title="Scan attendance QR" onPress={() => navigation.navigate("ScanAttendance" as never)} /></View>}<View style={styles.themeRow}><IconSettings color={colors.muted} /><Text style={{ color: colors.text }}>Theme</Text>{(["system", "light", "dark"] as const).map((value) => <Pressable key={value} onPress={() => setMode(value)}><Text style={{ color: mode === value ? colors.accent : colors.muted }}>{value}</Text></Pressable>)}</View></View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, header: { height: 64, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, brand: { fontSize: 20, fontWeight: "700" }, content: { padding: 20 }, title: { fontSize: 28, fontWeight: "700" }, subtitle: { marginTop: 6, marginBottom: 20 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, tile: { width: "30%", minWidth: 100, minHeight: 120, borderRadius: 14, padding: 14, gap: 10 }, tileText: { fontSize: 16, fontWeight: "600" }, scanAction: { marginTop: 20 }, drawer: { position: "absolute", zIndex: 2, top: 0, bottom: 0, left: 0, width: 270, padding: 20, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8 }, drawerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }, drawerTitle: { fontSize: 20, fontWeight: "700" }, drawerItem: { paddingVertical: 14, fontSize: 17 }, themeRow: { marginTop: 28, flexDirection: "row", gap: 14, alignItems: "center" } });
