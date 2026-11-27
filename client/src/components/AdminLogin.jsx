import { useState } from "react";
import { Link } from "react-router-dom";

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      await onLogin(password);
    } catch (e) {
      setError(e.status === 401 ? "비밀번호가 일치하지 않습니다. 다시 입력해 주세요." : e.message);
      setBusy(false);
    }
  }

  return (
    <div className="admin admin-login">
      <form className="login-card" onSubmit={submit} noValidate>
        <div className="login-head">
          <span className="login-logo" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
            </svg>
          </span>
          <div>
            <h1>IceGuard 관제 시스템</h1>
            <p>관리자 전용 · 인증이 필요합니다</p>
          </div>
        </div>

        <label htmlFor="admin-pw">관리자 비밀번호</label>
        <div className={`pw-field${error ? " has-error" : ""}`}>
          <input
            id="admin-pw"
            type={show ? "text" : "password"}
            value={password}
            autoComplete="current-password"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "admin-pw-error" : undefined}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show}>
            {show ? "숨기기" : "보기"}
          </button>
        </div>
        {error && (
          <p id="admin-pw-error" className="login-error" role="alert">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v6" />
              <path d="M12 16.5v.2" />
            </svg>
            {error}
          </p>
        )}

        <button type="submit" className="login-submit" disabled={busy || !password}>
          {busy ? "확인 중…" : "로그인"}
        </button>
        <Link className="login-back" to="/">
          사용자 지도로 돌아가기
        </Link>
      </form>
    </div>
  );
}
