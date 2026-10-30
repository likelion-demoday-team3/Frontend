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
                ? "세션 시작 5분 전부터 입장할 수 있어요."
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
          onClick={onEnter}
        >
          {phase === "connecting" ? "연결 중…" : "입장하기"}
        </button>
      </section>
    </>
  );
}
