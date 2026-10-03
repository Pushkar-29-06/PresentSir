import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { 
  IconUsers, 
  IconDeviceMobile, 
  IconShieldCheck, 
  IconBuildingBank, 
  IconAlertCircle, 
  IconArrowRight, 
  IconCheck, 
  IconX,
  IconDownload,
  IconClock,
  IconRefresh
} from "@tabler/icons-react";

type User = { id: number; role: string; login_id: string; name: string; department_id?: number | null; status: string; registration_status: string; device_id?: number | null; registration_window_id?: number | null };
type Request = { id: number; user_id?: number | null; type?: string | null; reason?: string | null; status?: string | null };
type Policy = { id: number; scope: string; scope_id?: number | null; threshold_percent: number; effective_from: string; set_by: number };
type Audit = { id: number; action?: string | null; old_status?: string | null; new_status?: string | null; reason?: string | null; actor_id?: number | null; at?: string | null };
type Institution = { sessions_held: number; students: number; offerings: number; attendance_percentage: number; shortage_students: number; open_flags: number };
type Tab = "dashboard" | "users" | "requests" | "policy" | "institution" | "audit";

export function AdminWorkspacePage() {
  const { api } = useAuth();
  const location = useLocation();
  const rawPath = location.pathname.split("/").pop() ?? "";
  const currentTab: Tab = rawPath === "admin" || !rawPath ? "dashboard" : (rawPath as Tab);

  const [tab, setTab] = useState<Tab>(currentTab);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [audit, setAudit] = useState<Audit[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [threshold, setThreshold] = useState("75");
  const [effective, setEffective] = useState(new Date().toISOString().slice(0, 16));

  async function loadAllData() {
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
      setError("Unable to load administration data. Please verify network/authentication state.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTab(targetTab: Tab) {
    setIsLoading(true);
    setError("");
    try {
      if (targetTab === "dashboard") {
        await loadAllData();
      } else if (targetTab === "users") {
        setUsers(await api.request<User[]>("/admin/users"));
      } else if (targetTab === "requests") {
        setRequests(await api.request<Request[]>("/admin/requests"));
      } else if (targetTab === "policy") {
        setPolicies(await api.request<Policy[]>("/admin/policies"));
      } else if (targetTab === "institution") {
        setInstitution(await api.request<Institution>("/analytics/institution"));
      } else if (targetTab === "audit") {
        setAudit(await api.request<Audit[]>("/admin/audit"));
      }
    } catch {
      setError(`Unable to load ${targetTab} data.`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setTab(currentTab);
    void loadTab(currentTab);
  }, [location.pathname]);

  async function decideRequest(id: number, status: string) {
    try {
      await api.request(`/admin/requests/${id}/decision`, {
        method: "POST",
        body: JSON.stringify({ status, note: `${status} by administrator` })
      });
      await loadTab(tab);
    } catch {
      setError("Unable to process request decision.");
    }
  }

  async function closeRegistration(id: number) {
    try {
      await api.request(`/device/registration-window/${id}/close`, { method: "POST" });
      await loadTab("users");
    } catch {
      setError("Unable to close registration window.");
    }
  }

  async function savePolicy() {
    try {
      await api.request("/admin/policies", {
        method: "PUT",
        body: JSON.stringify({
          scope: "GLOBAL",
          threshold_percent: Number(threshold),
          effective_from: new Date(effective).toISOString()
        })
      });
      await loadTab("policy");
    } catch {
      setError("Unable to save policy configuration.");
    }
  }

  function exportAudit() {
    const csv = [
      "id,action,old_status,new_status,reason,actor_id,at",
      ...audit.map((row) =>
        [row.id, row.action ?? "", row.old_status ?? "", row.new_status ?? "", JSON.stringify(row.reason ?? ""), row.actor_id ?? "", row.at ?? ""].join(",")
      )
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "presentsir-audit.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const pendingRequestsCount = requests.filter(r => r.status === "PENDING").length;

  return (
    <div className="admin-dashboard-layout">
      {/* Page Title & Context Header */}
      <div className="admin-page-header">
        <div>
          <h2>Administration Overview</h2>
          <p>Institutional attendance monitoring, registration governance, policy enforcement, and security logs.</p>
        </div>
        <button className="btn-secondary" onClick={() => void loadTab(tab)} disabled={isLoading} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
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

      {/* Primary Institutional KPI Cards */}
      <div className="admin-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap blue">
            <IconBuildingBank size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Average Attendance</span>
            <div className="kpi-value">
              {institution ? `${institution.attendance_percentage.toFixed(1)}%` : "—"}
            </div>
            <span className="kpi-subtext">Across {institution?.offerings ?? "—"} active course offerings</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap amber">
            <IconAlertCircle size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Shortage Students</span>
            <div className="kpi-value">
              {institution ? institution.shortage_students : "—"}
            </div>
            <span className="kpi-subtext">Students below target policy threshold</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap indigo">
            <IconDeviceMobile size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Pending Requests</span>
            <div className="kpi-value">{pendingRequestsCount}</div>
            <span className="kpi-subtext">Awaiting biometric/device approval</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap slate">
            <IconUsers size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Enrolled</span>
            <div className="kpi-value">{institution ? institution.students : users.length || "—"}</div>
            <span className="kpi-subtext">Active institutional user accounts</span>
          </div>
        </div>
      </div>

      {/* View Selector / Tabs */}
      <div className="admin-tabs-bar">
        {[
          { id: "dashboard", label: "Executive Dashboard" },
          { id: "users", label: `User Management (${users.length})` },
          { id: "requests", label: `Registration Requests (${pendingRequestsCount})` },
          { id: "policy", label: "Attendance Policy" },
          { id: "institution", label: "Institution Analytics" },
          { id: "audit", label: "Security & Audit Log" }
        ].map((t) => (
          <Link
            key={t.id}
            to={t.id === "dashboard" ? "/admin" : `/admin/${t.id}`}
            className={`admin-tab-btn ${tab === t.id ? "active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Main Tab Content */}
      <div className="admin-tab-content">
        {/* DASHBOARD SUMMARY VIEW */}
        {tab === "dashboard" && (
          <div className="dashboard-grid">
            <div className="dashboard-column">
              {/* Quick Actions Panel */}
              <div className="admin-card">
                <div className="card-header">
                  <h3>Quick Administrative Actions</h3>
                </div>
                <div className="quick-actions-list">
                  <Link to="/admin/requests" className="action-item">
                    <div>
                      <strong>Review Device Requests</strong>
                      <p>Process pending student device re-binding & biometric approvals ({pendingRequestsCount} pending)</p>
                    </div>
                    <IconArrowRight size={18} />
                  </Link>
                  <Link to="/admin/users" className="action-item">
                    <div>
                      <strong>Manage Users & Registration</strong>
                      <p>Open or close biometric registration windows for institutional users</p>
                    </div>
                    <IconArrowRight size={18} />
                  </Link>
                  <Link to="/admin/policy" className="action-item">
                    <div>
                      <strong>Configure Attendance Policy</strong>
                      <p>Set institutional minimum attendance percentage and effective dates</p>
                    </div>
                    <IconArrowRight size={18} />
                  </Link>
                  <Link to="/admin/audit" className="action-item">
                    <div>
                      <strong>Audit Trail Log</strong>
                      <p>Review and export recent attendance record modifications and decisions</p>
                    </div>
                    <IconArrowRight size={18} />
                  </Link>
                </div>
              </div>

              {/* Pending Device Requests Table Snippet */}
              <div className="admin-card">
                <div className="card-header flex-between">
                  <h3>Pending Registration Requests</h3>
                  <Link to="/admin/requests" className="card-link">View All</Link>
                </div>
                {requests.filter(r => r.status === "PENDING").length === 0 ? (
                  <div className="empty-state">No pending registration requests.</div>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Request Type</th>
                          <th>User ID</th>
                          <th>Reason</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.filter(r => r.status === "PENDING").slice(0, 5).map((req) => (
                          <tr key={req.id}>
                            <td>
                              <span className="badge badge-info">{req.type ?? "DEVICE_REGISTRATION"}</span>
                            </td>
                            <td>User #{req.user_id ?? "—"}</td>
                            <td>{req.reason ?? "No reason provided"}</td>
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
            </div>

            <div className="dashboard-column">
              {/* Institution Metrics Overview */}
              <div className="admin-card">
                <div className="card-header">
                  <h3>Institution Metrics Overview</h3>
                </div>
                {institution ? (
                  <div className="metrics-summary-list">
                    <div className="metric-row">
                      <span>Total Sessions Held</span>
                      <strong>{institution.sessions_held}</strong>
                    </div>
                    <div className="metric-row">
                      <span>Active Course Offerings</span>
                      <strong>{institution.offerings}</strong>
                    </div>
                    <div className="metric-row">
                      <span>Open Attendance Flags</span>
                      <strong>{institution.open_flags}</strong>
                    </div>
                    <div className="metric-row">
                      <span>Students Below Threshold</span>
                      <strong className="text-warning">{institution.shortage_students}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">Institution metrics loading or unavailable.</div>
                )}
              </div>

              {/* Active Attendance Policy */}
              <div className="admin-card">
                <div className="card-header flex-between">
                  <h3>Active Institutional Policy</h3>
                  <Link to="/admin/policy" className="card-link">Modify</Link>
                </div>
                {policies.length > 0 ? (
                  <div className="policy-summary-box">
                    <div className="policy-stat">
                      <span className="policy-val">{policies[0].threshold_percent}%</span>
                      <span className="policy-lbl">Minimum Attendance Requirement</span>
                    </div>
                    <div className="policy-meta">
                      <p><strong>Scope:</strong> {policies[0].scope}</p>
                      <p><strong>Effective From:</strong> {new Date(policies[0].effective_from).toLocaleDateString()}</p>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">No policy configured.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* USERS & REGISTRATION TAB */}
        {tab === "users" && (
          <div className="admin-card">
            <div className="card-header flex-between">
              <div>
                <h3>User Accounts & Biometric Registration</h3>
                <p className="card-subtext">Manage student and faculty account statuses and registration windows.</p>
              </div>
            </div>
            {users.length === 0 ? (
              <div className="empty-state">No users returned from server.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>User Name</th>
                      <th>Role</th>
                      <th>Login ID</th>
                      <th>Department ID</th>
                      <th>Registration Status</th>
                      <th>Device & Window Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td><strong>{user.name}</strong></td>
                        <td><span className={`badge ${user.role === "ADMIN" ? "badge-navy" : user.role === "FACULTY" ? "badge-info" : "badge-neutral"}`}>{user.role}</span></td>
                        <td><code>{user.login_id}</code></td>
                        <td>{user.department_id ?? "—"}</td>
                        <td>
                          <span className={`status-dot ${user.registration_status === "REGISTERED" ? "status-active" : user.registration_status === "PENDING" ? "status-pending" : "status-inactive"}`} />
                          {user.registration_status}
                        </td>
                        <td>
                          {user.device_id ? (
                            <button className="btn-xs btn-outline-danger" onClick={() => void api.request(`/device/bindings/${user.device_id}/revoke`, { method: "POST", body: JSON.stringify({ reason: "Admin revocation" }) }).then(() => loadTab("users"))}>
                              Revoke Device
                            </button>
                          ) : user.registration_window_id ? (
                            <button className="btn-xs btn-warning" onClick={() => void closeRegistration(user.registration_window_id!)}>
                              Close Window
                            </button>
                          ) : (
                            <button className="btn-xs btn-primary" onClick={() => void api.request("/device/registration-window", { method: "POST", body: JSON.stringify({ user_id: user.id, duration_minutes: 15 }) }).then(() => loadTab("users"))}>
                              Open Window (15m)
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REGISTRATION REQUESTS TAB */}
        {tab === "requests" && (
          <div className="admin-card">
            <div className="card-header">
              <h3>Device Registration & Re-binding Requests</h3>
              <p className="card-subtext">Approve or reject device registration requests submitted by students/faculty.</p>
            </div>
            {requests.length === 0 ? (
              <div className="empty-state">No device requests found.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Request Type</th>
                      <th>User ID</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((item) => (
                      <tr key={item.id}>
                        <td>#{item.id}</td>
                        <td><strong>{item.type}</strong></td>
                        <td>User #{item.user_id ?? "—"}</td>
                        <td>{item.reason}</td>
                        <td>
                          <span className={`badge ${item.status === "APPROVED" ? "badge-success" : item.status === "REJECTED" ? "badge-danger" : "badge-warning"}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>
                          {item.status === "PENDING" ? (
                            <div className="btn-group">
                              <button className="btn-xs btn-success" onClick={() => void decideRequest(item.id, "APPROVED")}>
                                Approve
                              </button>
                              <button className="btn-xs btn-danger" onClick={() => void decideRequest(item.id, "REJECTED")}>
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted" style={{ fontSize: "12px" }}>Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* POLICY TAB */}
        {tab === "policy" && (
          <div className="dashboard-grid">
            <div className="dashboard-column">
              <div className="admin-card">
                <div className="card-header">
                  <h3>Configure Attendance Policy</h3>
                  <p className="card-subtext">Set minimum required attendance threshold for institutional warning calculation.</p>
                </div>
                <form className="admin-form" onSubmit={(event) => { event.preventDefault(); void savePolicy(); }}>
                  <div className="form-group">
                    <label htmlFor="policy-scope">Policy Scope</label>
                    <select id="policy-scope" className="form-control">
                      <option value="GLOBAL">GLOBAL (Entire Institution)</option>
                      <option value="DEPARTMENT">DEPARTMENT</option>
                      <option value="COURSE">COURSE</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="policy-threshold">Minimum Threshold (%)</label>
                    <input
                      id="policy-threshold"
                      type="number"
                      className="form-control"
                      min="0"
                      max="100"
                      value={threshold}
                      onChange={(event) => setThreshold(event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="policy-effective">Effective Date & Time</label>
                    <input
                      id="policy-effective"
                      type="datetime-local"
                      className="form-control"
                      value={effective}
                      onChange={(event) => setEffective(event.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={isLoading}>
                    Save Policy Specification
                  </button>
                </form>
              </div>
            </div>

            <div className="dashboard-column">
              <div className="admin-card">
                <div className="card-header">
                  <h3>Policy Change History</h3>
                </div>
                {policies.length === 0 ? (
                  <div className="empty-state">No policy history available.</div>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Scope</th>
                          <th>Threshold</th>
                          <th>Effective From</th>
                        </tr>
                      </thead>
                      <tbody>
                        {policies.map((p) => (
                          <tr key={p.id}>
                            <td><strong>{p.scope}</strong></td>
                            <td><span className="badge badge-navy">{p.threshold_percent}%</span></td>
                            <td>{new Date(p.effective_from).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* INSTITUTION ANALYTICS TAB */}
        {tab === "institution" && (
          <div className="admin-card">
            <div className="card-header">
              <h3>Institutional Attendance Analytics</h3>
              <p className="card-subtext">Real-time attendance performance aggregated across all active courses.</p>
            </div>
            {institution ? (
              <div className="analytics-metrics-grid">
                <div className="analytics-box">
                  <span className="analytics-num">{institution.attendance_percentage.toFixed(1)}%</span>
                  <span className="analytics-label">Institutional Attendance Average</span>
                </div>
                <div className="analytics-box">
                  <span className="analytics-num warning">{institution.shortage_students}</span>
                  <span className="analytics-label">Students Under Threshold ({threshold}%)</span>
                </div>
                <div className="analytics-box">
                  <span className="analytics-num">{institution.open_flags}</span>
                  <span className="analytics-label">Open Flagged Submissions</span>
                </div>
                <div className="analytics-box">
                  <span className="analytics-num">{institution.sessions_held}</span>
                  <span className="analytics-label">Total Conducted Sessions</span>
                </div>
                <div className="analytics-box">
                  <span className="analytics-num">{institution.students}</span>
                  <span className="analytics-label">Enrolled Student Count</span>
                </div>
                <div className="analytics-box">
                  <span className="analytics-num">{institution.offerings}</span>
                  <span className="analytics-label">Active Course Offerings</span>
                </div>
              </div>
            ) : (
              <div className="empty-state">Institution analytics data currently unavailable.</div>
            )}
          </div>
        )}

        {/* AUDIT LOG TAB */}
        {tab === "audit" && (
          <div className="admin-card">
            <div className="card-header flex-between">
              <div>
                <h3>System Audit & Governance Log</h3>
                <p className="card-subtext">Full immutable log of attendance overrides, post-submit edits, and decisions.</p>
              </div>
              <button className="btn-secondary" onClick={exportAudit} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <IconDownload size={16} /> Export CSV
              </button>
            </div>
            {audit.length === 0 ? (
              <div className="empty-state">No audit log entries recorded.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Status Transition</th>
                      <th>Justification / Reason</th>
                      <th>Actor ID</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((row) => (
                      <tr key={row.id}>
                        <td><span className="badge badge-info">{row.action}</span></td>
                        <td><code>{row.old_status} → {row.new_status}</code></td>
                        <td>{row.reason ?? "—"}</td>
                        <td>Actor #{row.actor_id ?? "—"}</td>
                        <td>{row.at ? new Date(row.at).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
