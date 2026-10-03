import {
  IconBell,
  IconChevronRight,
  IconHome,
  IconLogout,
  IconUsers,
  IconDeviceMobile,
  IconShieldCheck,
  IconBuildingBank,
  IconHistory,
  IconFileText,
  IconLayoutDashboard,
  IconUserCheck,
  IconCalendar,
  IconChartBar,
  IconClock
} from "@tabler/icons-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth, isUiDevMode } from "../auth/AuthProvider";

const logoLight = "/logo-light.svg";

export function AppShell({ role }: { role: string }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const devMode = isUiDevMode();
  const isAdmin = role === "Admin";
  const isStudent = role === "Student";
  const isFaculty = role === "Faculty";

  const adminNavItems = [
    { label: "Dashboard", path: "/admin", icon: IconLayoutDashboard },
    { label: "Users", path: "/admin/users", icon: IconUsers },
    { label: "Registration Requests", path: "/admin/requests", icon: IconDeviceMobile },
    { label: "Policy", path: "/admin/policy", icon: IconShieldCheck },
    { label: "Institution Analytics", path: "/admin/institution", icon: IconBuildingBank },
    { label: "Audit", path: "/admin/audit", icon: IconHistory },
    { label: "Reports", path: "/admin/reports", icon: IconFileText },
  ];

  const studentNavItems = [
    { label: "Dashboard", path: "/student", icon: IconLayoutDashboard },
    { label: "Attendance", path: "/student/attendance", icon: IconCalendar },
    { label: "Analytics", path: "/student/analytics", icon: IconChartBar },
  ];

  const facultyNavItems = [
    { label: "Dashboard", path: "/faculty", icon: IconLayoutDashboard },
    { label: "Sessions", path: "/faculty/sessions", icon: IconCalendar },
    { label: "Analytics", path: "/faculty/analytics", icon: IconChartBar },
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img src={logoLight} alt="PresentSir" className="header-logo" />
          {devMode && <span className="dev-badge">DEV MODE</span>}
        </div>
        <div className="header-right">
          <div className="user-profile-badge">
            <span className="user-name">{user?.name ?? (isAdmin ? "Dev Admin" : isStudent ? "Dev Student" : isFaculty ? "Dev Faculty" : "User")}</span>
            <span className="role-badge">{role.toUpperCase()}</span>
          </div>
          <div className="header-actions">
            <button className="icon-btn" aria-label="Notifications">
              <IconBell size={19} />
            </button>
          </div>
        </div>
      </header>

      <div className="shell-body">
        <aside className="app-sidebar">
          <div className="sidebar-top">
            <div className="sidebar-group-title">
              {isAdmin ? "ADMINISTRATION" : isStudent ? "STUDENT PORTAL" : isFaculty ? "FACULTY PORTAL" : "PORTAL"}
            </div>
            <nav className="sidebar-nav">
              {isAdmin ? (
                adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path));
                  return (
                    <Link key={item.path} to={item.path} className={isActive ? "active" : ""}>
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })
              ) : isStudent ? (
                studentNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} className={isActive ? "active" : ""}>
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })
              ) : isFaculty ? (
                facultyNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== "/faculty" && location.pathname.startsWith(item.path));
                  return (
                    <Link key={item.path} to={item.path} className={isActive ? "active" : ""}>
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })
              ) : (
                <Link to={`/${role.toLowerCase()}`} className={location.pathname === `/${role.toLowerCase()}` ? "active" : ""}>
                  <IconHome size={18} /> Overview
                </Link>
              )}
            </nav>
          </div>

          <div className="sidebar-bottom">
            <Link to="/me" className="sidebar-profile-card">
              <div className="profile-avatar">
                <IconUserCheck size={20} />
              </div>
              <div className="profile-info">
                <span className="profile-name">{user?.name ?? (isAdmin ? "Dev Admin" : isStudent ? "Dev Student" : isFaculty ? "Dev Faculty" : "User")}</span>
                <span className="profile-role">{isAdmin ? "Administrator" : isStudent ? "Student" : isFaculty ? "Faculty" : role}</span>
              </div>
            </Link>

            <button className="sidebar-logout-btn" onClick={() => void signOut()}>
              <IconLogout size={18} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <section className="app-content">
          <div className="breadcrumbs">
            <IconHome size={14} /> <IconChevronRight size={12} /> <span style={{ textTransform: "capitalize" }}>{location.pathname.replace("/", "").replace("/", " / ") || "Dashboard"}</span>
          </div>
          <div className="content-panel">
            <Outlet />
          </div>
        </section>
      </div>
      <footer className="app-footer">PresentSir</footer>
    </div>
  );
}
