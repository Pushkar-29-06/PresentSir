import { FormEvent, useState } from "react";
import { IconEye, IconEyeOff, IconLock, IconUser } from "@tabler/icons-react";
import { ApiError } from "../api/client";
import { isUiDevMode, useAuth } from "../auth/AuthProvider";

const logoLight = "/logo-light.svg";

function signInMessage(reason: unknown) {
  if (reason instanceof ApiError) {
    if (reason.status === 401) return "Your login ID or password is incorrect.";
    if (reason.status === 422) return "Please check your login details and try again.";
    if (reason.status >= 500) return "The service is unavailable. Please try again shortly.";
    return "We could not sign you in. Please try again.";
  }

  return "Unable to reach the service. Check your connection and try again.";
}

export function LoginPage() {
  const { signIn } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ loginId: false, password: false });
  const devMode = isUiDevMode();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await signIn(loginId, password);
    } catch (reason) {
      setError(signInMessage(reason));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="login-page" aria-labelledby="login-heading">
      <div className="login-card-container">
        <section className="login-introduction" aria-label="PresentSir introduction">
          <div className="login-logo-wrap">
            <img className="login-logo" src={logoLight} alt="PresentSir" />
            <p className="login-product-name">Smart Attendance &amp; Academic Analytics</p>
          </div>
          <div className="login-introduction-inner">
            <div className="login-introduction-copy">
              <p className="login-kicker">Academic operations portal</p>
              <h1 id="login-heading">Attendance, with Clarity.</h1>
              <p>A focused workspace for attendance records, academic insight, and informed follow-up.</p>
            </div>
            <dl className="login-principles">
              <div><dt>Attendance</dt><dd>Secure, session-based records</dd></div>
              <div><dt>Academic insight</dt><dd>Clear information for every role</dd></div>
            </dl>
          </div>
        </section>

        <section className="login-panel" aria-label="Sign in">
          <div className="login-card">
            <header className="login-card-header">
              <p className="login-kicker">Secure access</p>
              <h2>Welcome back</h2>
              <p>Sign in with your college account to continue.</p>
            </header>

            {devMode && <p className="login-dev-notice" role="status">UI development mode is active. Use <code>student</code>, <code>faculty</code>, or <code>admin</code> with any password.</p>}

            <form className="login-form" onSubmit={submit} noValidate aria-busy={isLoading}>
              <div className="login-field">
                <label htmlFor="loginId">Login ID</label>
                <div className={`login-input-wrap ${touched.loginId && !loginId ? 'login-input-error' : ''}`}>
                  <IconUser aria-hidden="true" size={19} stroke={1.8} />
                  <input id="loginId" type="text" value={loginId} onChange={(event) => setLoginId(event.target.value)} onBlur={() => setTouched((prev) => ({ ...prev, loginId: true }))} placeholder="Enter your login ID" autoComplete="username" required disabled={isLoading} aria-describedby={error ? "login-error" : undefined} />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="password">Password</label>
                <div className={`login-input-wrap ${touched.password && !password ? 'login-input-error' : ''}`}>
                  <IconLock aria-hidden="true" size={19} stroke={1.8} />
                  <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} onBlur={() => setTouched((prev) => ({ ...prev, password: true }))} placeholder="Enter your password" autoComplete="current-password" required disabled={isLoading} aria-describedby={error ? "login-error" : undefined} />
                  <button type="button" className="login-password-toggle" onClick={() => setShowPassword((visible) => !visible)} disabled={isLoading} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <IconEyeOff aria-hidden="true" size={19} /> : <IconEye aria-hidden="true" size={19} />}
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginTop: '-4px' }}>
                <a href="#" style={{ fontSize: '13px', color: '#0b5fb5', textDecoration: 'none' }}>Forgot password?</a>
              </div>

              {error && (
                <div className="login-error" id="login-error" role="alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              <button className="login-submit" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <span className="login-spinner">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Signing in…
                  </span>
                ) : "Sign in"}
              </button>
            </form>

            <footer className="login-card-footer">Use the account issued by your Institution.</footer>
          </div>
        </section>
      </div>
    </main>
  );
}
