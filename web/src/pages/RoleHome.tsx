import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { 
  IconUsers, 
  IconShieldCheck, 
  IconFileText, 
  IconDeviceMobile, 
  IconBuildingBank, 
  IconHistory,
  IconArrowRight,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconRefresh
} from "@tabler/icons-react";

type User = { id: number; role: string; login_id: string; name: string; department_id?: number | null; status: string; registration_status: string; device_id?: number | null; registration_window_id?: number | null };
type Request = { id: number; user_id?: number | null; type?: string | null; reason?: string | null; status?: string | null };
type Policy = { id: number; scope: string; scope_id?: number | null; threshold_percent: number; effective_from: string; set_by: number };
type Audit = { id: number; action?: string | null; old_status?: string | null; new_status?: string | null; reason?: string | null; actor_id?: number | null; at?: string | null };
type Institution = { sessions_held: number; students: number; offerings: number; attendance_percentage: number; shortage_students: number; open_flags: number };

export function RoleHome({ role }: { role: string }) {
  const { api } = useAuth();
  const isAdmin = role === "Admin";

  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAdminOverview() {
    if (!isAdmin) return;
    setIsLoading(true);
    setError("");
    try {
      const [u, r, p, inst, a] = await Promise.allSettled([
        api.request<User[]>("/admin/users"),
        api.request<Request[]>("/admin/requests"),
        api.request<Policy[]>("/admin/policies"),
        api.request<Institution>("/analytics/institution"),
        api.request<Audit[]>("/admin/audit")
      ]);

      if (u.status === "fulfilled") setUsers(u.value);
      if (r.status === "fulfilled") setRequests(r.value);
      if (p.status === "fulfilled") setPolicies(p.value);
      if (inst.status === "fulfilled") setInstitution(inst.value);
      if (a.status === "fulfilled") setAudit(a.value);
    } catch {
      setError("Unable to load overview data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAdminOverview();
  }, [role]);

  async function decideRequest(id: number, status: string) {
    try {
      await api.request(`/admin/requests/${id}/decision`, {
        method: "POST",
        body: JSON.stringify({ status, note: `${status} by administrator` })
      });
      await loadAdminOverview();
    } catch {
      setError("Unable to process request.");
    }
  }

  if (!isAdmin) {
    return (
      <div className="admin-dashboard-container">
        <div className="admin-page-header">
          <div>
            <h2>{role} Workspace Overview</h2>
            <p>Welcome to your institutional attendance portal.</p>
          </div>
        </div>
        <div className="overview-cards-grid">
          <div className="admin-overview-card border-blue">
            <div className="card-top">
              <div className="card-icon-tint blue"><IconUsers size={22} /></div>
              <span className="card-status-dot green" />
            </div>
            <h3>Workspace</h3>
            <p>Access active workspace and sessions.</p>
            <Link to={`/${role.toLowerCase()}/sessions`} className="card-action-link">Open workspace <IconArrowRight size={14} /></Link>
          </div>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === "PENDING");

  return (
    <div className="admin-dashboard-container">
      {/* 1. Page Header */}
      <div className="admin-page-header">
        <div>
          <h2>Administration</h2>
          <p>Manage users, attendance configuration and institutional activity</p>
        </div>
        <button className="btn-secondary" onClick={() => void loadAdminOverview()} disabled={isLoading} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
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

      {/* 2. Redesigned Top Cards (Overview Section) */}
      <section className="dashboard-section">
        <div className="section-header">
          <h3>Overview</h3>
        </div>
        <div className="overview-cards-grid">
          {/* Card 1: Users */}
          <div className="admin-overview-card border-blue">
            <div className="card-top">
              <div className="card-icon-tint blue">
                <IconUsers size={22} />
              </div>
              <span className="card-badge badge-blue">{users.length} Users</span>
            </div>
            <div className="card-body">
              <span className="card-val">{users.length || "—"}</span>
              <h4 className="card-title">User Accounts</h4>
              <p className="card-desc">User profiles, roles, and biometric registration statuses.</p>
            </div>
            <div className="card-footer">
              <Link to="/admin/users" className="card-action-link">
                Manage users <IconArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Card 2: Policies */}
          <div className="admin-overview-card border-amber">
            <div className="card-top">
              <div className="card-icon-tint amber">
                <IconShieldCheck size={22} />
              </div>
              <span className="card-badge badge-amber">{policies.length > 0 ? `${policies[0].threshold_percent}% Active` : "Policy"}</span>
            </div>
            <div className="card-body">
              <span className="card-val">{policies.length > 0 ? `${policies[0].threshold_percent}%` : "75%"}</span>
              <h4 className="card-title">Attendance Policy</h4>
              <p className="card-desc">Global attendance thresholds and effective date rules.</p>
            </div>
            <div className="card-footer">
              <Link to="/admin/policy" className="card-action-link">
                Configure policy <IconArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Card 3: Reports & Audit */}
          <div className="admin-overview-card border-indigo">
            <div className="card-top">
              <div className="card-icon-tint indigo">
                <IconFileText size={22} />
              </div>
              <span className="card-badge badge-indigo">{audit.length} Audit Entries</span>
            </div>
            <div className="card-body">
              <span className="card-val">{audit.length || "—"}</span>
              <h4 className="card-title">Reports & Audit</h4>
              <p className="card-desc">System logs, attendance reports, and audit trails.</p>
            </div>
            <div className="card-footer">
              <Link to="/admin/audit" className="card-action-link">
                View audit logs <IconArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main Split View: Pending Actions & Attendance Overview */}
      <div className="dashboard-grid-split">
        {/* Left Column: Pending Actions */}
        <div className="grid-col">
          <section className="dashboard-section">
            <div className="section-header flex-between">
              <h3>Pending Actions</h3>
              <span className="pending-counter">{pendingRequests.length} Pending</span>
            </div>

            <div className="admin-card">
              {pendingRequests.length === 0 ? (
                <div className="empty-state">No pending administrative actions requiring approval.</div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>User ID</th>
                        <th>Reason</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map((req) => (
                        <tr key={req.id}>
                          <td><span className="badge badge-warning">{req.type ?? "DEVICE_REGISTRATION"}</span></td>
                          <td>User #{req.user_id ?? "—"}</td>
                          <td>{req.reason ?? "No details"}</td>
                          <td>
                            <div className="btn-group">
                              <button className="btn-xs btn-success" onClick={() => void decideRequest(req.id, "APPROVED")}>
                                <IconCheck size={14} /> Approve
                              </button>
                              <button className="btn-xs btn-danger" onClick={() => void decideRequest(req.id, "REJECTED")}>
                                <IconX size={14} /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Recent Administrative Activity */}
          <section className="dashboard-section">
            <div className="section-header flex-between">
              <h3>Recent Activity</h3>
              <Link to="/admin/audit" className="card-link">Full Audit Log</Link>
            </div>

            <div className="admin-card">
              {audit.length === 0 ? (
                <div className="empty-state">No recent activity logged.</div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Status Change</th>
                        <th>Actor</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.slice(0, 5).map((log) => (
                        <tr key={log.id}>
                          <td><span className="badge badge-info">{log.action ?? "SYSTEM"}</span></td>
                          <td><code>{log.old_status ?? "N/A"} → {log.new_status ?? "N/A"}</code></td>
                          <td>User #{log.actor_id ?? "—"}</td>
                          <td>{log.at ? new Date(log.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Attendance & Institution Overview */}
        <div className="grid-col">
          <section className="dashboard-section">
            <div className="section-header">
              <h3>Attendance & Institution Overview</h3>
            </div>

            <div className="admin-card">
              {institution ? (
                <div className="institution-metrics-list">
                  <div className="inst-metric-item">
                    <div className="inst-metric-info">
                      <span className="inst-label">Average Attendance</span>
                      <span className="inst-desc">Overall institutional presence</span>
                    </div>
                    <span className="inst-val blue">{institution.attendance_percentage.toFixed(1)}%</span>
                  </div>

                  <div className="inst-metric-item">
                    <div className="inst-metric-info">
                      <span className="inst-label">Shortage Students</span>
                      <span className="inst-desc">Students below threshold ({policies[0]?.threshold_percent ?? 75}%)</span>
                    </div>
                    <span className="inst-val amber">{institution.shortage_students}</span>
                  </div>

                  <div className="inst-metric-item">
                    <div className="inst-metric-info">
                      <span className="inst-label">Open Flagged Submissions</span>
                      <span className="inst-desc">Unresolved attendance flags</span>
                    </div>
                    <span className="inst-val">{institution.open_flags}</span>
                  </div>

                  <div className="inst-metric-item">
                    <div className="inst-metric-info">
                      <span className="inst-label">Conducted Sessions</span>
                      <span className="inst-desc">Total class sessions held</span>
                    </div>
                    <span className="inst-val">{institution.sessions_held}</span>
                  </div>

                  <div className="inst-metric-item">
                    <div className="inst-metric-info">
                      <span className="inst-label">Active Course Offerings</span>
                      <span className="inst-desc">Total course modules</span>
                    </div>
                    <span className="inst-val">{institution.offerings}</span>
                  </div>

                  <div className="inst-metric-item">
                    <div className="inst-metric-info">
                      <span className="inst-label">Enrolled Students</span>
                      <span className="inst-desc">Total student accounts</span>
                    </div>
                    <span className="inst-val">{institution.students}</span>
                  </div>
                </div>
              ) : (
                <div className="empty-state">Loading institutional metrics...</div>
              )}
            </div>
          </section>

          {/* Registration Window Quick Control */}
          <section className="dashboard-section">
            <div className="section-header flex-between">
              <h3>Registration Status Overview</h3>
              <Link to="/admin/users" className="card-link">View Users</Link>
            </div>

            <div className="admin-card">
              <div className="reg-status-summary">
                <div className="reg-stat-col">
                  <span className="reg-num green">{users.filter(u => u.registration_status === "REGISTERED").length}</span>
                  <span className="reg-lbl">Registered</span>
                </div>
                <div className="reg-stat-col">
                  <span className="reg-num amber">{users.filter(u => u.registration_status === "PENDING").length}</span>
                  <span className="reg-lbl">Pending</span>
                </div>
                <div className="reg-stat-col">
                  <span className="reg-num slate">{users.filter(u => u.registration_status === "NOT_REGISTERED").length}</span>
                  <span className="reg-lbl">Not Registered</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
