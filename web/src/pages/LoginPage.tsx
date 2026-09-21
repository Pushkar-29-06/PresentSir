import { FormEvent, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export function LoginPage() {
  const { signIn } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    try { await signIn(loginId, password); } catch { setError("Unable to sign in"); }
  }
  return <main><h1>PresentSir</h1><form onSubmit={submit}>
    <label>Login ID<input value={loginId} onChange={(event) => setLoginId(event.target.value)} /></label>
    <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    <button type="submit">Sign in</button>{error && <p role="alert">{error}</p>}
  </form></main>;
}
