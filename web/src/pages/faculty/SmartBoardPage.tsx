import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../auth/AuthProvider";
import { tokenStore } from "../../auth/storage";

type Qr = { session_id: number; step: number; token: string; expires_at: string };
type Session = { id: number; status: string; opened_at?: string | null; close_at?: string | null; scheduled_start?: string | null; scheduled_end?: string | null };
type Count = { accepted: number; enrolled: number };
type BoardEvent = { type: string; status?: string; token?: string; step?: number; expires_at?: string; accepted?: number; enrolled?: number };

export function SmartBoardPage() {
  const { id } = useParams(); const sessionId = Number(id); const { api } = useAuth(); const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null); const [qr, setQr] = useState<Qr | null>(null); const [count, setCount] = useState<Count>({ accepted: 0, enrolled: 0 }); const [now, setNow] = useState(Date.now()); const [live, setLive] = useState(false);
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  async function refresh() {
    const [nextSession, nextCount] = await Promise.all([
      api.request<Session>(`/attendance/sessions/${sessionId}`),
      api.request<Count>(`/attendance/sessions/${sessionId}/count`),
    ]);
    setSession(nextSession);
    setCount(nextCount);
    if (nextSession.status === "OPEN") setQr(await api.request<Qr>(`/attendance/sessions/${sessionId}/qr`));
    else setQr(null);
  }
  useEffect(() => { void refresh(); const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [sessionId]);
  useEffect(() => {
    let socket: WebSocket | null = null; let pollTimer = 0; let reconnectTimer = 0; let disposed = false;
    const poll = () => { void refresh().catch(() => undefined); pollTimer = window.setTimeout(poll, 2000); };
    const connect = () => {
      if (disposed) return;
      const accessToken = tokenStore.getAccessToken();
      const query = accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : "";
      socket = new WebSocket(`${base.replace(/^http/, "ws")}/ws/sessions/${sessionId}${query}`);
      socket.onopen = () => { setLive(true); window.clearTimeout(reconnectTimer); window.clearTimeout(pollTimer); };
      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as BoardEvent;
          if (event.type === "qr.rotated" && event.token && event.expires_at) setQr({ session_id: sessionId, step: event.step ?? 0, token: event.token, expires_at: event.expires_at });
          if (event.type === "count.updated") setCount({ accepted: event.accepted ?? 0, enrolled: event.enrolled ?? 0 });
          if (event.type === "session.state" && event.status) setSession((current) => current ? { ...current, status: event.status! } : current);
        } catch { return; }
      };
      socket.onclose = () => { setLive(false); poll(); reconnectTimer = window.setTimeout(connect, 2000); };
      socket.onerror = () => socket?.close();
    };
    connect();
    return () => { disposed = true; socket?.close(); window.clearTimeout(pollTimer); window.clearTimeout(reconnectTimer); };
  }, [sessionId]);
  const qrValue = qr ? `A1.${sessionId}.${qr.token}` : "";
  const seconds = qr ? Math.max(0, Math.ceil((new Date(qr.expires_at).getTime() - now) / 1000)) : 0;
  const closeSeconds = session?.close_at ? Math.max(0, Math.ceil((new Date(session.close_at).getTime() - now) / 1000)) : 0;
  async function close() { await api.request(`/attendance/sessions/${sessionId}/CLOSED`, { method: "POST" }); await refresh(); }
  return <main className="smart-board"><header><div><h1>Attendance session #{sessionId}</h1><p>{session?.scheduled_start ? new Date(session.scheduled_start).toLocaleString() : "Loading session"}</p></div><span className={live ? "live-indicator" : "offline-indicator"}>● {live ? "Live" : "Polling"}</span></header><section className="board-main">{session?.status === "OPEN" && qrValue && <QRCodeSVG className="board-qr" value={qrValue} size={360} includeMargin />}<p className="board-status">{session?.status === "OPEN" ? "Attendance open" : "Attendance window closed"}</p>{session?.status === "OPEN" && <><p>Code refreshes in <strong>{seconds}s</strong></p><p>Window closes in <strong>{Math.floor(closeSeconds / 60).toString().padStart(2, "0")}:{(closeSeconds % 60).toString().padStart(2, "0")}</strong></p></>}<p>Attendance received: <strong>{count.accepted} / {count.enrolled}</strong></p></section><footer><button onClick={() => void refresh()}>Refresh</button>{session?.status === "OPEN" && <button onClick={() => void close()}>Close now</button>}<button onClick={() => document.documentElement.requestFullscreen?.()}>Fullscreen</button><button onClick={() => navigate("/faculty/sessions")}>Exit</button></footer></main>;
}
