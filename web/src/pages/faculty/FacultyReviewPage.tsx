import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";

type Flag = { id: number; kind?: string | null; level?: string | null; status?: string | null };
type RosterRow = {
  student_id: number; roll_no: string; prn: string; name: string;
  status?: string | null; source?: string | null; flags: Flag[];
};
type Session = { id: number; status: string; scheduled_start?: string | null; scheduled_end?: string | null };
type Filter = "ALL" | "PRESENT" | "ABSENT" | "MANUAL" | "FLAGGED";

export function FacultyReviewPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const { api } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [headcount, setHeadcount] = useState("");
  const [editing, setEditing] = useState<RosterRow | null>(null);
  const [nextStatus, setNextStatus] = useState("PRESENT");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [nextSession, nextRoster] = await Promise.all([
      api.request<Session>(`/attendance/sessions/${sessionId}`),
      api.request<RosterRow[]>(`/attendance/sessions/${sessionId}/roster`),
    ]);
    setSession(nextSession);
    setRoster(nextRoster);
  }
  useEffect(() => { void load().catch(() => setError("Unable to load the attendance review.")); }, [sessionId]);

  const presentCount = roster.filter((row) => row.status === "PRESENT").length;
  const mismatch = headcount !== "" && Number(headcount) !== presentCount;
  const filtered = useMemo(() => roster.filter((row) => {
    if (filter === "ALL") return true;
    if (filter === "FLAGGED") return row.flags.length > 0;
    if (filter === "MANUAL") return row.source === "MANUAL";
    return row.status === filter;
  }), [filter, roster]);
  const submitted = session?.status === "SUBMITTED";

  async function changeRecord() {
    if (!editing || reason.trim().length < 5) {
      setError("A reason of at least 5 characters is required.");
      return;
    }
    setSaving(true); setError("");
    try {
      await api.request(`/attendance/sessions/${sessionId}/records/${editing.student_id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, reason: reason.trim() }),
      });
      setEditing(null); setReason(""); await load();
    } catch { setError("Unable to change this attendance record."); }
    finally { setSaving(false); }
  }
  async function transition(target: "SAVED" | "SUBMITTED") {
    if (target === "SUBMITTED" && !window.confirm("Submit the final attendance? Further changes will be post-submit edits requiring a reason.")) return;
    setSaving(true); setError("");
    try { await api.request(`/attendance/sessions/${sessionId}/${target}`, { method: "POST" }); await load(); }
    catch { setError(`Unable to ${target === "SAVED" ? "save the draft" : "submit the final attendance"}.`); }
    finally { setSaving(false); }
  }

  return <div className="review-page">
    <div className="review-header"><div><Link to="/faculty/sessions">← Sessions</Link><h2>Attendance review</h2><p>Session #{sessionId} · {session?.status ?? "Loading"}</p></div><div className="review-actions">{session?.status === "OPEN" && <Link className="button-link" to={`/faculty/sessions/${sessionId}/board`}>Board</Link>}{session?.status === "CLOSED" && <button disabled={saving} onClick={() => void transition("SAVED")}>Save draft</button>}{session?.status === "SAVED" && <button disabled={saving} onClick={() => void transition("SUBMITTED")}>Submit final</button>}{submitted && <span className="read-only-badge">Submitted · corrections require a reason</span>}</div></div>
    {error && <p role="alert" className="error-message">{error}</p>}
    <section className="review-summary content-card"><div><strong>Headcount</strong><span>{presentCount} present / {roster.length} enrolled</span></div><label>Reported headcount<input type="number" min="0" value={headcount} onChange={(event) => setHeadcount(event.target.value)} placeholder={String(presentCount)} /></label>{mismatch && <p className="warning-message">Headcount mismatch: reported {headcount}, recorded {presentCount}.</p>}</section>
    <nav className="review-filters" aria-label="Roster filters">{(["ALL", "PRESENT", "ABSENT", "MANUAL", "FLAGGED"] as Filter[]).map((item) => <button className={filter === item ? "active-filter" : ""} key={item} onClick={() => setFilter(item)}>{item[0] + item.slice(1).toLowerCase()} {item === "ALL" ? `(${roster.length})` : ""}</button>)}</nav>
    <section className="content-card roster-card"><div className="roster-table-wrap"><table><thead><tr><th>Student</th><th>Roll no.</th><th>Status</th><th>Source</th><th>Flags</th><th>Action</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.student_id}><td>{row.name}<small>{row.prn}</small></td><td>{row.roll_no}</td><td><span className={`status-pill status-${(row.status ?? "pending").toLowerCase()}`}>{row.status ?? "Pending"}</span></td><td>{row.source ?? "—"}</td><td>{row.flags.length ? row.flags.map((flag) => flag.kind ?? "Flag").join(", ") : "—"}</td><td><button onClick={() => { setEditing(row); setNextStatus(row.status === "PRESENT" ? "ABSENT" : "PRESENT"); }}>Change</button></td></tr>)}</tbody></table></div></section>
    {editing && <div className="modal-backdrop" role="presentation"><section className="review-modal" role="dialog" aria-modal="true"><h3>Change attendance</h3><p>{editing.name} · current status: {editing.status ?? "Pending"}</p><label>New status<select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}><option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="EXCUSED">Excused</option></select></label><label>Reason (minimum 5 characters)<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} /></label><div className="modal-actions"><button onClick={() => { setEditing(null); setReason(""); }}>Cancel</button><button disabled={saving || reason.trim().length < 5} onClick={() => void changeRecord()}>Save change</button></div></section></div>}
  </div>;
}
