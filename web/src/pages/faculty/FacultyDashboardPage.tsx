import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import {
  IconCalendar,
  IconClock,
  IconAlertTriangle,
  IconChartBar,
  IconArrowRight,
  IconRefresh,
  IconDeviceMobile,
  IconFileText,
  IconUsers,
  IconCircleCheck,
  IconCircleX
} from "@tabler/icons-react";

type Slot = {
  id: number;
  offering_id: number;
  course_code: string;
  course_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string;
  active: boolean;
};

type Session = {
  id: number;
  status: string;
  opened_at?: string | null;
  close_at?: string | null;
  scheduled_start: string;
  scheduled_end: string;
};

type Dispute = {
  id: number;
  record_id: number;
  student_id: number;
  student_name: string;
  course_code: string;
  lecture_date: string;
  status: string;
  message?: string | null;
  response?: string | null;
};

type RiskFlag = {
  id: number;
  session_id?: number | null;
  student_id?: number | null;
  kind?: string | null;
  score?: number | null;
  level?: string | null;
  status: string;
  reasons?: Record<string, unknown> | null;
};

type RiskStatistics = {
  total: number;
  open: number;
  resolved: number;
  false_flags: number;
  false_flag_rate: number;
};

export function FacultyDashboardPage() {
  const { api } = useAuth();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [riskFlags, setRiskFlags] = useState<RiskFlag[]>([]);
  const [riskStats, setRiskStats] = useState<RiskStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboardData() {
    setIsLoading(true);
    setError("");
    try {
      const [slotsData, sessionsData, disputesData, riskFlagsData, riskStatsData] = await Promise.allSettled([
        api.request<Slot[]>("/faculty/slots"),
        api.request<Session[]>("/attendance/sessions"),
        api.request<Dispute[]>("/attendance/disputes"),
        api.request<RiskFlag[]>("/analytics/risk/queue?status=OPEN"),
        api.request<RiskStatistics>("/analytics/risk/statistics")
      ]);

      if (slotsData.status === "fulfilled") setSlots(slotsData.value);
      if (sessionsData.status === "fulfilled") setSessions(sessionsData.value);
      if (disputesData.status === "fulfilled") setDisputes(disputesData.value);
      if (riskFlagsData.status === "fulfilled") setRiskFlags(riskFlagsData.value);
      if (riskStatsData.status === "fulfilled") setRiskStats(riskStatsData.value);
    } catch {
      setError("Unable to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboardData();
  }, []);

  // Find active/open session
  const activeSession = sessions.find(s => s.status === "OPEN");
  const todaySessions = sessions.filter(s => {
    const today = new Date().toISOString().slice(0, 10);
    return s.scheduled_start.startsWith(today);
  });

  // Calculate today's slots
  const todayDayOfWeek = new Date().getDay();
  const todaySlots = slots.filter(s => s.day_of_week === todayDayOfWeek && s.active);

  // Count items requiring attention
  const openDisputes = disputes.filter(d => d.status === "OPEN").length;
  const openFlags = riskFlags.filter(f => f.status === "OPEN").length;

  return (
    <div className="faculty-dashboard-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h2>Faculty Dashboard</h2>
          <p>Manage today's sessions, attendance and academic activity.</p>
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
          <IconAlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Active Session Card - Prominent */}
      {activeSession ? (
        <section className="dashboard-section">
          <div className="section-header">
            <h3>Active Session</h3>
          </div>
          <div className="admin-card" style={{ borderLeft: "4px solid #16a34a", background: "#f0fdf4" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="card-icon-tint" style={{ background: "#dcfce7", color: "#16a34a" }}>
                  <IconCircleCheck size={24} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                    Session #{activeSession.id}
                  </h4>
                  <span className="badge badge-success" style={{ marginTop: "4px", display: "inline-block" }}>
                    {activeSession.status}
                  </span>
                </div>
              </div>
              <Link
                to={`/faculty/sessions/${activeSession.id}/board`}
                className="btn-primary"
                style={{ textDecoration: "none" }}
              >
                Open Smart Board
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "12px" }}>
              <div>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                  Start Time
                </span>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginTop: "4px" }}>
                  {new Date(activeSession.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                  End Time
                </span>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginTop: "4px" }}>
                  {new Date(activeSession.scheduled_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                  Closes At
                </span>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginTop: "4px" }}>
                  {activeSession.close_at ? new Date(activeSession.close_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="dashboard-section">
          <div className="section-header">
            <h3>Active Session</h3>
          </div>
          <div className="empty-state">
            <IconCircleX size={32} style={{ color: "#cbd5e1", marginBottom: "8px" }} />
            <p>No active session</p>
            <Link to="/faculty/sessions" className="card-link" style={{ marginTop: "8px", display: "inline-block" }}>
              Manage sessions
            </Link>
          </div>
        </section>
      )}

      {/* Overview Cards */}
      <section className="dashboard-section">
        <div className="section-header">
          <h3>Overview</h3>
        </div>
        <div className="overview-cards-grid">
          {/* Today's Sessions Card */}
          <div className="admin-overview-card border-blue">
            <div className="card-top">
              <div className="card-icon-tint blue">
                <IconCalendar size={22} />
              </div>
              <span className="card-badge badge-blue">
                {todaySessions.length} Scheduled
              </span>
            </div>
            <div className="card-body">
              <span className="card-val">{todaySessions.length}</span>
              <h4 className="card-title">Today's Sessions</h4>
              <p className="card-desc">
                {todaySlots.length} slots configured for today
              </p>
            </div>
            <div className="card-footer">
              <Link to="/faculty/sessions" className="card-action-link">
                View sessions <IconArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Review Items Card */}
          <div className="admin-overview-card border-amber">
            <div className="card-top">
              <div className="card-icon-tint amber">
                <IconAlertTriangle size={22} />
              </div>
              <span className="card-badge badge-amber">
                {openDisputes + openFlags} Pending
              </span>
            </div>
            <div className="card-body">
              <span className="card-val">{openDisputes + openFlags}</span>
              <h4 className="card-title">Requires Attention</h4>
              <p className="card-desc">
                {openDisputes} disputes · {openFlags} flags
              </p>
            </div>
            <div className="card-footer">
              <Link to="/faculty/analytics" className="card-action-link">
                Review items <IconArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Risk Statistics Card */}
          {riskStats && (
            <div className="admin-overview-card border-indigo">
              <div className="card-top">
                <div className="card-icon-tint indigo">
                  <IconChartBar size={22} />
                </div>
                <span className="card-badge badge-indigo">
                  {riskStats.total} Total
                </span>
              </div>
              <div className="card-body">
                <span className="card-val">{riskStats.open}</span>
                <h4 className="card-title">Open Flags</h4>
                <p className="card-desc">
                  {riskStats.resolved} resolved · {riskStats.false_flag_rate.toFixed(1)}% false positive
                </p>
              </div>
              <div className="card-footer">
                <Link to="/faculty/analytics" className="card-action-link">
                  View analytics <IconArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="dashboard-grid-split">
        {/* Left Column: Today's Schedule */}
        <div className="grid-col">
          <section className="dashboard-section">
            <div className="section-header flex-between">
              <h3>Today's Schedule</h3>
              <Link to="/faculty/sessions" className="card-link">Manage Sessions</Link>
            </div>

            <div className="admin-card">
              {todaySlots.length === 0 ? (
                <div className="empty-state">No slots configured for today.</div>
              ) : (
                <div className="metrics-summary-list">
                  {todaySlots.map((slot) => {
                    const sessionForSlot = todaySessions.find(s => {
                      // Match by time - this is approximate since we don't have slot_id in session
                      const slotStart = slot.start_time;
                      const sessionStart = new Date(s.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      return sessionStart === slotStart;
                    });
                    return (
                      <div key={slot.id} className="metric-row">
                        <div className="inst-metric-info">
                          <span className="inst-label">{slot.course_code}</span>
                          <span className="inst-desc">
                            {slot.course_name} · {slot.room}
                          </span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                            {slot.start_time} – {slot.end_time}
                          </span>
                          {sessionForSlot && (
                            <span className={`status-pill status-${sessionForSlot.status.toLowerCase()}`} style={{ marginTop: "4px", display: "inline-block", fontSize: "11px" }}>
                              {sessionForSlot.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Recent Sessions */}
          {sessions.length > 0 && (
            <section className="dashboard-section">
              <div className="section-header flex-between">
                <h3>Recent Sessions</h3>
                <Link to="/faculty/sessions" className="card-link">All Sessions</Link>
              </div>

              <div className="admin-card">
                <div className="admin-table-wrap">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Session ID</th>
                        <th>Status</th>
                        <th>Scheduled</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.slice(0, 5).map((session) => (
                        <tr key={session.id}>
                          <td>
                            <strong>#{session.id}</strong>
                          </td>
                          <td>
                            <span className={`status-pill status-${session.status.toLowerCase()}`}>
                              {session.status}
                            </span>
                          </td>
                          <td>
                            {new Date(session.scheduled_start).toLocaleDateString()}
                            <small style={{ display: "block", color: "#64748b" }}>
                              {new Date(session.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </small>
                          </td>
                          <td>
                            {session.status === "SCHEDULED" && (
                              <button
                                className="btn-xs btn-success"
                                onClick={() => void api.request(`/attendance/sessions/${session.id}/start`, { method: "POST" }).then(loadDashboardData)}
                              >
                                Start
                              </button>
                            )}
                            {session.status === "OPEN" && (
                              <Link to={`/faculty/sessions/${session.id}/board`} className="btn-xs btn-primary">
                                Board
                              </Link>
                            )}
                            {["CLOSED", "SAVED", "SUBMITTED"].includes(session.status) && (
                              <Link to={`/faculty/sessions/${session.id}/review`} className="btn-xs btn-secondary">
                                Review
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Quick Actions & Attention Items */}
        <div className="grid-col">
          {/* Quick Actions */}
          <section className="dashboard-section">
            <div className="section-header">
              <h3>Quick Actions</h3>
            </div>

            <div className="admin-card">
              <div className="quick-actions-list">
                <Link to="/faculty/sessions" className="action-item">
                  <div>
                    <strong>Manage Sessions</strong>
                    <p>Create and manage attendance sessions</p>
                  </div>
                  <IconArrowRight size={18} />
                </Link>
                <Link to="/faculty/analytics" className="action-item">
                  <div>
                    <strong>View Analytics</strong>
                    <p>Attendance trends and insights</p>
                  </div>
                  <IconArrowRight size={18} />
                </Link>
                <Link to="/faculty/analytics" className="action-item">
                  <div>
                    <strong>Review Disputes</strong>
                    <p>Student attendance disputes</p>
                  </div>
                  <IconArrowRight size={18} />
                </Link>
              </div>
            </div>
          </section>

          {/* Pending Disputes */}
          {disputes.length > 0 && (
            <section className="dashboard-section">
              <div className="section-header flex-between">
                <h3>Pending Disputes</h3>
                <span className="pending-counter">{openDisputes} Open</span>
              </div>

              <div className="admin-card">
                <div className="metrics-summary-list">
                  {disputes.slice(0, 5).map((dispute) => (
                    <div
                      key={dispute.id}
                      className="metric-row"
                      style={{ borderLeftColor: dispute.status === "OPEN" ? "#d97706" : "#cbd5e1" }}
                    >
                      <div className="inst-metric-info">
                        <span className="inst-label">{dispute.student_name}</span>
                        <span className="inst-desc">
                          {dispute.course_code} · {dispute.lecture_date}
                        </span>
                      </div>
                      {dispute.status === "OPEN" && (
                        <span className="inst-val amber" style={{ fontSize: "12px" }}>OPEN</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Open Risk Flags */}
          {riskFlags.length > 0 && (
            <section className="dashboard-section">
              <div className="section-header flex-between">
                <h3>Flag Review Queue</h3>
                <span className="pending-counter">{openFlags} Open</span>
              </div>

              <div className="admin-card">
                <div className="metrics-summary-list">
                  {riskFlags.slice(0, 5).map((flag) => (
                    <div
                      key={flag.id}
                      className="metric-row"
                      style={{ borderLeftColor: flag.level === "HIGH" ? "#dc2626" : "#d97706" }}
                    >
                      <div className="inst-metric-info">
                        <span className="inst-label">{flag.kind || "Flag"}</span>
                        <span className="inst-desc">
                          Score: {flag.score} · Session #{flag.session_id}
                        </span>
                      </div>
                      {flag.status === "OPEN" && (
                        <span className="inst-val" style={{ fontSize: "12px", color: flag.level === "HIGH" ? "#dc2626" : "#d97706" }}>
                          {flag.level}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
