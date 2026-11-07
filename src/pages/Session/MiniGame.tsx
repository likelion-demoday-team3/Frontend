import { useEffect, useRef, useState } from "react";

type MiniGameProps = {
  minutes: number;
  seconds: number;
  isUrgent: boolean;
};

const pad = (value: number) => String(value).padStart(2, "0");
type Direction = "left" | "right";
const stairCount = 10;
const stepHeight = 9.5;
const lanes = [10, 30, 50, 70];
const baseTurnLimitMs = 3000;

function getTurnLimitMs(step: number) {
  if (step >= 120) return 500;
  if (step >= 100) return 1000;
  if (step >= 70) return 1500;
  if (step >= 45) return 2000;
  if (step >= 20) return 2500;
  return baseTurnLimitMs;
}

function randomNextLane(lane: number): number {
  const nextLanes = [lane - 1, lane + 1].filter(
    (next) => next >= 0 && next < lanes.length,
  );
  return nextLanes[Math.floor(Math.random() * nextLanes.length)];
}

function createStairLanes(length: number, startingLane = 1): number[] {
  const stairLanes = [startingLane];
  while (stairLanes.length < length) {
    stairLanes.push(randomNextLane(stairLanes[stairLanes.length - 1]));
  }
  return stairLanes;
}

export default function MiniGame({
  minutes,
  seconds,
  isUrgent,
}: MiniGameProps) {
  const [steps, setSteps] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const handledStep = useRef<number | null>(null);
  const climbRef = useRef<(direction: Direction) => void>(() => {});
  const [stairLanes, setStairLanes] = useState<number[]>(() =>
    createStairLanes(stairCount + 1),
  );
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(baseTurnLimitMs);
  const [motionPhase, setMotionPhase] = useState(0);
  const [cloudVisible, setCloudVisible] = useState(false);
  const turnLimitMs = getTurnLimitMs(steps);
  const cloudStage = steps >= 90;
  const currentLane = stairLanes[steps];
  const nextLane = stairLanes[steps + 1];
  const requiredDirection: Direction =
    nextLane > currentLane ? "right" : "left";

  function horizontalOffset(stairIndex: number) {
    if (stairIndex < 30 || (stairIndex - 30) % 4 !== 0) return 0;
    return Math.sin(motionPhase + stairIndex * 0.45) * 4;
  }

  const currentPlatform = {
    left: lanes[currentLane] + horizontalOffset(steps),
    bottom: 22,
  };
  const firstVisibleStair = Math.max(0, steps - 2);
  const visibleStairs = Array.from({ length: stairCount }, (_, offset) => {
    const stairIndex = firstVisibleStair + offset;
    return {
      left: lanes[stairLanes[stairIndex] ?? stairLanes[stairLanes.length - 1]],
      offset: horizontalOffset(stairIndex),
      moving: stairIndex >= 30 && (stairIndex - 30) % 4 === 0,
      flashing:
        stairIndex >= 60 && stairIndex > steps && (stairIndex - 60) % 3 === 0,
      bottom: 22 + (stairIndex - steps) * stepHeight,
      active: stairIndex === steps,
      past: stairIndex < steps,
      key: stairIndex,
    };
  });

  useEffect(() => {
    if (!started || gameOver) return;
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const remaining = Math.max(0, turnLimitMs - (Date.now() - startedAt));
      setTimeLeft(remaining);
      if (remaining === 0) setGameOver(true);
    }, 50);
    return () => window.clearInterval(intervalId);
  }, [steps, gameOver, started]);

  useEffect(() => {
    if (!started || gameOver || steps < 30) return;
    const intervalId = window.setInterval(
      () => setMotionPhase((phase) => phase + 0.08),
      50,
    );
    return () => window.clearInterval(intervalId);
  }, [steps, gameOver, started]);

  useEffect(() => {
    if (!started || gameOver || !cloudStage) {
      setCloudVisible(false);
      return;
    }
    setCloudVisible(true);
    let timeoutId: number;
    function scheduleCloudAppearance() {
      const gap = 2000 + Math.random() * 3000;
      timeoutId = window.setTimeout(() => {
        setCloudVisible(true);
        timeoutId = window.setTimeout(() => {
          setCloudVisible(false);
          scheduleCloudAppearance();
        }, 3000);
      }, gap);
    }
    setCloudVisible(true);
    timeoutId = window.setTimeout(() => {
      setCloudVisible(false);
      scheduleCloudAppearance();
    }, 3000);
    return () => window.clearTimeout(timeoutId);
  }, [cloudStage, gameOver, started]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      if (event.repeat) return;
      climbRef.current(event.key === "ArrowLeft" ? "left" : "right");
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function climb(direction: Direction) {
    // Pointer and keyboard events can arrive before React renders the next stair.
    // Handle each step only once so the score cannot outrun the generated path.
    if (!started || gameOver || handledStep.current === steps) return;
    handledStep.current = steps;
    if (direction !== requiredDirection) {
      setGameOver(true);
      return;
    }
    setFacing(direction);
    setTimeLeft(getTurnLimitMs(steps + 1));
    setStairLanes((current) => {
      const extended = [...current];
      // Keep the entire visible staircase generated ahead of the player.
      const requiredLength = steps + stairCount - 1;
      while (extended.length < requiredLength) {
        extended.push(randomNextLane(extended[extended.length - 1]));
      }
      return extended;
    });
    setSteps(steps + 1);
    setBestScore((record) => Math.max(record, steps + 1));
  }

  climbRef.current = climb;

  function restart() {
    handledStep.current = null;
    setSteps(0);
    setStairLanes(createStairLanes(stairCount + 1));
    setFacing("right");
    setTimeLeft(baseTurnLimitMs);
    setMotionPhase(0);
    setStarted(true);
    setGameOver(false);
  }

  return (
    <section
      className="conversation-screen minigame-screen"
      aria-label="미니게임 대기"
    >
      <div className="conversation-timer" role="timer" aria-live="off">
        <strong className={isUrgent ? "is-urgent" : undefined}>
          {pad(minutes)}:{pad(seconds)}
        </strong>
        <p>매칭 대기 중</p>
      </div>
      <section className="minigame-game" aria-label="무한의 계단 게임">
        <div className="minigame-status-row">
          <div className="minigame-score" role="status" aria-live="polite">
            현재 기록 <strong>{steps}</strong>
          </div>
          <div
            className="stair-timebar"
            role="progressbar"
            aria-label="계단 제한 시간"
            aria-valuemin={0}
            aria-valuemax={turnLimitMs}
            aria-valuenow={timeLeft}
          >
            <span
              className={timeLeft <= 1500 ? "is-urgent" : undefined}
              style={{ transform: `scaleX(${timeLeft / turnLimitMs})` }}
            />
          </div>
        </div>
        <div
          className="staircase-board"
          aria-label={`현재 ${steps}계단`}
          onPointerDown={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            climb(
              event.clientX < bounds.left + bounds.width / 2 ? "left" : "right",
            );
          }}
        >
          {visibleStairs.map((position) => (
            <div
              className={`stair-step${position.active ? " active" : ""}${position.past ? " past" : ""}${position.moving ? " moving" : ""}${position.flashing ? " flashing" : ""}`}
              key={position.key}
              style={{
                left: `${position.left + position.offset}%`,
                bottom: `${position.bottom}%`,
              }}
            />
          ))}
          {cloudStage && (
            <div
              className={`stair-cloud-overlay${cloudVisible ? " visible" : ""}`}
              aria-hidden="true"
            />
          )}
          <img
            className={`stair-player facing-${facing}${gameOver ? " falling" : ""}`}
            src="/kw-wink.svg"
            alt=""
            style={{
              left: `${currentPlatform.left + 11}%`,
              bottom: `calc(${currentPlatform.bottom}% + 0.6rem)`,
            }}
          />
        </div>
        {gameOver && (
          <div className="stair-game-over" role="alertdialog" aria-modal="true">
            <h2>GAME OVER</h2>
            <p>이번 기록 {steps}계단까지 올라갔어요.</p>
            <p className="stair-best-score">최고 기록 {bestScore}계단</p>
            <button type="button" onClick={restart}>
              다시 시작
            </button>
          </div>
        )}
        {!started && !gameOver && (
          <div className="minigame-start-screen">
            <h1>Kiiwee JUMP</h1>
            <p className="minigame-instruction-mobile">
              화면 왼쪽/오른쪽을 눌러 올라가세요
            </p>
            <p className="minigame-instruction-desktop">
              좌우 방향키를 조작해 올라가세요
            </p>
            <button type="button" onClick={() => setStarted(true)}>
              게임 시작
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
