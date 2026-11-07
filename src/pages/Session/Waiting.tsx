import { useState } from "react";
import { formatDate, pad } from "./sessionUtils";

type WaitingProps = {
  startTime: string;
  phase: "ready" | "connecting";
  connectionStatus: string;
  joinWindowOpen: boolean;
  now: number;
  opensAt: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  onEnter: () => void;
};

export default function Waiting({
  startTime,
  phase,
  connectionStatus,
  joinWindowOpen,
  now,
  opensAt,
  days,
  hours,
  minutes,
  seconds,
  onEnter,
}: WaitingProps) {
  const [noticeOpen, setNoticeOpen] = useState(false);

  return (
    <>
      <section className="session-intro">
        <span className="eyebrow">KIIWEE LIVE SESSION</span>
        <h1>온라인 로테이션 소개팅</h1>
        <p>{formatDate(startTime)}</p>
      </section>

      <section className="lobby-card">
        <img
          src={
            phase !== "connecting" && !joinWindowOpen && now >= opensAt
              ? "/kw-late.svg"
              : "/kw1.svg"
          }
          alt=""
          aria-hidden="true"
        />
        <h2>
          {phase === "connecting"
            ? "로비에 입장하고 있어요"
            : joinWindowOpen
              ? "소개팅에 입장할 수 있어요"
              : now < opensAt
                ? "입장 시간을 기다리고 있어요"
                : "입장 시간이 지났어요"}
        </h2>
        <p>
          {phase === "connecting"
            ? connectionStatus
            : joinWindowOpen
              ? "입장하면 상대 배정과 실시간 안내를 받을 수 있어요."
              : now < opensAt
                ? "세션 시작 10분 전부터 입장할 수 있어요."
                : "세션 시작 시각까지만 입장할 수 있어요."}
        </p>
        {now < opensAt && (
          <strong className="entry-countdown">
            {days > 0 ? `${pad(days)}일 ` : ""}
            {pad(hours)}:{pad(minutes)}:{pad(seconds)}
          </strong>
        )}
        <button
          className="primary"
          type="button"
          disabled={!joinWindowOpen || phase === "connecting"}
          onClick={() => setNoticeOpen(true)}
        >
          {phase === "connecting" ? "연결 중…" : "입장하기"}
        </button>
      </section>
      {noticeOpen && (
        <div
          className="heart-modal-backdrop entry-notice-backdrop"
          role="presentation"
          onClick={() => setNoticeOpen(false)}
        >
          <section
            className="heart-modal entry-notice-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="entry-notice-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="heart-modal-close"
              type="button"
              aria-label="안내 닫기"
              onClick={() => setNoticeOpen(false)}
            >
              ×
            </button>
            <h2 id="entry-notice-title">입장 전 확인해주세요</h2>
            <ul className="entry-notice-list">
              <li>안정적인 네트워크 환경에서 진행해주세요.</li>
              <li>
                상대가 내 목소리를 들을 수 있게 마이크 권한을 허용해주세요.
              </li>
              <li>
                참가자가 홀수면 일부 라운드에서 상대가 배정되지 않을 수
                있습니다. 오류가 아니니 다음 대화까지 기다려주세요.
              </li>
              <li>
                새로고침하거나 창을 닫으면 연결이 끊길 수 있습니다. 소개팅이
                끝날 때까지 화면을 유지해주세요.
              </li>
              <li>
                소개팅에 참가했더라도 최종 투표를 진행하지 않으면 보증금을
                돌려받을 수 없어요.
              </li>
            </ul>
            <button
              className="heart-send-button"
              type="button"
              onClick={() => {
                setNoticeOpen(false);
                onEnter();
              }}
            >
              확인했습니다
            </button>
          </section>
        </div>
      )}
    </>
  );
}
