import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import styled from "styled-components";
import { ApiError } from "../features/api/client";
import { sendCode, signup, verifyCode } from "../features/signup/api";
import { setLocalMemberName } from "../features/members/api";
import {
  isBirthDate,
  isCode,
  isEmail,
  isPassword,
  isPhone,
  isSchoolEmail,
} from "../features/signup/validation";

type Step = "email" | "password" | "profile" | "complete";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function normalizeInstagramId(value: string) {
  return value.trim().replace(/^@+/, "");
}

export default function Signup({
  onAuthenticated,
}: {
  onAuthenticated: (token: string) => void;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [signupToken, setSignupToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "">("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagramId, setInstagramId] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errorTitle, setErrorTitle] = useState("입력 내용을 확인해주세요");
  const [expiresAt, setExpiresAt] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [verifiedAt, setVerifiedAt] = useState(0);
  const popup = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const submitting = useRef(false);
  const [currentYear] = useState(() =>
    Number(
      new Intl.DateTimeFormat("en", {
        timeZone: "Asia/Seoul",
        year: "numeric",
      }).format(new Date()),
    ),
  );
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendRemaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const dayCount =
    year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
  const profileValid =
    !!gender &&
    Boolean(name.trim()) &&
    (phone.trim() ? isPhone(phone) : Boolean(instagramId.trim())) &&
    isBirthDate(year, month, day, currentYear);
  const emailValid = isEmail(email);
  const schoolEmail = isSchoolEmail(email);

  useEffect(() => {
    title.current?.focus();
  }, [step]);
  useEffect(() => {
    if (!sent || step !== "email") return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [sent, step]);
  useEffect(() => {
    if (error) popup.current?.showModal();
    else popup.current?.close();
  }, [error]);

  function resetEmail() {
    setSent(false);
    setCode("");
    setSignupToken("");
    setVerifiedAt(0);
  }
  async function requestCode() {
    await sendCode(email.trim());
    const time = Date.now();
    setNow(time);
    setExpiresAt(time + 300000);
    setResendAt(time + 60000);
    setSent(true);
    setCode("");
  }
  async function run(action: () => Promise<void>) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      await action();
    } catch (cause) {
      const code = cause instanceof ApiError ? cause.code.toUpperCase() : "";
      const message = cause instanceof Error ? cause.message : "";
      const unsupportedSchool =
        /UNSUPPORTED_(SCHOOL|UNIVERSITY|EMAIL_DOMAIN)|SCHOOL_NOT_SUPPORTED|UNIVERSITY_NOT_SUPPORTED|EMAIL_DOMAIN_NOT_SUPPORTED|NOT_SUPPORTED_(SCHOOL|UNIVERSITY)/.test(
          code,
        ) ||
        /지원하지 않는 학교|지원 학교가 아니|참여 가능한 학교|학교가 아직 지원되지 않|등록되지 않은 학교|가입할 수 있는 학교 이메일이 아닙니다|가입 가능한 학교 이메일이 아닙니다/i.test(
          message,
        );
      if (unsupportedSchool) {
        setErrorTitle("아직 가입할 수 없는 학교예요");
        setError(
          "더 많은 학교에서 Kiiwee를 이용하실 수 있도록 준비하고 있으니 조금만 기다려주세요!\n\n",
        );
      } else {
        setErrorTitle("입력 내용을 확인해주세요");
        setError(message || "다시 시도해주세요.");
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  function submitEmail(event: FormEvent) {
    event.preventDefault();
    if (!emailValid || (sent && !isCode(code))) return;
    void run(async () => {
      if (!sent) {
        await requestCode();
        return;
      }
      if (Date.now() >= expiresAt)
        throw new Error("인증번호가 만료됐어요. 인증번호를 다시 보내주세요.");
      try {
        const token = await verifyCode(email.trim(), code);
        setSignupToken(token);
        setVerifiedAt(Date.now());
        setCode("");
        setStep("password");
      } catch (cause) {
        throw cause;
      }
    });
  }
  function submitPassword(event: FormEvent) {
    event.preventDefault();
    if (!isPassword(password) || !confirmation) return;
    if (password !== confirmation) {
      setError("비밀번호가 일치하지 않습니다. 다시 확인해주세요.");
      return;
    }
    setStep("profile");
  }
  function submitProfile(event: FormEvent) {
    event.preventDefault();
    if (!profileValid || !gender) return;
    const selectedGender = gender;
    void run(async () => {
      if (Date.now() - verifiedAt >= 1800000) {
        resetEmail();
        setStep("email");
        throw new Error(
          "가입 시간이 지났어요. 이메일 인증을 다시 진행해주세요.",
        );
      }
      try {
        const result = await signup({
          signupToken,
          password,
          gender: selectedGender,
          birthDate: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
          ...(phone.trim() ? { phoneNumber: phone.replace(/-/g, "") } : {}),
          ...(instagramId.trim() ? { instagramId: `@${normalizeInstagramId(instagramId)}` } : {}),
        });
        setLocalMemberName(email, name);
        onAuthenticated(result.accessToken);
        setPassword("");
        setConfirmation("");
        setSignupToken("");
        setStep("complete");
      } catch (cause) {
        if (cause instanceof ApiError && cause.code === "LOGIN_FAILED") {
          resetEmail();
          setStep("email");
        }
        throw cause;
      }
    });
  }

  return (
    <SignupPage>
      <a
        className="signup-back"
        href="/login"
        aria-label="로그인 화면으로 돌아가기"
      >
        ‹
      </a>
      {step === "complete" ? (
        <section className="signup-success">
          <img src="/kw1.svg" alt="가입을 축하하는 키위 캐릭터" />
          <h1 ref={title} tabIndex={-1}>
            가입을 축하해요!
          </h1>
          <p>Kiiwee에서 새로운 인연을 만나보세요.</p>
          <a className="signup-primary signup-start" href="/home">
            Kiiwee 시작하기
          </a>
        </section>
      ) : (
        <>
          <h1 className="signup-title" ref={title} tabIndex={-1}>
            회원가입
          </h1>
          {step === "email" && (
            <form onSubmit={submitEmail} noValidate>
              <label className="signup-field">
                학교 이메일
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="이메일을 입력해주세요"
                  value={email}
                  maxLength={254}
                  disabled={busy}
                  onChange={(event) => {
                    const nextEmail = event.target.value;
                    if (sent && nextEmail !== email) resetEmail();
                    setEmail(nextEmail);
                  }}
                />
              </label>
              {!sent && email && (!emailValid || !schoolEmail) && (
                <p className="signup-email-error" role="alert">
                  {!emailValid
                    ? "올바른 이메일 주소를 입력해주세요."
                    : "가입할 수 있는 이메일이 아닙니다. 소속 학교 이메일을 써주세요."}
                </p>
              )}
              {sent && (
                <>
                  <label className="signup-field" htmlFor="signup-code">
                    인증 번호
                  </label>
                  <div className="signup-code-input-wrap">
                    <input
                      id="signup-code"
                      autoFocus
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="6자리 인증번호를 입력해주세요"
                      maxLength={6}
                      value={code}
                      disabled={busy}
                      onChange={(event) =>
                        setCode(event.target.value.replace(/\D/g, ""))
                      }
                    />
                    <button
                      type="button"
                      disabled={busy || resendRemaining > 0}
                      onClick={() => void run(requestCode)}
                    >
                      재전송
                      {resendRemaining > 0 ? ` (${resendRemaining}초)` : ""}
                    </button>
                  </div>
                  <div className="signup-code-tools">
                    <span>
                      {remaining > 0
                        ? `남은 시간 ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                        : "인증번호가 만료되었어요"}
                    </span>
                  </div>
                </>
              )}
              <button
                className="signup-primary"
                disabled={
                  busy ||
                  !schoolEmail ||
                  (sent && (!isCode(code) || remaining === 0))
                }
              >
                {busy
                  ? "처리 중…"
                  : sent
                    ? "대학생 인증하기"
                    : "이메일 인증번호 보내기"}
              </button>
              <p className="signup-hint" role="status">
                {sent
                  ? "학교 이메일로 받은 인증번호를 입력해주세요."
                  : "학교 이메일로 인증해주세요. 지원 학교 여부는 서버에서 확인합니다."}
              </p>
            </form>
          )}
          {step === "password" && (
            <form onSubmit={submitPassword} noValidate>
              <label className="signup-field">
                학교 이메일
                <input type="email" value={email.trim()} readOnly />
              </label>
              <label className="signup-field">
                비밀번호
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="8~64자 비밀번호"
                  minLength={8}
                  maxLength={64}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <label className="signup-field">
                비밀번호 재입력
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="비밀번호를 다시 입력해주세요"
                  maxLength={64}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </label>
              <button
                className="signup-primary"
                disabled={!isPassword(password) || !confirmation}
              >
                다음
              </button>
              <p className="signup-hint">비밀번호는 8~64자로 입력해주세요.</p>
            </form>
          )}
          {step === "profile" && (
            <form onSubmit={submitProfile} noValidate>
              <label className="signup-field">
                이름
                <input
                  type="text"
                  autoComplete="name"
                  maxLength={30}
                  value={name}
                  disabled={busy}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="이름을 입력해주세요"
                />
              </label>
              <fieldset className="signup-gender" disabled={busy}>
                <legend>성별</legend>
                <div>
                  {(["MALE", "FEMALE"] as const).map((value) => (
                    <label
                      className={gender === value ? "selected" : ""}
                      key={value}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={value}
                        checked={gender === value}
                        onChange={() => setGender(value)}
                      />
                      <span>{value === "MALE" ? "남자" : "여자"}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="signup-field">
                전화번호
                <input
                  type="tel"
                  autoComplete="tel-national"
                  placeholder="010-0000-0000"
                  maxLength={13}
                  value={phone}
                  disabled={busy}
                  onChange={(event) =>
                    setPhone(formatPhone(event.target.value))
                  }
                />
              </label>
              {phone && !isPhone(phone) && (
                <p className="signup-hint">
                  010으로 시작하는 11자리 번호를 입력해주세요.
                </p>
              )}
              <label className="signup-field">
                인스타그램 아이디
                <span className="signup-instagram-input">
                  <span aria-hidden="true">@</span>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="아이디"
                    maxLength={29}
                    value={normalizeInstagramId(instagramId)}
                    disabled={busy}
                    onChange={(event) => setInstagramId(normalizeInstagramId(event.target.value))}
                  />
                </span>
              </label>
              {!phone.trim() && !instagramId.trim() && (
                <p className="signup-hint">
                  전화번호 또는 인스타그램 아이디 중 하나를 입력해주세요.
                </p>
              )}
              <fieldset className="signup-birth" disabled={busy}>
                <legend>생년월일</legend>
                <div>
                  <label className="signup-select">
                    <select
                      aria-label="태어난 연도"
                      value={year}
                      onChange={(event) => {
                        setYear(event.target.value);
                        setDay("");
                      }}
                    >
                      <option value="">YYYY</option>
                      {Array.from(
                        { length: 9 },
                        (_, index) => currentYear - 19 - index,
                      ).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <span aria-hidden="true" />
                  </label>
                  <label className="signup-select">
                    <select
                      aria-label="태어난 월"
                      value={month}
                      onChange={(event) => {
                        setMonth(event.target.value);
                        setDay("");
                      }}
                    >
                      <option value="">MM</option>
                      {Array.from({ length: 12 }, (_, index) => index + 1).map(
                        (value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ),
                      )}
                    </select>
                    <span aria-hidden="true" />
                  </label>
                  <label className="signup-select">
                    <select
                      aria-label="태어난 일"
                      value={day}
                      onChange={(event) => setDay(event.target.value)}
                    >
                      <option value="">DD</option>
                      {Array.from(
                        { length: dayCount },
                        (_, index) => index + 1,
                      ).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <span aria-hidden="true" />
                  </label>
                </div>
              </fieldset>
              <button
                className="signup-primary"
                disabled={!profileValid || busy}
              >
                {busy ? "가입 중…" : "회원가입"}
              </button>
              <p className="signup-hint">
                한국 나이 20~28세만 가입할 수 있어요. 전화번호와 인스타그램 중
                하나는 연락처로 등록해주세요.
              </p>
              <button
                type="button"
                className="signup-text-button"
                disabled={busy}
                onClick={() => setStep("password")}
              >
                비밀번호 다시 설정하기
              </button>
            </form>
          )}
        </>
      )}
      <dialog
        ref={popup}
        className="signup-alert"
        role="alertdialog"
        aria-labelledby="signup-alert-title"
        onCancel={() => setError("")}
      >
        <h2 id="signup-alert-title">{errorTitle}</h2>
        <p>{error}</p>
        {errorTitle === "아직 가입할 수 없는 학교예요" && (
          <p className="signup-alert-schools">
            현재 참여 가능한 학교<br />
            서강대학교 · 연세대학교 · 이화여자대학교 · 홍익대학교
          </p>
        )}
        <button
          autoFocus
          className="signup-primary"
          onClick={() => setError("")}
        >
          확인
        </button>
      </dialog>
    </SignupPage>
  );
}

const SignupPage = styled.main`
  width: 100%;
  max-width: 43rem;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  padding: calc(2.4rem + env(safe-area-inset-top)) 3rem
    calc(4rem + env(safe-area-inset-bottom));
  background: var(--background);
  box-shadow: 0 0 6rem #26372508;

  .signup-back {
    display: inline-grid;
    place-items: center;
    width: 3.6rem;
    height: 3.6rem;
    margin-left: -1rem;
    color: var(--ink);
    font-size: 3.2rem;
    text-decoration: none;
  }
  .signup-title {
    font: 400 4.6rem/1.25 var(--display-font);
    margin: 2.5rem 0 2.7rem;
    letter-spacing: -0.1rem;
  }
  .signup-title:focus,
  .signup-success h1:focus {
    outline: none;
  }
  .signup-field {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    margin-bottom: 1.4rem;
    font-size: 1.6rem;
    font-weight: 600;
  }

  .signup-field input,
  .signup-birth select {
    width: 100%;
    min-width: 0;
    height: 4.9rem;
    padding: 1.2rem 1.7rem;
    border: 0.1rem solid var(--ink);
    border-radius: 0.9rem;
    background: var(--white);
    color: var(--ink);
    font: 400 1.6rem/1.4 var(--font-body);
  }

  .signup-instagram-input {
    display: flex;
    align-items: center;
    height: 4.9rem;
    padding: 0 1.7rem;
    border: 0.1rem solid var(--ink);
    border-radius: 0.9rem;
    background: var(--white);
    color: var(--ink);
    font: 400 1.6rem/1.4 var(--font-body);
  }
  .signup-instagram-input:focus-within {
    outline: 0.2rem solid var(--focus);
    outline-offset: 0.2rem;
  }
  .signup-instagram-input input {
    height: 100%;
    padding: 1.2rem 0.5rem;
    border: 0;
    outline: none;
    background: transparent;
  }

  .signup-field input::placeholder {
    color: var(--text-placeholder);
  }
  .signup-field input:focus,
  .signup-birth select:focus {
    outline: 0.2rem solid var(--focus);
    outline-offset: 0.2rem;
  }
  .signup-code-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .signup-code-input-wrap input {
    width: 100%;
    min-width: 0;
    height: 4.9rem;
    padding: 1.2rem 10.5rem 1.2rem 1.7rem;
    border: 0.1rem solid var(--ink);
    border-radius: 0.9rem;
    background: var(--white);
    color: var(--ink);
    font: 400 1.6rem/1.4 var(--font-body);
  }
  .signup-code-input-wrap input::placeholder {
    color: var(--text-placeholder);
  }
  .signup-code-input-wrap input:focus {
    outline: 0.2rem solid var(--focus);
    outline-offset: 0.2rem;
  }
  .signup-code-input-wrap button {
    position: absolute;
    right: 0.8rem;
    max-width: 9.5rem;
    padding: 0.7rem 0.8rem;
    border: 0;
    border-radius: 0.7rem;
    background: var(--white);
    color: var(--ink);
    font: 500 1.2rem/1.3 var(--font-body);
    white-space: nowrap;
  }
  .signup-code-input-wrap button:disabled {
    color: var(--text-placeholder);
  }
  .signup-primary {
    display: block;
    width: 100%;
    min-height: 4.8rem;
    padding: 1.2rem;
    border: 0;
    border-radius: 0.9rem;
    background: var(--green);
    color: var(--ink);
    font: 400 1.6rem/1.5 var(--font-body);
    text-align: center;
    cursor: pointer;
  }
  .signup-primary:disabled {
    background: var(--control-disabled);
    color: var(--text-placeholder);
    cursor: default;
  }
  .signup-hint {
    margin: 1rem 0 1.4rem;
    color: var(--text-secondary);
    font-size: 1.2rem;
    line-height: 1.6;
  }
  .signup-email-error {
    margin: -0.3rem 0 1.2rem;
    color: #d84f4f;
    font-size: 1.2rem;
    line-height: 1.6;
  }
  .signup-code-tools {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.8rem;
    margin: -0.3rem 0 1.2rem;
    font-size: 1.2rem;
    color: var(--text-secondary);
    margin-top: 1rem;
  }
  .signup-text-button {
    background: none;
    border: 0;
    padding: 0.7rem 0;
    text-decoration: underline;
    font-size: 1.2rem;
  }
  .signup-text-button {
    display: block;
    margin: 0.9rem auto 0;
  }
  .signup-gender,
  .signup-birth {
    padding: 0;
    border: 0;
    margin: 0 0 1.4rem;
    min-width: 0;
  }
  .signup-gender legend,
  .signup-birth legend {
    font-size: 1.6rem;
    font-weight: 600;
    margin-bottom: 0.9rem;
  }
  .signup-gender > div {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.2rem;
  }
  .signup-gender label {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 4.9rem;
    border: 0.1rem solid var(--ink);
    border-radius: 0.9rem;
    background: var(--white);
    color: var(--text-placeholder);
    cursor: pointer;
  }
  .signup-gender label.selected {
    background: var(--green);
    color: var(--ink);
  }
  .signup-gender input {
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    cursor: pointer;
  }
  .signup-gender label:focus-within {
    outline: none;
  }
  .signup-birth > div {
    display: grid;
    grid-template-columns: 1.3fr 1fr 1fr;
    gap: 0.8rem;
  }
  .signup-select {
    position: relative;
    display: block;
    min-width: 0;
    cursor: pointer;
  }
  .signup-birth select {
    padding: 1rem 3.6rem 1rem 1.7rem;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
  }
  .signup-select > span {
    position: absolute;
    top: 50%;
    right: 1.2rem;
    width: 0;
    height: 0;
    border-top: 0.7rem solid var(--ink);
    border-right: 0.55rem solid transparent;
    border-left: 0.55rem solid transparent;
    transform: translateY(-35%);
    pointer-events: none;
  }

  .signup-alert {
    width: min(34rem, calc(100vw - 4.8rem));
    padding: 2.5rem;
    border: 0;
    border-radius: 2.4rem;
    background: var(--background);
    color: var(--ink);
  }
  .signup-alert::backdrop {
    background: #222b2566;
  }
  .signup-alert h2 {
    font: 400 2.3rem/1.4 var(--display-font);
  }
  .signup-alert p {
    margin: 1.5rem 0 2.3rem;
    font-size: 1.5rem;
    line-height: 1.6;
    white-space: pre-line;
  }
  .signup-alert .signup-alert-schools {
    margin-top: -1rem;
    color: var(--text-placeholder);
    font-size: 1.1rem;
    line-height: 1.6;
  }
  .signup-success {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 6.5rem;
    text-align: center;
  }
  .signup-success img {
    width: 19rem;
    max-width: 80%;
    height: 18rem;
    object-fit: contain;
    margin-bottom: 3rem;
  }
  .signup-success h1 {
    font: 400 3.4rem/1.35 var(--display-font);
    overflow-wrap: anywhere;
  }
  .signup-success > p {
    margin-top: 1.8rem;
    font-size: 1.4rem;
    line-height: 1.6;
  }
  .signup-start {
    margin-top: 3.5rem;
    text-decoration: none;
  }

  @media (max-width: 37.4rem) {
    .signup-title {
      font-size: 4.2rem;
    }
  }
`;
