import { useEffect, useState } from "react";
import styled from "styled-components";
import type { MySession, Session } from "../../features/sessions/types";

type CountdownProps = {
  sessions: Session[];
  mySessions: MySession[];
};

const SECOND = 1000;
const ENTRY_WINDOW = 10 * 60 * SECOND;
const pad = (value: number) => String(value).padStart(2, "0");

function sessionDateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export default function Countdown({ sessions, mySessions }: CountdownProps) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), SECOND);
    return () => window.clearInterval(interval);
  }, []);

  const nextApplication = mySessions
    .filter(
      (item) =>
        item.myStatus === "APPLIED" &&
        item.sessionStatus !== "CANCELLED" &&
        item.sessionStatus !== "COMPLETED" &&
        new Date(item.startTime).getTime() > now,
    )
    .sort(
      (left, right) =>
        new Date(left.startTime).getTime() -
        new Date(right.startTime).getTime(),
    )[0];

  const startTime = nextApplication
    ? new Date(nextApplication.startTime).getTime()
    : 0;
  const remaining = nextApplication ? Math.max(0, startTime - now) : 0;
  const days = Math.floor(remaining / (24 * 60 * 60 * SECOND));
  const hours = Math.floor((remaining / (60 * 60 * SECOND)) % 24);
  const minutes = Math.floor((remaining / (60 * SECOND)) % 60);
  const seconds = Math.floor((remaining / SECOND) % 60);
  const canEnter = Boolean(nextApplication && remaining <= ENTRY_WINDOW);
  const capacity = sessions.find(
    (item) => item.sessionId === nextApplication?.sessionId,
  )?.capacityPerGender;

  return (
    <CountdownCard
      className={nextApplication ? "has-application" : "empty-countdown"}
      aria-label="카운트다운"
    >
      <img
        className="countdown-mascot"
        src="/kw1.svg"
        alt=""
        aria-hidden="true"
      />
      {nextApplication ? (
        <>
          <p className="countdown-date">
            {sessionDateLabel(nextApplication.startTime)}
          </p>
          <p className="countdown-confirmation">
            {capacity ? `${capacity}:${capacity} 로테이션` : "로테이션"}{" "}
            세션으로 확정되었습니다!
          </p>
          <p
            className="countdown-time"
            aria-label={`시작까지 ${days}일 ${hours}시간 ${minutes}분 ${seconds}초`}
          >
            <span>
              {pad(days)}
              <small>일</small>
            </span>
            <span>
              {pad(hours)}
              <small>시간</small>
            </span>
            <span>
              {pad(minutes)}
              <small>분</small>
            </span>
            <span>
              {pad(seconds)}
              <small>초</small>
            </span>
          </p>
          <button
            className="countdown-enter"
            type="button"
            disabled={!canEnter}
            onClick={() => {
              window.history.pushState(
                null,
                "",
                `/session/${nextApplication.sessionId}`,
              );
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          >
            입장하기
          </button>
        </>
      ) : (
        <p className="countdown-empty-message">신청한 세션이 없어요.</p>
      )}
    </CountdownCard>
  );
}

const CountdownCard = styled.section`
  position: relative;
  overflow: visible;
  min-height: 14.8rem;
  margin: 0 3rem 2.4rem;
  padding: 2.2rem 2.4rem;
  border: 0.1rem solid #d4ed75;
  border-radius: 4rem;
  background: var(--green);
  box-shadow: 0 0.8rem 2rem #2637251c;

  .countdown-mascot {
    position: absolute;
    z-index: 2;
    top: -1.8rem;
    right: 3rem;
    width: 7.5rem;
    height: auto;
  }
  .countdown-date {
    position: relative;
    z-index: 1;
    padding-right: 7rem;
    font-family: var(--display-font);
    font-size: 1.3rem;
    font-weight: 400;
  }
  .countdown-confirmation {
    position: relative;
    z-index: 1;
    display: table;
    margin-top: 0.7rem;
    padding: 0.2rem 0.8rem;
    background: var(--white);
    font-family: var(--display-font);
    font-size: 1.1rem;
  }
  .countdown-time {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 1rem;
    margin-top: 0.8rem;
    color: var(--ink);
    font-size: clamp(2rem, 7vw, 3.2rem);
    font-weight: 750;
    line-height: 1.2;
    letter-spacing: -0.08rem;
  }
  .countdown-time span {
    white-space: nowrap;
  }
  .countdown-time small {
    margin-left: 0.25rem;
    font-size: 0.48em;
    letter-spacing: 0;
  }
  .countdown-enter {
    width: 100%;
    min-height: 4.6rem;
    margin-top: 1.1rem;
    border: 0;
    border-radius: 1rem;
    background: #101110;
    color: white;
    font: 600 1.4rem var(--font-body);
  }
  .countdown-enter:disabled {
    background: #53594b;
    color: #e1e5d9;
  }
  .countdown-empty-message {
    display: grid;
    min-height: 9.8rem;
    place-items: center;
    font-size: 1.6rem;
    font-weight: 600;
  }

  @media (max-width: 37.4rem) {
    margin-right: 3rem;
    margin-left: 3rem;
    padding: 2.4rem;
    border-radius: 3rem;
    .countdown-mascot {
      top: -1.2rem;
      right: 2.4rem;
      width: 7.5rem;
    }
  }
`;
