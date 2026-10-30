import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {
  applyToSession,
  cancelSession,
  cancelAdminSession,
  getMySessions,
  getSessions,
} from "../../features/sessions/api";
import type { MySession, Session } from "../../features/sessions/types";
import { isAdminToken } from "../../features/auth/session";

type ScaduleProps = {
  selectedDate: Date;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
  sessions: Session[];
  mySessions: MySession[];
  myGender: "MALE" | "FEMALE" | null;
  loading: boolean;
  loadError: string;
  onRetry: () => void;
  onDataChanged: (sessions: Session[], mySessions: MySession[]) => void;
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const dateLabel = (date: Date) =>
  `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdays[date.getDay()]}요일`;

function koreaDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (name: string) =>
    parts.find((item) => item.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function koreaTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function cancellationRefund(session: Session) {
  const hoursLeft =
    (new Date(session.startTime).getTime() - Date.now()) / 3600000;
  if (hoursLeft >= 24) return session.entryFeeGem;
  if (hoursLeft >= 12) return Math.ceil(session.entryFeeGem / 2);
  return 0;
}

function UsersIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM1 20v-4a5 5 0 0 1 10 0v4M20 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM14 12a5 5 0 0 1 8 4v4" />
    </svg>
  );
}

export default function Scadule({
  selectedDate,
  isLoggedIn,
  onLoginRequired,
  sessions,
  mySessions,
  myGender,
  loading,
  loadError,
  onRetry,
  onDataChanged,
}: ScaduleProps) {
  const [submitting, setSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<"apply" | "cancel">(
    "apply",
  );
  const [pending, setPending] = useState<Session | null>(null);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const sessionsForDay = sessions.filter(
    (session) => koreaDateKey(session.startTime) === dateKey(selectedDate),
  );

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!pending) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      lastTrigger.current?.focus();
    };
  }, [pending]);

  async function confirmBooking(session: Session) {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (pendingAction === "apply") {
        const result = await applyToSession(session.sessionId);
        setNotice(
          `신청 완료 · ${result.alias} · 참가비 ${result.chargedGem}개 차감`,
        );
      } else {
        const result = await cancelSession(session.sessionId);
        setNotice(`신청을 취소했어요. ${result.refundedGem}개가 환불됩니다.`);
      }
      const [updatedSessions, updatedMine] = await Promise.all([
        getSessions(),
        getMySessions(),
      ]);
      onDataChanged(updatedSessions, updatedMine);
      setPending(null);
    } catch (cause) {
      setNotice(
        cause instanceof Error
          ? cause.message
          : "신청하지 못했어요. 다시 시도해주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelManagedSession(session: Session) {
    if (submitting || !isAdminToken()) return;
    const confirmed = window.confirm(
      `${koreaTime(session.startTime)} 세션을 취소할까요? 신청자가 있다면 참가비가 전액 환불됩니다.`,
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await cancelAdminSession(session.sessionId);
      const [updatedSessions, updatedMine] = await Promise.all([getSessions(), getMySessions()]);
      onDataChanged(updatedSessions, updatedMine);
      setNotice("세션을 취소했어요.");
    } catch (cause) {
      setNotice(
        cause instanceof Error ? cause.message : "세션을 취소하지 못했어요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startBooking(
    event: React.MouseEvent<HTMLButtonElement>,
    session: Session,
    applied: boolean,
  ) {
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }
    lastTrigger.current = event.currentTarget;
    setPendingAction(applied ? "cancel" : "apply");
    setPending(session);
  }

  return (
    <ScheduleStyles>
      <div className="list-caption">
        <span>{dateLabel(selectedDate)}</span>
      </div>
      <section
        className="session-list"
        aria-label={`${dateLabel(selectedDate)} 세션 목록`}
      >
        {loading && (
          <p className="session-empty" role="status">
            세션을 불러오는 중이에요…
          </p>
        )}
        {!loading && loadError && (
          <div className="session-empty" role="alert">
            <p className="account-error">{loadError}</p>
            <button className="retry-button" onClick={onRetry}>
              다시 불러오기
            </button>
          </div>
        )}
        {!loading && !loadError && sessionsForDay.length === 0 && (
          <p className="session-empty">
            {isLoggedIn
              ? "선택한 날짜에는 신청 가능한 세션이 없어요."
              : "로그인하면 신청 가능한 세션을 확인할 수 있어요."}
          </p>
        )}
        {sessionsForDay.map((session, index) => {
          const myRecord = mySessions.find(
            (item) => item.sessionId === session.sessionId,
          );
          const applied = myRecord?.myStatus === "APPLIED";
          const male = session.capacityPerGender - session.maleRemaining;
          const female = session.capacityPerGender - session.femaleRemaining;
          const remaining = session.maleRemaining + session.femaleRemaining;
          const mySeatRemaining =
            myGender === "MALE"
              ? session.maleRemaining
              : myGender === "FEMALE"
                ? session.femaleRemaining
                : remaining;
          const time = koreaTime(session.startTime);
          const tone = ["dark", "light", "green"][index % 3];
          return (
            <article className={`session-card ${tone}`} key={session.sessionId}>
              <div className="session-top">
                <span
                  className={`session-badge ${remaining > 1 ? "relaxed" : ""}`}
                >
                  {session.status === "READY" ? (
                    <>
                      진행
                      <br />
                      확정
                    </>
                  ) : remaining <= 1 ? (
                    <>
                      마감
                      <br />
                      임박
                    </>
                  ) : (
                    <>
                      모집
                      <br />중
                    </>
                  )}
                </span>
                <div className="session-summary">
                  <h2>
                    {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일{" "}
                    {weekdays[selectedDate.getDay()]}요일 {time}
                  </h2>
                  <p>
                    {session.capacityPerGender}:{session.capacityPerGender} 세션
                    · {remaining}자리 남음
                  </p>
                </div>
                <div className="session-actions">
                  {isLoggedIn && isAdminToken() && (
                    <button
                      className="delete-session-button"
                      type="button"
                      disabled={submitting}
                        onClick={() => void cancelManagedSession(session)}
                    >
                      취소
                    </button>
                  )}
                  <button
                    className="apply-button"
                    disabled={
                      submitting ||
                      (isLoggedIn && !applied && mySeatRemaining === 0) ||
                      session.status !== "RECRUITING"
                    }
                    onClick={(event) => startBooking(event, session, applied)}
                  >
                    {applied
                      ? "신청 취소"
                      : session.status === "READY"
                        ? "모집마감"
                        : isLoggedIn && mySeatRemaining === 0
                          ? "내 성별 마감"
                          : "신청하기"}
                  </button>
                </div>
              </div>
              <div className="capacity-label">
                <span>
                  여자 {female}명 · 남자 {male}명 신청 중
                </span>
                <strong>{remaining}자리 남음</strong>
              </div>
              <div
                className="capacity-track"
                role="meter"
                aria-label="신청 인원"
                aria-valuemin={0}
                aria-valuemax={session.capacityPerGender * 2}
                aria-valuenow={male + female}
              >
                <span
                  style={{
                    width: `${((male + female) / (session.capacityPerGender * 2)) * 100}%`,
                  }}
                />
              </div>
              <div className="capacity-total">
                <UsersIcon /> 여 {female} : 남 {male}
              </div>
            </article>
          );
        })}
      </section>
      <p className="session-policy">
        신청과 취소는 세션 시작 30분 전까지 가능해요.
        <br />
        취소 환불액은 시작 시각까지 남은 시간에 따라 달라집니다.
      </p>

      <div className={`toast ${notice ? "visible" : ""}`} role="status">
        {notice}
      </div>

      {pending && (
        <dialog
          ref={dialog}
          className="booking-dialog"
          aria-labelledby="booking-title"
          aria-describedby="booking-description"
          onCancel={() => setPending(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setPending(null);
          }}
        >
          <div className="dialog-body">
            <h2 id="booking-title">
              <mark>
                {dateLabel(selectedDate)} {koreaTime(pending.startTime)}
              </mark>
              <br />
              {pendingAction === "apply"
                ? "세션에 참여하시겠어요?"
                : "신청을 취소할까요?"}
            </h2>
            <p className="dialog-description" id="booking-description">
              {pendingAction === "apply"
                ? "신청 시 참가비가 바로 차감됩니다."
                : "취소 환불액은 세션 시작까지 남은 시간에 따라 정해져요."}
            </p>
            <div className="gem-summary">
              {pendingAction === "apply" ? (
                <>
                  <div>
                    <span>세션 참가비</span>
                    <strong>
                      <span className="gem">◆</span> {pending.entryFeeGem}개
                    </strong>
                  </div>
                  <div className="refund-row">
                    <span>보증금(투표 완료 시 반환)</span>
                    <strong>
                      <span className="gem">◆</span>{" "}
                      {pending.completionRefundGem}개
                    </strong>
                  </div>
                  <div className="gem-total">
                    <span>신청 시 차감</span>
                    <strong>
                      <span className="gem">◆</span> {pending.entryFeeGem}개
                    </strong>
                  </div>
                </>
              ) : (
                <div className="gem-total">
                  <span>취소 환불 예정</span>
                  <strong>
                    <span className="gem">◆</span> {cancellationRefund(pending)}
                    개
                  </strong>
                </div>
              )}
            </div>
            <div className="dialog-actions">
              <button
                className="cancel-button"
                autoFocus
                disabled={submitting}
                onClick={() => setPending(null)}
              >
                돌아가기
              </button>
              <button
                className="confirm-button"
                disabled={submitting}
                onClick={() => void confirmBooking(pending)}
              >
                {submitting
                  ? "처리 중…"
                  : pendingAction === "apply"
                    ? "신청하기"
                    : "취소하기"}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </ScheduleStyles>
  );
}

const ScheduleStyles = styled.div`
  display: contents;

  .list-caption {
    margin: 2.3rem 0.2rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #7b847d;
    font-size: 1.2rem;
  }
  .session-list {
    display: grid;
    gap: 1.4rem;
  }
  .session-empty {
    padding: 3.2rem 1.6rem;
    border: 0.1rem dashed var(--border-card);
    border-radius: 2rem;
    color: var(--text-secondary);
    font-size: 1.4rem;
    text-align: center;
  }
  .retry-button {
    display: block;
    margin: 1rem auto 0;
    padding: 0.8rem 1.2rem;
    border: 0.1rem solid var(--ink);
    border-radius: 1rem;
    background: var(--white);
    font: 1.3rem var(--font-body);
  }
  .session-card {
    padding: 2rem;
    border-radius: 2.7rem;
    border: 0.1rem solid var(--ink);
  }
  .session-card.dark {
    background: var(--ink);
    color: var(--white);
  }
  .session-card.light {
    background: var(--white);
    border-color: var(--border-card);
  }
  .session-card.green {
    background: #eff8d7;
    border-color: var(--border-card);
  }
  .session-top {
    display: flex;
    align-items: center;
    gap: 1.1rem;
  }
  .session-badge {
    flex: 0 0 4.2rem;
    height: 4.4rem;
    border-radius: 1.4rem;
    display: grid;
    place-content: center;
    background: var(--badge-pink);
    color: var(--text-danger);
    text-align: center;
    line-height: 1.15;
    font-family: var(--font-body);
    font-size: 1.2rem;
    font-weight: 600;
  }
  .session-badge.relaxed {
    background: var(--green);
    color: #485828;
  }
  .session-summary {
    min-width: 0;
    flex: 1;
  }
  .session-summary h2 {
    font-family: var(--display-font);
    font-size: 1.4rem;
    line-height: 1.4;
    font-weight: 400;
    letter-spacing: -0.05rem;
    white-space: nowrap;
  }
  .session-summary p {
    font-size: 1.1rem;
    color: #8b9390;
    margin-top: 0.3rem;
  }
  .session-actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 1rem;
  }
  .delete-session-button {
    flex-shrink: 0;
    border: 0;
    background: #d94343;
    color: #fff;
    padding: 0.9rem 1.1rem;
    border-radius: 1.4rem;
    font-family: var(--font-body);
    font-size: 1.2rem;
    font-weight: 600;
    cursor: pointer;
  }
  .delete-session-button:disabled {
    opacity: 0.65;
    cursor: wait;
  }
  .apply-button {
    flex-shrink: 0;
    border: 0;
    background: var(--ink);
    color: var(--green);
    padding: 0.9rem 1.2rem;
    border-radius: 1.4rem;
    font-family: var(--font-body);
    font-size: 1.2rem;
    font-weight: 600;
  }
  .dark .apply-button {
    background: var(--green);
    color: var(--ink);
  }
  .apply-button:disabled {
    opacity: 0.65;
  }
  .capacity-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 1.7rem 0 0.8rem;
    font-size: 1.1rem;
  }
  .capacity-label > span {
    color: var(--text-secondary);
  }
  .capacity-label strong {
    font-weight: 600;
  }
  .capacity-track {
    height: 0.7rem;
    background: #e9ece6;
    border-radius: 2rem;
    overflow: hidden;
  }
  .capacity-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--ink);
  }
  .dark .capacity-track {
    background: #495049;
  }
  .dark .capacity-track span {
    background: #8a967e;
  }
  .capacity-total {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--text-secondary);
    font-size: 1.1rem;
    margin-top: 0.8rem;
  }
  .capacity-total svg {
    width: 1.4rem;
    height: 1.4rem;
  }
  .session-policy {
    font-size: 1.1rem;
    text-align: center;
    line-height: 1.6;
    color: #929b90;
    margin-top: 2rem;
  }
  .toast {
    position: fixed;
    z-index: 20;
    bottom: calc(9.5rem + env(safe-area-inset-bottom));
    left: 50%;
    transform: translate(-50%, 1rem);
    width: max-content;
    max-width: min(37rem, 90vw);
    padding: 1.3rem 1.8rem;
    background: #2b302cf2;
    color: var(--white);
    border-radius: 1.4rem;
    font-size: 1.3rem;
    line-height: 1.6;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 0.2s,
      transform 0.2s;
    text-align: center;
  }
  .toast.visible {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  .booking-dialog {
    padding: 0;
    border: 0;
    border-radius: 2.9rem;
    width: min(34rem, calc(100vw - 4.8rem));
    max-height: calc(100dvh - 4rem);
    background: var(--background);
    color: var(--ink);
    box-shadow: 0 1.6rem 7rem #1113;
  }
  .booking-dialog::backdrop {
    background: #222b2566;
  }
  .dialog-body {
    padding: 3rem 2rem 2rem;
  }
  .booking-dialog h2 {
    text-align: center;
    font-family: var(--display-font);
    font-size: 2.2rem;
    font-weight: 400;
    line-height: 1.35;
    letter-spacing: 0;
  }
  .booking-dialog mark {
    color: var(--ink);
    background: var(--green);
    padding: 0.1rem 0.3rem;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
  .dialog-description {
    text-align: center;
    font-size: 1.1rem;
    line-height: 1.8;
    color: #8b959b;
    margin: 1rem 0 1.6rem;
  }
  .gem-summary {
    padding: 1.5rem;
    border-radius: 1.8rem;
    background: #f1f5e6;
    font-size: 1.1rem;
  }
  .gem-summary > div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.2rem;
  }
  .gem-summary > div + div {
    margin-top: 1.2rem;
  }
  .gem-summary > div > span {
    color: #8a9393;
  }
  .gem-summary strong {
    font-size: 1.2rem;
  }
  .gem {
    color: var(--gem-blue);
    font-size: 1.5rem;
  }
  .gem-summary .gem-total {
    border-top: 0.1rem solid #e0e6d6;
    padding-top: 1.3rem;
    font-weight: 750;
  }
  .gem-summary .gem-total > span {
    color: var(--ink);
  }
  .dialog-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.9rem;
    margin-top: 1.6rem;
  }
  .dialog-actions button {
    min-height: 3.9rem;
    border-radius: 1.3rem;
    font-size: 1.2rem;
  }
  .cancel-button {
    background: transparent;
    border: 0.1rem solid #e3e8df;
    color: #85908b;
    font-family: var(--font-body);
    font-weight: 500;
  }
  .confirm-button {
    background: var(--green);
    border: 0;
    font-family: var(--font-body);
    font-weight: 600;
    box-shadow: none;
  }

  @media (max-width: 37.4rem) {
    .session-card {
      padding: 1.7rem 1.4rem;
    }
    .session-top {
      gap: 0.7rem;
    }
    .session-summary h2 {
      font-size: 1.2rem;
    }
    .apply-button {
      padding: 0.8rem 0.9rem;
      font-size: 1.1rem;
    }
  }
`;
