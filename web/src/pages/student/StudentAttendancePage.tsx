import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";

type Summary = { offering_id: number; sessions_held: number; present: number; absent: number; excused: number; percentage: number; shortage: number };
type Overview = { attendance: Summary[] };
type History = { record_id: number; course_code: string; course_name: string; lecture_date: string; scheduled_start?: string | null; status?: string | null; source?: string | null };

export function StudentAttendancePage() {
  const { api, user } = useAuth(); const studentId = user?.id;
  const [summary, setSummary] = useState<Summary[]>([]); const [history, setHistory] = useState<History[]>([]); const [error, setError] = useState("");
  useEffect(() => { if (!studentId) return; void Promise.all([api.request<Overview>(`/analytics/students/${studentId}/overview`), api.request<History[]>("/attendance/students/me/history")]).then(([overview, nextHistory]) => { setSummary(overview.attendance); setHistory(nextHistory); }).catch(() => setError("Unable to load attendance.")); }, [studentId]);
  return <div className="student-page"><header><h2>Attendance</h2><p className="student-notice">Attendance can only be marked from the PresentSir mobile app.</p></header>{error && <p role="alert" className="error-message">{error}</p>}<section className="student-card-grid">{summary.map((item) => <article className="student-card" key={item.offering_id}><h3>Course {item.offering_id}</h3><div className="metric-large">{item.percentage.toFixed(1)}%</div><p>Conducted {item.sessions_held} · Attended {item.present}</p><strong className={item.percentage >= 75 ? "good-text" : "warning-text"}>{item.percentage >= 75 ? "On track" : "Shortage"} </strong></article>)}</section><section className="content-card"><h3>Course attendance history</h3><div className="student-history">{history.map((item) => <div className="list-row" key={item.record_id}><span><strong>{item.course_code} — {item.course_name}</strong><small>{item.lecture_date} · {item.scheduled_start ? new Date(item.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</small></span><span className={`status-pill status-${(item.status ?? "pending").toLowerCase()}`}>{item.status ?? "Pending"}</span><button onClick={() => window.alert(`Open a dispute from the mobile app for ${item.course_code}.`)}>Raise dispute</button></div>)}</div></section></div>;
}
