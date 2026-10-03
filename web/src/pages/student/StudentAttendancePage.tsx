import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthProvider";

type Summary = { offering_id: number; sessions_held: number; present: number; absent: number; excused: number; percentage: number; shortage: number };
type Overview = { attendance: Summary[] };
type History = { record_id: number; course_code: string; course_name: string; lecture_date: string; scheduled_start?: string | null; status?: string | null; source?: string | null };
type BrowserKey = { androidId: string; privateKey: JsonWebKey };
const DEVICE_KEY = "presentsir.web.device";

function errorMessage(reason: unknown, fallback: string) {
  if (reason instanceof ApiError && typeof reason.body === "object" && reason.body !== null && "detail" in reason.body) {
    return String(reason.body.detail);
  }
  return fallback;
}

function toPem(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  const base64 = btoa(binary).match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN PUBLIC KEY-----\n${base64}\n-----END PUBLIC KEY-----`;
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function ecdsaSignatureToDer(signature: ArrayBuffer) {
  const bytes = new Uint8Array(signature);
  if (bytes.length !== 64) {
    throw new Error("Unexpected browser signature format.");
  }

  function integerPart(value: Uint8Array) {
    let first = 0;
    while (first < value.length - 1 && value[first] === 0) first += 1;
    const trimmed = value.slice(first);
    return trimmed[0] & 0x80
      ? new Uint8Array([0, ...trimmed])
      : trimmed;
  }

  const r = integerPart(bytes.slice(0, 32));
  const s = integerPart(bytes.slice(32));
  const body = new Uint8Array(4 + r.length + s.length);
  body.set([0x02, r.length], 0);
  body.set(r, 2);
  body.set([0x02, s.length], 2 + r.length);
  body.set(s, 4 + r.length);
  return new Uint8Array([0x30, body.length, ...body]);
}

function getQrParts(value: string) {
  const parts = value.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "A1" || !/^\d+$/.test(parts[1]) || !parts[2]) {
    throw new Error("Scan the QR code shown on the faculty smart board.");
  }
  return { sessionId: Number(parts[1]), token: parts[2] };
}

export function StudentAttendancePage() {
  const { api, user } = useAuth();
  const [summary, setSummary] = useState<Summary[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [deviceReady, setDeviceReady] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);

  async function loadAttendance() {
    if (!user?.id) return;
    const [overview, nextHistory] = await Promise.all([
      api.request<Overview>(`/analytics/students/${user.id}/overview`),
      api.request<History[]>("/attendance/students/me/history"),
    ]);
    setSummary(overview.attendance);
    setHistory(nextHistory);
  }

  useEffect(() => {
    void loadAttendance().catch((reason) => setError(errorMessage(reason, "Unable to load attendance.")));
    setDeviceReady(Boolean(localStorage.getItem(DEVICE_KEY)));
  }, [user?.id]);

  useEffect(() => () => {
    scannerControlsRef.current?.stop();
  }, []);

  async function registerBrowserDevice() {
    setError("");
    setMessage("");
    try {
      const androidId = `web-${crypto.randomUUID()}`;
      const keyPair = await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"],
      );
      const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
      const publicKey = toPem(await crypto.subtle.exportKey("spki", keyPair.publicKey));
      const challengeResponse = await api.request<{ challenge: string }>("/device/register/challenge", {
        method: "POST",
        body: JSON.stringify({ android_id: androidId }),
      });
      const challengeSignature = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        keyPair.privateKey,
        new TextEncoder().encode(`${androidId}:${challengeResponse.challenge}`),
      );
      const derChallengeSignature = ecdsaSignatureToDer(challengeSignature);
      await api.request("/device/register", {
        method: "POST",
        body: JSON.stringify({
          android_id: androidId,
          challenge: challengeResponse.challenge,
          public_key: publicKey,
          signature: btoa(String.fromCharCode(...derChallengeSignature)),
          key_algorithm: "ECDSA",
          device_model: "Web browser",
          app_version: "web-dev",
        }),
      });
      localStorage.setItem(DEVICE_KEY, JSON.stringify({ androidId, privateKey } satisfies BrowserKey));
      setDeviceReady(true);
      setMessage("Browser device registered. You can now submit attendance.");
    } catch (reason) {
      setError(errorMessage(reason, "Device registration failed. Ask an administrator to open a registration window first."));
    }
  }

  async function startScanner() {
    setError("");
    if (!window.isSecureContext) {
      setError("Camera access requires HTTPS. Open the secure project URL, or paste the QR value below.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot access a camera. Paste the QR value below instead.");
      return;
    }
    try {
      setScanning(true);
      const reader = new BrowserQRCodeReader();
      if (!videoRef.current) {
        throw new Error("Camera preview is unavailable. Try again.");
      }
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (result) {
            setQrValue(result.getText());
            controls.stop();
            scannerControlsRef.current = null;
            setScanning(false);
          }
        },
      );
      scannerControlsRef.current = controls;
    } catch (reason) {
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
      setScanning(false);
      if (reason instanceof DOMException && reason.name === "NotAllowedError") {
        setError("Camera permission was denied. Allow camera access in the browser settings, then try again.");
      } else if (reason instanceof DOMException && reason.name === "NotFoundError") {
        setError("No camera was found on this device. Paste the QR value instead.");
      } else {
        setError(errorMessage(reason, "Camera access failed. Paste the QR value instead."));
      }
    }
  }

  function stopScanner() {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setScanning(false);
  }

  async function submitAttendance() {
    setError("");
    setMessage("");
    try {
      const device = JSON.parse(localStorage.getItem(DEVICE_KEY) ?? "null") as BrowserKey | null;
      if (!device) throw new Error("Register this browser device before submitting attendance.");
      const qr = getQrParts(qrValue);
      const privateKey = await crypto.subtle.importKey("jwk", device.privateKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
      const nonce = crypto.randomUUID();
      const proof = `ATT1|${qr.sessionId}|${qr.token}|${device.androidId}|${nonce}`;
      const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        privateKey,
        new TextEncoder().encode(proof),
      );
      const derSignature = ecdsaSignatureToDer(signature);
      await api.request("/attendance/submissions", {
        method: "POST",
        body: JSON.stringify({
          session_id: qr.sessionId,
          android_id: device.androidId,
          qr_token: qr.token,
          client_nonce: nonce,
          signature: btoa(String.fromCharCode(...derSignature)),
          app_version: "web-dev",
        }),
      });
      setMessage("Attendance marked successfully.");
      setQrValue("");
      await loadAttendance();
    } catch (reason) {
      setError(errorMessage(reason, "Attendance could not be marked."));
    }
  }

  return <div className="student-page">
    <header><h2>Attendance</h2><p className="student-notice">Register this browser, then scan the QR code shown by your faculty member.</p></header>
    {error && <p role="alert" className="error-message">{error}</p>}
    {message && <p role="status" className="success-message">{message}</p>}
    <section className="content-card">
      <h3>Mark attendance</h3>
      {!deviceReady ? <button type="button" onClick={() => void registerBrowserDevice()}>Register this browser</button> : <p>Browser device is registered.</p>}
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ width: "100%", maxWidth: 420, display: scanning ? "block" : "none" }}
      />
      <button type="button" onClick={() => void startScanner()} disabled={scanning || !deviceReady}>Scan QR with camera</button>
      {scanning && <button type="button" onClick={stopScanner}>Stop camera</button>}
      <label>Or paste QR value<input value={qrValue} onChange={(event) => setQrValue(event.target.value)} placeholder="A1.session_id.qr_token" disabled={!deviceReady} /></label>
      <button type="button" onClick={() => void submitAttendance()} disabled={!deviceReady || !qrValue}>Submit attendance</button>
    </section>
    <section className="student-card-grid">{summary.map((item) => <article className="student-card" key={item.offering_id}><h3>Course {item.offering_id}</h3><div className="metric-large">{item.percentage.toFixed(1)}%</div><p>Conducted {item.sessions_held} · Attended {item.present}</p><strong className={item.percentage >= 75 ? "good-text" : "warning-text"}>{item.percentage >= 75 ? "On track" : "Shortage"}</strong></article>)}</section>
    <section className="content-card"><h3>Course attendance history</h3><div className="student-history">{history.map((item) => <div className="list-row" key={item.record_id}><span><strong>{item.course_code} — {item.course_name}</strong><small>{item.lecture_date} · {item.scheduled_start ? new Date(item.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</small></span><span className={`status-pill status-${(item.status ?? "pending").toLowerCase()}`}>{item.status ?? "Pending"}</span></div>)}</div></section>
  </div>;
}
