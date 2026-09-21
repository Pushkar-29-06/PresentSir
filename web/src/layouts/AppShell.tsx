import { IconBell, IconChevronRight, IconHome, IconLayoutDashboard, IconLogout, IconSettings } from "@tabler/icons-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useTheme, type ThemeMode } from "../theme/ThemeProvider";

export function AppShell({ role }: { role: string }) {
  const { signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const location = useLocation();
  const title = `${role} workspace`;
  return <div className="app-shell">
    <header className="app-header">
      <div className="brand"><IconLayoutDashboard size={24} /> PresentSir</div>
      <nav className="top-menu" aria-label="Top menu"><Link to={`/${role.toLowerCase()}`}>Dashboard</Link><Link to="/notifications">Notifications</Link></nav>
      <div className="header-actions"><IconBell size={19} /><select className="theme-select" value={mode} onChange={(event) => setMode(event.target.value as ThemeMode)} aria-label="Theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select><button onClick={() => void signOut()} aria-label="Sign out"><IconLogout size={18} /></button></div>
    </header>
    <div className="shell-body">
      <aside className="app-sidebar"><strong>{role}</strong><nav className="sidebar-nav"><Link to={`/${role.toLowerCase()}`}><IconHome size={18} /> Overview</Link><Link to="/settings"><IconSettings size={18} /> Settings</Link></nav></aside>
      <section className="app-content">
        <div className="breadcrumbs"><IconHome size={14} /> <IconChevronRight size={14} /> {location.pathname.replace("/", "") || "home"}</div>
        <div className="page-heading"><h1>{title}</h1></div>
        <div className="content-panel"><Outlet /></div>
      </section>
    </div>
    <footer className="app-footer">PresentSir • Attendance platform</footer>
  </div>;
}
