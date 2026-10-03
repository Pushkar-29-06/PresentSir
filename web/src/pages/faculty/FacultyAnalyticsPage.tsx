import { useEffect, useMemo, useState } from "react";
import {
  IconAlertTriangle,
  IconChartLine,
  IconClock,
  IconUsers,
  IconRefresh,
  IconShieldCheck,
  IconUserCheck,
  IconX,
} from "@tabler/icons-react";
import { useAuth } from "../../auth/AuthProvider";

type Slot = {
  offering_id: number;
  course_code: string;
  course_name: string;
};

type OfferingSummary = {
  offering_id: number;
  sessions_held: number;
  enrolled_students: number;
  total_records: number;
  present_records: number;
  absent_records: number;
  attendance_percentage: number;
};

type WeeklyTrendPoint = {
  week_start: string;
  sessions: number;
  present: number;
  absent: number;
  percentage: number;
};

type EarlyWarning = {
  student_id: number;
  offering_id: number;
  percentage: number;
  shortage: number;
};

type RiskQueueItem = {
  id: number;
  session_id: number | null;
  student_id: number | null;
  kind: string | null;
  score: number | null;
  level: string | null;
  status: string | null;
  reasons: Record<string, unknown> | null;
};

const formatPercentage = (value: number): string => `${value.toFixed(1)}%`;

const formatDateLabel = (value: string): string =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(`${value}T00:00:00`)
  );

export function FacultyAnalyticsPage() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offeringId, setOfferingId] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [summary, setSummary] = useState<OfferingSummary | null>(null);
  const [trend, setTrend] = useState<WeeklyTrendPoint[]>([]);
  const [earlyWarnings, setEarlyWarnings] = useState<EarlyWarning[]>([]);
  const [flags, setFlags] = useState<RiskQueueItem[]>([]);

  async function loadOfferings() {
    try {
      const nextSlots = await api.request<Slot[]>("/faculty/slots");
      setSlots(nextSlots);
      if (!offeringId && nextSlots.length > 0) {
        setOfferingId(String(nextSlots[0].offering_id));
      }
    } catch {
      setError("Unable to load faculty offerings.");
    }
  }

  async function loadAnalytics() {
    if (!offeringId) return;
    setLoading(true);
    setError("");
    try {
      const [summaryData, trendData, warningsData, flagsData] = await Promise.all([
        api.request<OfferingSummary>(`/analytics/offerings/${offeringId}/summary`),
        api.request<WeeklyTrendPoint[]>(`/analytics/offerings/${offeringId}/trend`),
        api.request<EarlyWarning[]>("/analytics/early-warnings?threshold=75"),
        api.request<RiskQueueItem[]>("/analytics/risk/queue?status=OPEN"),
      ]);
      setSummary(summaryData);
      setTrend(trendData);
      setEarlyWarnings(warningsData.filter((w) => w.offering_id === Number(offeringId)));
      setFlags(flagsData);
    } catch {
      setError("Unable to load analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOfferings();
  }, []);

  useEffect(() => {
    if (offeringId) {
      void loadAnalytics();
    }
  }, [offeringId]);

  const offerings = useMemo(
    () => Array.from(new Map(slots.map((slot) => [slot.offering_id, slot])).values()),
    [slots]
  );

  const selectedOffering = offerings.find((o) => o.offering_id === Number(offeringId));

  const courseWarnings = useMemo(
    () => earlyWarnings.filter((w) => w.offering_id === Number(offeringId)),
    [earlyWarnings, offeringId]
  );

  const trendPoints = trend
    .map(
      (item, index) =>
        `${trend.length === 1 ? 50 : (index / (trend.length - 1)) * 100},${
          100 - item.percentage
        }`
    )
    .join(" ");

  const weekToWeekChange =
    trend.length > 1 ? trend.at(-1)!.percentage - trend.at(-2)!.percentage : null;

  return (
    <main className="student-page faculty-analytics-page">
      <header className="faculty-analytics-header">
        <div>
          <span className="analytics-eyebrow">Faculty performance</span>
          <h2>Faculty Analytics</h2>
          <p>
            Monitor attendance performance, trends, shortages and students requiring
            attention.
          </p>
        </div>
        <div className="course-selector">
          <label htmlFor="offering-select">Course</label>
          <select
            id="offering-select"
            value={offeringId}
            onChange={(e) => setOfferingId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select a course</option>
            {offerings.map((offering) => (
              <option key={offering.offering_id} value={String(offering.offering_id)}>
                {offering.course_code} — {offering.course_name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {error && <p className="error-message" role="alert">{error}</p>}

      {loading ? (
        <section className="content-card analytics-loading" aria-live="polite">
          Loading analytics…
        </section>
      ) : !offeringId ? (
        <section className="content-card analytics-empty">
          <IconChartLine size={28} />
          <h3>Select a course</h3>
          <p>Choose a course from the dropdown to view attendance analytics.</p>
        </section>
      ) : (
        <>
          {summary && (
            <section className="analytics-overview-grid" aria-label="Course overview">
              <Metric
                icon={<IconChartLine size={20} />}
                label="Overall attendance"
                value={formatPercentage(summary.attendance_percentage)}
                note={`${summary.total_records} total records`}
                primary
              />
              <Metric
                icon={<IconUsers size={20} />}
                label="Enrolled students"
                value={String(summary.enrolled_students)}
                note={`${summary.present_records} present records`}
                tone="positive"
              />
              <Metric
                icon={<IconClock size={20} />}
                label="Sessions held"
                value={String(summary.sessions_held)}
                note={`${summary.absent_records} absent records`}
                tone="neutral"
              />
              <Metric
                icon={
                  courseWarnings.length > 0 ? (
                    <IconAlertTriangle size={20} />
                  ) : (
                    <IconUserCheck size={20} />
                  )
                }
                label="Students below threshold"
                value={String(courseWarnings.length)}
                note={
                  courseWarnings.length > 0
                    ? "Attendance requires attention"
                    : "All students on track"
                }
                tone={courseWarnings.length > 0 ? "warning" : "positive"}
              />
            </section>
          )}

          {trend.length > 0 && (
            <section className="content-card trend-card">
              <CardHeading
                title="Attendance trend"
                description="Weekly attendance percentage over time."
                aside={
                  weekToWeekChange !== null
                    ? weekToWeekChange > 0
                      ? `↑ ${weekToWeekChange.toFixed(1)} pts this week`
                      : weekToWeekChange < 0
                      ? `↓ ${Math.abs(weekToWeekChange).toFixed(1)} pts this week`
                      : "No change this week"
                    : undefined
                }
              />
              <div className="trend-chart-wrap">
                <div className="trend-y-axis" aria-hidden="true">
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
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
                    <line x1="0" y1="25" x2="100" y2="25" />
                    <line x1="0" y1="50" x2="100" y2="50" />
                    <line x1="0" y1="75" x2="100" y2="75" />
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

          {summary && (
            <section className="analytics-detail-grid">
              <section className="content-card">
                <CardHeading
                  title="Course performance"
                  description="Attendance distribution across the course."
                />
                <div className="performance-bars">
                  <div className="bar-row">
                    <span>Present records</span>
                    <div className="bar-track">
                      <i
                        style={{
                          width: `${(summary.present_records / summary.total_records) * 100}%`,
                        }}
                      />
                    </div>
                    <strong>{summary.present_records}</strong>
                  </div>
                  <div className="bar-row">
                    <span>Absent records</span>
                    <div className="bar-track">
                      <i
                        style={{
                          width: `${(summary.absent_records / summary.total_records) * 100}%`,
                        }}
                      />
                    </div>
                    <strong>{summary.absent_records}</strong>
                  </div>
                </div>
              </section>

              <section className="content-card">
                <CardHeading
                  title="Session summary"
                  description="Conducted sessions and student participation."
                />
                <div className="session-stats">
                  <div className="stat-item">
                    <strong>{summary.sessions_held}</strong>
                    <span>Sessions held</span>
                  </div>
                  <div className="stat-item">
                    <strong>{summary.enrolled_students}</strong>
                    <span>Enrolled students</span>
                  </div>
                  <div className="stat-item">
                    <strong>{formatPercentage(summary.attendance_percentage)}</strong>
                    <span>Average attendance</span>
                  </div>
                </div>
              </section>
            </section>
          )}

          {courseWarnings.length > 0 && (
            <section className="content-card shortage-section">
              <CardHeading
                title="Attendance shortage"
                description="Students whose attendance requires attention."
              />
              <div className="shortage-table">
                <table>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Attendance</th>
                      <th>Shortage</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseWarnings.map((warning) => (
                      <tr key={`${warning.student_id}-${warning.offering_id}`}>
                        <td>
                          <strong>Student {warning.student_id}</strong>
                        </td>
                        <td>
                          <span className="attendance-value warning">
                            {formatPercentage(warning.percentage)}
                          </span>
                        </td>
                        <td>
                          <span className="shortage-value">
                            {formatPercentage(warning.shortage)}
                          </span>
                        </td>
                        <td>
                          <span className="status-badge warning">
                            <IconAlertTriangle size={14} /> Requires attention
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {earlyWarnings.length > 0 && (
            <section className="content-card early-warning-section">
              <CardHeading
                title="Early warning"
                description="Students across all courses with attendance below threshold."
              />
              <div className="warning-table">
                <table>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Course</th>
                      <th>Attendance</th>
                      <th>Shortage</th>
                      <th>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earlyWarnings.map((warning) => (
                      <tr key={`${warning.student_id}-${warning.offering_id}`}>
                        <td>
                          <strong>Student {warning.student_id}</strong>
                        </td>
                        <td>Offering {warning.offering_id}</td>
                        <td>
                          <span
                            className={`attendance-value ${
                              warning.shortage > 15 ? "critical" : "warning"
                            }`}
                          >
                            {formatPercentage(warning.percentage)}
                          </span>
                        </td>
                        <td>
                          <span className="shortage-value">
                            {formatPercentage(warning.shortage)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`level-badge ${
                              warning.shortage > 15 ? "high" : "medium"
                            }`}
                          >
                            {warning.shortage > 15 ? "HIGH" : "MEDIUM"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {flags.length > 0 && (
            <section className="content-card review-section">
              <CardHeading
                title="Needs review"
                description="Flags requiring faculty attention and review."
              />
              <div className="review-list">
                {flags.map((flag) => (
                  <div className="review-item" key={flag.id}>
                    <div className="review-info">
                      <div className="review-header">
                        <strong>Flag #{flag.id}</strong>
                        <span
                          className={`level-badge ${
                            flag.level === "HIGH" ? "high" : flag.level === "MEDIUM" ? "medium" : "low"
                          }`}
                        >
                          {flag.level}
                        </span>
                      </div>
                      <div className="review-details">
                        <span>Student {flag.student_id}</span>
                        <span>Session {flag.session_id}</span>
                        <span>Type: {flag.kind}</span>
                        {flag.score !== null && <span>Score: {flag.score.toFixed(2)}</span>}
                      </div>
                      {flag.reasons && Object.keys(flag.reasons).length > 0 && (
                        <div className="review-reasons">
                          {Object.entries(flag.reasons).map(([key, value]) => (
                            <span key={key} className="reason-tag">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`status-badge ${flag.status === "OPEN" ? "open" : "resolved"}`}>
                      {flag.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
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

function CardHeading({
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
