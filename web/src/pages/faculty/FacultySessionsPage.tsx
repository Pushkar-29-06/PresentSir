import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";

type Slot = {
  id: number; offering_id: number; course_code: string; course_name: string;
  day_of_week: number; start_time: string; end_time: string; room: string; active: boolean;
};
type Session = { id: number; status: string; scheduled_start: string; scheduled_end: string; close_at?: string | null };

export function FacultySessionsPage() {
  const { api } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [form, setForm] = useState({ offering_id: "", day_of_week: "1", start_time: "10:30", end_time: "11:30", room: "" });
  const [sessionForm, setSessionForm] = useState({ slot_id: "", session_date: new Date().toISOString().slice(0, 10), topic: "" });
  const [error, setError] = useState("");

  async function load() {
    const [nextSlots, nextSessions] = await Promise.all([
      api.request<Slot[]>("/faculty/slots"),
      api.request<Session[]>("/attendance/sessions"),
    ]);
    setSlots(nextSlots); setSessions(nextSessions);
  }
  useEffect(() => { void load().catch(() => setError("Unable to load faculty sessions.")); }, []);

  async function addSlot(event: FormEvent) {
    event.preventDefault(); setError("");
    try { await api.request("/faculty/slots", { method: "POST", body: JSON.stringify({
      offering_id: Number(form.offering_id), day_of_week: Number(form.day_of_week),
      start_time: form.start_time, end_time: form.end_time, room: form.room,
    }) }); await load(); } catch { setError("Unable to add slot."); }
  }
  async function createSession(event: FormEvent) {
    event.preventDefault(); setError("");
    const slot = slots.find((item) => item.id === Number(sessionForm.slot_id));
    if (!slot) return;
    const start = `${sessionForm.session_date}T${slot.start_time}`;
    const end = `${sessionForm.session_date}T${slot.end_time}`;
    try { await api.request("/attendance/sessions", { method: "POST", body: JSON.stringify({
      slot_id: slot.id, offering_id: slot.offering_id, session_date: sessionForm.session_date,
      scheduled_start: start, scheduled_end: end, topic: sessionForm.topic || null,
      window_seconds: 300, rotation_seconds: 30,
    }) }); await load(); } catch { setError("Unable to create session."); }
  }
  const activeSlots = useMemo(() => slots.filter((slot) => slot.active), [slots]);
  return <div className="feature-page">
    <div className="feature-header"><div><h2>Faculty sessions</h2><p>Manage weekly slots and open attendance sessions.</p></div></div>
    {error && <p role="alert" className="error-message">{error}</p>}
    <div className="feature-columns">
      <section className="content-card"><h3>Add slot</h3><form onSubmit={addSlot} className="feature-form">
        <label>Offering ID<input required value={form.offering_id} onChange={(e) => setForm({ ...form, offering_id: e.target.value })} /></label>
        <label>Day (0 Sunday)<input type="number" min="0" max="6" value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} /></label>
        <label>Start<input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
        <label>End<input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></label>
        <label>Room<input required value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></label>
        <button type="submit">Add slot</button>
      </form></section>
      <section className="content-card"><h3>Create session</h3><form onSubmit={createSession} className="feature-form">
        <label>Slot<select required value={sessionForm.slot_id} onChange={(e) => setSessionForm({ ...sessionForm, slot_id: e.target.value })}><option value="">Select slot</option>{activeSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.course_code} · {slot.room} · {slot.start_time}</option>)}</select></label>
        <label>Date<input type="date" required value={sessionForm.session_date} onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })} /></label>
        <label>Topic (optional)<input value={sessionForm.topic} onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })} /></label>
        <button type="submit">Create scheduled session</button>
      </form></section>
    </div>
    <section className="content-card"><h3>Slots</h3>{slots.map((slot) => <div className="list-row" key={slot.id}><span><strong>{slot.course_code}</strong> {slot.course_name} · {slot.room}</span><small>{slot.start_time}–{slot.end_time} {slot.active ? "Active" : "Inactive"}</small></div>)}</section>
    <section className="content-card"><h3>Sessions</h3>{sessions.map((session) => <div className="list-row" key={session.id}><span>Session #{session.id} · <strong>{session.status}</strong></span><span className="row-actions">{session.status === "SCHEDULED" && <button onClick={() => void api.request(`/attendance/sessions/${session.id}/start`, { method: "POST" }).then(load)}>Start</button>}{session.status === "OPEN" && <Link className="button-link" to={`/faculty/sessions/${session.id}/board`}>Open smart board</Link>}{["CLOSED", "SAVED", "SUBMITTED"].includes(session.status) && <Link className="button-link" to={`/faculty/sessions/${session.id}/review`}>Review</Link>}</span></div>)}</section>
  </div>;
}
