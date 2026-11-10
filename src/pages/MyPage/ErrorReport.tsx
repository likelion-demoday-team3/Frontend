import { useState } from "react";
import styled from "styled-components";
import MyPageFrame, { Action, Panel } from "./MyPageFrame";
import { getAccessToken } from "../../features/auth/session";
import { submitErrorReport, submitGuestErrorReport } from "../../features/errorReports/api";
import { recentErrors } from "../../features/errorReports/autoCapture";

const MAX_LENGTH = 2000;
const SIGNUP_PLACE = "로그인·회원가입";

const places = [
  "홈 (세션 목록·신청)",
  "세션 (대기실·대화·투표)",
  "결과·연락처",
  "상점·결제",
  "마이페이지",
  SIGNUP_PLACE,
  "기타",
];

/** 회원가입 화면에서 넘어왔으면 (?from=signup&email=...) 가입하려던 학교 메일을 내용에 미리 채운다 */
function initialFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const fromSignup = params.get("from") === "signup";
  const schoolEmail = (params.get("email") ?? "").trim().slice(0, 255);
  return {
    fromSignup,
    content: fromSignup
      ? `학교 메일로 가입이 안 돼요.\n학교 이름: \n가입하려던 메일: ${schoolEmail}`
      : "",
  };
}

/**
 * 오류 제보하기. 적은 내용과 함께 기기 정보·최근 오류 기록을 개발자에게 보낸다.
 * 로그인하지 않았으면 (예: 학교 메일로 가입이 안 될 때) 답변 받을 이메일을 받아 비회원 제보로 보낸다.
 */
export default function ErrorReport() {
  const [initial] = useState(initialFromQuery);
  const [place, setPlace] = useState(initial.fromSignup ? SIGNUP_PLACE : places[0]);
  const [content, setContent] = useState(initial.content);
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const loggedIn = Boolean(getAccessToken());

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const text = content.trim();
    if (!text) {
      setError("어떤 문제가 있었는지 적어주세요.");
      return;
    }
    const contact = contactEmail.trim();
    if (!loggedIn && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      setError("답변 받을 이메일을 정확히 적어주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const recent = recentErrors();
      const report = {
        message: `[${place}] ${text}`,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        detail: [
          `화면 크기: ${window.innerWidth}x${window.innerHeight}`,
          recent.length
            ? `최근 자동 수집된 오류 ${recent.length}개:\n` +
              recent
                .map((item) => `- ${item.at} ${item.message} (${item.pageUrl})`)
                .join("\n")
            : "최근 자동 수집된 오류 없음",
        ].join("\n"),
      };
      if (loggedIn) {
        await submitErrorReport({ kind: "USER", ...report });
      } else {
        await submitGuestErrorReport({ contactEmail: contact, ...report });
      }
      setContent("");
      setMessage(
        loggedIn
          ? "제보해 주셔서 고마워요. 확인하고 빠르게 고칠게요."
          : "제보해 주셔서 고마워요. 확인하고 적어주신 이메일로 알려드릴게요.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "제보를 보내지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const backHref = loggedIn ? "/mypage" : initial.fromSignup ? "/signup" : "/home";

  return (
    <MyPageFrame title="오류 제보" backHref={backHref}>
      <Panel>
        <h2>어떤 문제가 있었나요?</h2>
        <Form onSubmit={(event) => void submit(event)}>
          {!loggedIn && (
            <label>
              답변 받을 이메일
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={contactEmail}
                maxLength={255}
                placeholder="자주 확인하는 이메일 (예: name@gmail.com)"
                onChange={(event) => setContactEmail(event.target.value)}
              />
            </label>
          )}
          <label>
            문제가 생긴 화면
            <select value={place} onChange={(event) => setPlace(event.target.value)}>
              {places.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            내용
            <textarea
              value={content}
              maxLength={MAX_LENGTH}
              rows={7}
              placeholder="예) 두 번째 대화가 시작됐는데 상대 목소리가 들리지 않았어요. 언제, 무엇을 하다가 생겼는지 적어주시면 빨리 고칠 수 있어요."
              onChange={(event) => setContent(event.target.value)}
            />
            <span className="count">
              {content.length} / {MAX_LENGTH}
            </span>
          </label>
          <p className="hint">
            빠른 확인을 위해 사용 중인 기기·브라우저 정보와 최근 발생한 오류 기록이 함께 전달돼요.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="success" role="status">
              {message}
            </p>
          )}
          <Action type="submit" disabled={submitting}>
            {submitting ? "보내는 중…" : "제보하기"}
          </Action>
        </Form>
      </Panel>
    </MyPageFrame>
  );
}

const Form = styled.form`
  display: grid;
  gap: 1.4rem;
  label {
    display: grid;
    gap: 0.7rem;
    color: #536057;
    font-size: 1.25rem;
    font-weight: 600;
  }
  input,
  select,
  textarea {
    width: 100%;
    padding: 1.1rem 1.2rem;
    border: 0.1rem solid #dfe5dc;
    border-radius: 1rem;
    background: #fff;
    color: var(--ink);
    font: 400 1.35rem/1.6 var(--font-body);
  }
  input,
  select {
    min-height: 4.6rem;
  }
  textarea {
    resize: vertical;
  }
  .count {
    justify-self: end;
    color: #8a938b;
    font-size: 1.05rem;
    font-weight: 400;
  }
  .hint {
    margin: 0;
  }
  .error,
  .success {
    margin: 0;
  }
`;
