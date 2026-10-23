import { useState } from "react";
import type { FormEvent } from "react";
import styled from "styled-components";
import { login } from "../features/signup/api";

export default function Login({
  onAuthenticated,
}: {
  onAuthenticated: (token: string, remember: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await login(email.trim(), password);
      onAuthenticated(result.accessToken, remember);
      window.history.pushState(null, "", "/home");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "로그인에 실패했어요. 다시 시도해주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <LoginPage>
      <LoginForm onSubmit={submit}>
        <a
          className="login-logo"
          href="/home"
          aria-label="Kiiwee 홈으로"
        >
          <img src="/logo.svg" alt="Kiiwee" />
        </a>
        <label className="login-field">
          아이디
          <input
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="학교 이메일 주소"
            value={email}
            maxLength={254}
            required
            disabled={busy}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="login-field">
          비밀번호
          <input
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            maxLength={64}
            required
            disabled={busy}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="login-remember">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
          <span>자동 로그인</span>
        </label>
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="login-submit"
          type="submit"
          disabled={busy || !email.trim() || !password}
        >
          {busy ? "로그인 중…" : "로그인"}
        </button>
        <a className="login-signup" href="/signup">
          처음이신가요? 회원가입
        </a>
      </LoginForm>
    </LoginPage>
  );
}

const LoginPage = styled.main`
  position: relative;
  display: flex;
  width: 100%;
  max-width: 43rem;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  align-items: center;
  justify-content: center;
  padding: calc(2.4rem + env(safe-area-inset-top)) 3rem calc(2.4rem + env(safe-area-inset-bottom));
  background: var(--background);
  box-shadow: 0 0 6rem #26372508;
`;

const LoginForm = styled.form`
  width: 100%;
  max-width: 43rem;
  padding-top: 0;

  .login-logo {
    display: block;
    width: 90%;
    margin: 0 auto 2.2rem;
  }

  .login-logo img {
    display: block;
    width: 70%;
    height: auto;
    margin: 0 auto;
  }

  .login-field {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    margin-bottom: 1.4rem;
    font-size: 1.6rem;
    font-weight: 600;
  }

  .login-field input {
    width: 100%;
    min-width: 0;
    height: 5rem;
    padding: 1.2rem 1.8rem;
    border: 0.1rem solid var(--ink);
    border-radius: 0.9rem;
    background: var(--white);
    color: var(--ink);
    font: 400 1.6rem/1.4 var(--font-body);
  }

  .login-field input::placeholder {
    color: var(--text-placeholder);
  }
  .login-field input:focus {
    outline: 0.2rem solid var(--focus);
    outline-offset: 0.2rem;
  }

  .login-remember {
    display: flex;
    width: fit-content;
    align-items: center;
    gap: 1rem;
    margin-top: 0.2rem;
    font-size: 1.6rem;
    cursor: pointer;
  }

  .login-remember input {
    appearance: none;
    display: grid;
    width: 2.3rem;
    height: 2.3rem;
    place-content: center;
    margin: 0;
    border: 0.1rem solid var(--ink);
    border-radius: 0.6rem;
    background: var(--white);
    cursor: pointer;
  }

  .login-remember input:checked {
    background: var(--green);
  }
  .login-remember input:checked::after {
    content: "";
    width: 1.1rem;
    height: 0.6rem;
    border-bottom: 0.2rem solid var(--ink);
    border-left: 0.2rem solid var(--ink);
    transform: rotate(-45deg) translateY(-0.1rem);
  }

  .login-submit {
    display: block;
    width: 100%;
    min-height: 5.1rem;
    margin-top: 3.8rem;
    padding: 1.2rem;
    border: 0.1rem solid var(--ink);
    border-radius: 0.9rem;
    background: var(--green);
    color: var(--ink);
    font: 400 1.6rem/1.5 var(--font-body);
  }

  .login-submit:disabled {
    opacity: 0.7;
  }
  .login-signup {
    display: block;
    width: fit-content;
    margin: 2rem auto 0;
    color: var(--text-secondary);
    font-size: 1.4rem;
    text-decoration: none;
  }
  .login-error,
  .login-note {
    margin-top: 1.2rem;
    color: var(--text-danger);
    font-size: 1.3rem;
    line-height: 1.5;
  }
  .login-note {
    color: var(--text-secondary);
  }
`;
