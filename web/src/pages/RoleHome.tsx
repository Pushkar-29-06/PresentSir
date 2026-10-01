import { useAuth } from "../auth/AuthProvider";
import { IconChartBar, IconClipboardCheck, IconDeviceMobile, IconUsers } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { showcaseModules } from "./StaticShowcasePage";

export function RoleHome({ role }: { role: string }) {
  const { signOut } = useAuth();
  const tiles = role === "Student" ? ["Attendance", "Assessments", "Notifications"] : role === "Faculty" ? ["Sessions", "Roster", "Analytics"] : ["Users", "Policies", "Reports"];
  const base = role.toLowerCase();
  return <div className="tile-grid">{tiles.map((tile, index) => <article className="shell-tile" key={tile}><span className="tile-icon">{[<IconChartBar />, <IconClipboardCheck />, <IconUsers />, <IconDeviceMobile />][index % 4]}</span><strong>{tile}</strong>{role === "Faculty" && tile === "Sessions" ? <Link to="/faculty/sessions">Open workspace</Link> : role === "Faculty" && tile === "Analytics" ? <Link to="/faculty/analytics">Open analytics</Link> : role === "Student" && tile === "Attendance" ? <Link to="/student/attendance">View attendance</Link> : role === "Student" && tile === "Assessments" ? <Link to="/student/analytics">View analytics</Link> : role === "Admin" ? <Link to="/admin/users">Open admin workspace</Link> : <small>Coming soon</small>}</article>)}<section className="showcase-tiles" aria-labelledby="campus-information"><h2 id="campus-information">Campus information</h2><div className="tile-grid">{showcaseModules.map((module) => <Link className="shell-tile showcase-tile" key={module} to={`/${base}/${module}`}><IconDeviceMobile size={22} /><strong>{module.replace("-", " ")}</strong><small>View information</small></Link>)}</div></section><button onClick={() => void signOut()}>Sign out</button></div>;
}
