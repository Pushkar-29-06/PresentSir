import { useAuth } from "../auth/AuthProvider";
import { IconChartBar, IconClipboardCheck, IconDeviceMobile, IconUsers } from "@tabler/icons-react";
import { Link } from "react-router-dom";

export function RoleHome({ role }: { role: string }) {
  const { signOut } = useAuth();
  const tiles = role === "Student" ? ["Attendance", "Assessments", "Notifications"] : role === "Faculty" ? ["Sessions", "Roster", "Analytics"] : ["Users", "Policies", "Reports"];
  return <div className="tile-grid">{tiles.map((tile, index) => <article className="shell-tile" key={tile}><span className="tile-icon">{[<IconChartBar />, <IconClipboardCheck />, <IconUsers />, <IconDeviceMobile />][index % 4]}</span><strong>{tile}</strong>{role === "Faculty" && tile === "Sessions" ? <Link to="/faculty/sessions">Open workspace</Link> : role === "Faculty" && tile === "Analytics" ? <Link to="/faculty/analytics">Open analytics</Link> : role === "Student" && tile === "Attendance" ? <Link to="/student/attendance">View attendance</Link> : role === "Student" && tile === "Assessments" ? <Link to="/student/analytics">View analytics</Link> : <small>Coming soon</small>}</article>)}<button onClick={() => void signOut()}>Sign out</button></div>;
}
