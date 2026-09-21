import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";

type Trend = { week_start: string; percentage: number; present: number; absent: number };
type Summary = { offering_id: number; sessions_held: number; present: number; percentage: number; shortage: number };
type Overview = { attendance: Summary[] };
export function StudentAnalyticsPage() {
  const { api, user } = useAuth(); const [summary, setSummary] = useState<Summary[]>([]); const [trend, setTrend] = useState<Trend[]>([]);
  useEffect(() => { if (!user) return; void Promise.all([api.request<Overview>(`/analytics/students/${user.id}/overview`), api.request<Trend[]>(`/analytics/students/${user.id}/trend`)]).then(([overview, nextTrend]) => { setSummary(overview.attendance); setTrend(nextTrend); }); }, [user]);
  return <div className="student-page"><header><h2>Attendance analytics</h2><p>75% is the minimum attendance threshold.</p></header><section className="content-card"><h3>Subject attendance</h3>{summary.map((item) => <div className="bar-row" key={item.offering_id}><span>Offering {item.offering_id}</span><div className="bar-track"><i style={{ width: `${Math.min(100, item.percentage)}%` }} /></div><strong>{item.percentage.toFixed(1)}%</strong></div>)}</section><section className="content-card"><h3>Weekly trend</h3><div className="trend-grid">{trend.map((item) => <article key={item.week_start}><strong>{item.week_start}</strong><span>{item.percentage.toFixed(1)}%</span><small>{item.present} present · {item.absent} absent</small></article>)}</div></section><section className="content-card"><h3>Lectures required</h3>{summary.map((item) => <p key={item.offering_id}>{item.shortage > 0 ? `Need more attendance for offering ${item.offering_id}: ${item.shortage.toFixed(1)} percentage points.` : `Offering ${item.offering_id}: threshold reachable.`}</p>)}</section></div>;
}
