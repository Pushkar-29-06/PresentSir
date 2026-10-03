import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import {
  IconCalendar,
  IconChartBar,
  IconClock,
  IconBell,
  IconArrowRight,
  IconAlertCircle,
  IconRefresh,
  IconUser
} from "@tabler/icons-react";

type AttendanceSummary = {
  student_id: number;
  offering_id: number;
  sessions_held: number;
  present: number;
  absent: number;
  excused: number;
  percentage: number;
  shortage: number;
};

type AttendanceOverview = {
  student_id: number;
  attendance: AttendanceSummary[];
  marks_available?: number;
  marks?: number;
};

type AttendanceHistoryItem = {
  record_id: number;
  offering_id: number;
  course_code: string;
  course_name: string;
  session_id: number;
  lecture_date: string;
  scheduled_start?: string | null;
  status?: string | null;
  source?: string | null;
};

type NotificationItem = {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  read_at?: string | null;
};

export function StudentDashboardPage() {
  const { api, user } = useAuth();
  const studentId = user?.id;

  const [overview, setOverview] = useState<AttendanceOverview | null>(null);
  const [history, setHistory] = useState<AttendanceHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboardData() {
    if (!studentId) return;
    setIsLoading(true);
    setError("");
    try {
      const [overviewData, historyData, notificationsData] = await Promise.allSettled([
        api.request<AttendanceOverview>(`/analytics/students/${studentId}/overview`),
        api.request<AttendanceHistoryItem[]>("/attendance/students/me/history"),
        api.request<NotificationItem[]>("/notifications")
      ]);

      if (overviewData.status === "fulfilled") setOverview(overviewData.value);
      if (historyData.status === "fulfilled") setHistory(historyData.value);
      if (notificationsData.status === "fulfilled") setNotifications(notificationsData.value);
    } catch {
      setError("Unable to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboardData();
  }, [studentId]);

  // Calculate overall attendance across all offerings
  const overallAttendance = overview?.attendance && overview.attendance.length > 0
    ? overview.attendance.reduce((acc, curr) => acc + curr.percentage, 0) / overview.attendance.length
    : 0;

  const totalPresent = overview?.attendance.reduce((acc, curr) => acc + curr.present, 0) || 0;
  const totalAbsent = overview?.attendance.reduce((acc, curr) => acc + curr.absent, 0) || 0;
  const totalExcused = overview?.attendance.reduce((acc, curr) => acc + curr.excused, 0) || 0;

  const unreadNotifications = notifications.filter(n => !n.read_at).length;

  return (
    <div className="student-dashboard-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h2>Student Dashboard</h2>
          <p>Your attendance, schedule and academic overview.</p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => void loadDashboardData()}
          disabled={isLoading}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <IconRefresh size={16} className={isLoading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="admin-error-banner" role="alert">
          <IconAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Attendance Overview Cards */}
      <section className="dashboard-section">
        <div className="section-header">
          <h3>Attendance Overview</h3>
        </div>
        <div className="overview-cards-grid">
          {/* Overall Attendance Card */}
          <div className="admin-overview-card border-blue">
            <div className="card-top">
              <div className="card-icon-tint blue">
                <IconCalendar size={22} />
              </div>
              <span className="card-badge badge-blue">
                {overview?.attendance.length || 0} Courses
              </span>
            </div>
            <div className="card-body">
              <span className="card-val">{overallAttendance.toFixed(1)}%</span>
              <h4 className="card-title">Overall Attendance</h4>
              <p className="card-desc">
                Present: {totalPresent} · Absent: {totalAbsent} · Excused: {totalExcused}
              </p>
            </div>
            <div className="card-footer">
              <Link to="/student/attendance" className="card-action-link">
                View details <IconArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Analytics Card */}
          <div className="admin-overview-card border-indigo">
            <div className="card-top">
              <div className="card-icon-tint indigo">
                <IconChartBar size={22} />
              </div>
              <span className="card-badge badge-indigo">Analytics</span>
            </div>
            <div className="card-body">
              <span className="card-val">
                {overview?.attendance.filter(a => a.percentage >= 75).length || 0}
              </span>
              <h4 className="card-title">On Track</h4>
              <p className="card-desc">
                Courses meeting 75% threshold
              </p>
            </div>
            <div className="card-footer">
              <Link to="/student/analytics" className="card-action-link">
                View analytics <IconArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Notifications Card */}
          <div className="admin-overview-card border-amber">
            <div className="card-top">
              <div className="card-icon-tint amber">
                <IconBell size={22} />
              </div>
              <span className="card-badge badge-amber">
                {unreadNotifications} Unread
              </span>
            </div>
            <div className="card-body">
              <span className="card-val">{notifications.length}</span>
              <h4 className="card-title">Notifications</h4>
              <p className="card-desc">
                Announcements and updates
              </p>
            </div>
            <div className="card-footer">
              <span className="card-action-link" style={{ cursor: "not-allowed", opacity: 0.6 }}>
                View notifications <IconArrowRight size={14} />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="dashboard-grid-split">
        {/* Left Column: Recent Attendance */}
        <div className="grid-col">
          <section className="dashboard-section">
            <div className="section-header flex-between">
              <h3>Recent Attendance</h3>
              <Link to="/student/attendance" className="card-link">Full History</Link>
            </div>

            <div className="admin-card">
              {history.length === 0 ? (
                <div className="empty-state">No attendance records available yet.</div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 5).map((item) => (
                        <tr key={item.record_id}>
                          <td>
                            <div>
                              <strong>{item.course_code}</strong>
                              <small style={{ display: "block", color: "#64748b", marginTop: "2px" }}>
                                {item.course_name}
                              </small>
                            </div>
                          </td>
                          <td>
                            {new Date(item.lecture_date).toLocaleDateString()}
                            {item.scheduled_start && (
                              <small style={{ display: "block", color: "#64748b" }}>
                                {new Date(item.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </small>
                            )}
                          </td>
                          <td>
                            <span className={`status-pill status-${(item.status || "pending").toLowerCase()}`}>
                              {item.status || "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Subject-wise Attendance */}
          {overview?.attendance && overview.attendance.length > 0 && (
            <section className="dashboard-section">
              <div className="section-header">
                <h3>Subject-wise Attendance</h3>
              </div>

              <div className="admin-card">
                <div className="metrics-summary-list">
                  {overview.attendance.map((item) => (
                    <div key={item.offering_id} className="metric-row">
                      <div className="inst-metric-info">
                        <span className="inst-label">Course {item.offering_id}</span>
                        <span className="inst-desc">
                          {item.sessions_held} sessions · {item.present} present
                        </span>
                      </div>
                      <span className={`inst-val ${item.percentage >= 75 ? "blue" : "amber"}`}>
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Quick Actions & Notifications */}
        <div className="grid-col">
          {/* Quick Actions */}
          <section className="dashboard-section">
            <div className="section-header">
              <h3>Quick Actions</h3>
            </div>

            <div className="admin-card">
              <div className="quick-actions-list">
                <Link to="/student/attendance" className="action-item">
                  <div>
                    <strong>View Attendance History</strong>
                    <p>Complete attendance record and status</p>
                  </div>
                  <IconArrowRight size={18} />
                </Link>
                <Link to="/student/analytics" className="action-item">
                  <div>
                    <strong>View Analytics</strong>
                    <p>Attendance trends and shortage analysis</p>
                  </div>
                  <IconArrowRight size={18} />
                </Link>
              </div>
            </div>
          </section>

          {/* Recent Notifications */}
          {notifications.length > 0 && (
            <section className="dashboard-section">
              <div className="section-header flex-between">
                <h3>Recent Notifications</h3>
                <span className="pending-counter">{unreadNotifications} Unread</span>
              </div>

              <div className="admin-card">
                <div className="metrics-summary-list">
                  {notifications.slice(0, 5).map((notif) => (
                    <div
                      key={notif.id}
                      className="metric-row"
                      style={{ borderLeftColor: notif.read_at ? "#cbd5e1" : "#d97706" }}
                    >
                      <div className="inst-metric-info">
                        <span className="inst-label">{notif.title}</span>
                        <span className="inst-desc">{notif.body}</span>
                      </div>
                      {!notif.read_at && (
                        <span className="inst-val amber" style={{ fontSize: "12px" }}>NEW</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Important Notice */}
          <section className="dashboard-section">
            <div className="admin-card" style={{ background: "#eff6ff", borderColor: "#bae6fd" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "start" }}>
                <IconAlertCircle size={20} style={{ color: "#0369a1", flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "#0c4a6e" }}>
                    Attendance Marking
                  </h4>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "#075985", lineHeight: 1.5 }}>
                    Attendance can only be marked from the PresentSir mobile app. Use this dashboard to view your attendance records and analytics.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
