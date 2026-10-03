import { useEffect, useMemo, useState } from "react";
import {
  IconAlertCircle,
  IconCalendarStats,
  IconChartLine,
  IconCircleCheck,
  IconRefresh,
  IconUserCheck,
  IconUserX,
} from "@tabler/icons-react";
import { useAuth } from "../../auth/AuthProvider";

type Summary = {
  offering_id: number;
  sessions_held: number;
  present: number;
  absent: number;
  excused: number;
  percentage: number;
  shortage: number;
};

type Overview = {
  attendance: Summary[];
};

type Trend = {
  week_start: string;
  percentage: number;
  present: number;
  absent: number;
};

type HistoryItem = {
  offering_id: number;
  course_code: string;
  course_name: string;
  lecture_date: string;
};

const formatPercentage = (value: number): string => `${value.toFixed(1)}%`;

const formatDateLabel = (value: string): string =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(`${value}T00:00:00`)
  );

export function StudentAnalyticsPage() {
  const { api, user } = useAuth();
  const [summary, setSummary] = useState<Summary[]>([]);
  const [trend, setTrend] = useState<Trend[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [overview, weeklyTrend, attendanceHistory] = await Promise.all([
        api.request<Overview>(`/analytics/students/${user.id}/overview`),
        api.request<Trend[]>(`/analytics/students/${user.id}/trend`),
        api.request<HistoryItem[]>("/attendance/students/me/history"),
      ]);
      setSummary(overview.attendance);
      setTrend(weeklyTrend);
      setHistory(attendanceHistory);
    } catch {
      setError("Unable to load attendance analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user?.id]);

  const subjectNames = useMemo(
    () =>
      new Map(
        history.map(
          (item) => [item.offering_id, `${item.course_code} · ${item.course_name}`]
        )
      ),
    [history]
  );

  const totals = useMemo(
    () =>
      summary.reduce(
        (total, item) => ({
          sessions: total.sessions + item.sessions_held,
          present: total.present + item.present,
          absent: total.absent + item.absent,
          excused: total.excused + item.excused,
        }),
        { sessions: 0, present: 0, absent: 0, excused: 0 }
      ),
    [summary]
  );

  const overallAttendance = totals.sessions
    ? ((totals.present + totals.excused) / totals.sessions) * 100
    : 0;

  const attentionSubjects = summary.filter((item) => item.shortage > 0);

  const weekToWeekChange =
    trend.length > 1
      ? trend.at(-1)!.percentage - trend.at(-2)!.percentage
      : null;

  const trendPoints = trend
    .map(
      (item, index) =>
        `${trend.length === 1 ? 50 : (index / (trend.length - 1)) * 100},${
          100 - item.percentage
        }`
    )
    .join(" ");

  const latestRecordDate = history.reduce<string | null>(
    (date, item) => (!date || item.lecture_date > date ? item.lecture_date : date),
    null
  );

  return (
    <main className="student-page attendance-analytics-page">
      <header className="attendance-analytics-header">
        <div>
          <span className="analytics-eyebrow">Student academic record</span>
          <h2>Attendance Analytics</h2>
          <p>
            Understand your attendance across enrolled subjects and recent teaching
            weeks.
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => void load()}
          disabled={loading}
        >
          <IconRefresh size={16} className={loading ? "spin" : ""} /> Refresh
        </button>
      </header>

      {error && <p className="error-message" role="alert">{error}</p>}

      {loading ? (
        <section className="content-card analytics-loading" aria-live="polite">
          Loading your attendance analytics…
        </section>
      ) : summary.length === 0 ? (
        <section className="content-card analytics-empty">
          <IconCalendarStats size={28} />
          <h3>No attendance data yet</h3>
          <p>
            Your analytics will appear once attendance sessions are recorded for
            your enrolled subjects.
          </p>
        </section>
      ) : (
        <>
          <section
            className="analytics-overview-grid"
            aria-label="Attendance overview"
          >
            <Metric
              icon={<IconChartLine size={20} />}
              label="Overall attendance"
              value={formatPercentage(overallAttendance)}
              note={`${totals.sessions} conducted sessions`}
              primary
            />
            <Metric
              icon={<IconUserCheck size={20} />}
              label="Present sessions"
              value={String(totals.present)}
              note={
                totals.excused
                  ? `${totals.excused} excused session${totals.excused === 1 ? "" : "s"}`
                  : "Recorded as present"
              }
              tone="positive"
            />
            <Metric
              icon={<IconUserX size={20} />}
              label="Absent sessions"
              value={String(totals.absent)}
              note="Across all enrolled subjects"
              tone="negative"
            />
            <Metric
              icon={
                attentionSubjects.length ? (
                  <IconAlertCircle size={20} />
                ) : (
                  <IconCircleCheck size={20} />
                )
              }
              label="Subjects needing attention"
              value={String(attentionSubjects.length)}
              note={
                attentionSubjects.length
                  ? "Below their required attendance"
                  : "All subjects meet their requirement"
              }
              tone={attentionSubjects.length ? "warning" : "positive"}
            />
          </section>

          {trend.length > 0 && (
            <section className="content-card trend-card">
              <Heading
                title="Attendance trend"
                description="Weekly attendance from recorded sessions."
                aside={
                  latestRecordDate
                    ? `Latest record: ${formatDateLabel(latestRecordDate)}`
                    : undefined
                }
              />
              <div className="trend-chart-wrap">
                <div className="trend-y-axis" aria-hidden="true">
                  <span>100%</span>
                  <span>50%</span>
                  <span>0%</span>
                </div>
                <div
                  className="trend-chart"
                  role="img"
                  aria-label="Weekly attendance percentage trend"
                >
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <line x1="0" y1="0" x2="100" y2="0" />
                    <line x1="0" y1="50" x2="100" y2="50" />
                    <line x1="0" y1="100" x2="100" y2="100" />
                    <polyline points={trendPoints} />
                  </svg>
                  <div
                    className="trend-columns"
                    style={{
                      gridTemplateColumns: `repeat(${trend.length}, 1fr)`,
                    }}
                  >
                    {trend.map((item) => (
                      <div key={item.week_start}>
                        <strong>{formatPercentage(item.percentage)}</strong>
                        <span>{formatDateLabel(item.week_start)}</span>
                        <small>
                          {item.present} present · {item.absent} absent
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="analytics-detail-grid">
            <section className="content-card">
              <Heading
                title="Subject-wise attendance"
                description="Aggregate attendance for each enrolled offering."
              />
              <div className="subject-list">
                {summary.map((item) => (
                  <div className="subject-row" key={item.offering_id}>
                    <div className="subject-meta">
                      <strong>
                        {subjectNames.get(item.offering_id) ??
                          `Offering ${item.offering_id}`}
                      </strong>
                      <small>
                        {item.present + item.excused} attended · {item.sessions_held}{" "}
                        sessions
                      </small>
                    </div>
                    <div
                      className="subject-progress"
                      aria-label={`${formatPercentage(item.percentage)} attendance`}
                    >
                      <i
                        className={item.shortage > 0 ? "at-risk" : ""}
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      />
                    </div>
                    <strong
                      className={item.shortage > 0 ? "attention-text" : ""}
                    >
                      {formatPercentage(item.percentage)}
                    </strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="content-card">
              <Heading
                title="Insights"
                description="Calculated from your recorded attendance."
              />
              <div className="insight-list">
                {attentionSubjects.length === 0 && (
                  <p>
                    <IconCircleCheck size={18} /> Your recorded attendance meets the
                    required level in every subject.
                  </p>
                )}
                {attentionSubjects.map((item) => (
                  <p key={item.offering_id}>
                    <IconAlertCircle size={18} />
                    <span>
                      <strong>
                        {subjectNames.get(item.offering_id) ??
                          `Offering ${item.offering_id}`}
                      </strong>{" "}
                      requires attention: {formatPercentage(item.percentage)} recorded
                      attendance.
                    </span>
                  </p>
                ))}
                {weekToWeekChange !== null && (
                  <p>
                    <IconChartLine size={18} /> Your latest weekly attendance{" "}
                    {weekToWeekChange > 0
                      ? "improved"
                      : weekToWeekChange < 0
                      ? "declined"
                      : "was unchanged"}{" "}
                    compared with the preceding week
                    {weekToWeekChange === 0
                      ? "."
                      : ` (${Math.abs(weekToWeekChange).toFixed(1)} percentage points).`}
                  </p>
                )}
                {totals.excused > 0 && (
                  <p>
                    <IconCalendarStats size={18} /> {totals.excused} excused session
                    {totals.excused === 1 ? " is" : "s are"} included in your attendance
                    total.
                  </p>
                )}
              </div>
            </section>
          </section>
        </>
      )}
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
  tone = "",
  primary = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tone?: string;
  primary?: boolean;
}) {
  return (
    <article className={`analytics-metric ${primary ? "primary" : ""}`}>
      <span className={`metric-icon ${tone}`}>{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Heading({
  title,
  description,
  aside,
}: {
  title: string;
  description: string;
  aside?: string;
}) {
  return (
    <div className="analytics-card-heading">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {aside && <span>{aside}</span>}
    </div>
  );
}
