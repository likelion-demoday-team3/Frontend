import { useEffect, useState } from "react";
import styled from "styled-components";
import MyPageFrame, { Action, Panel } from "./MyPageFrame";
import { getAccessToken } from "../../features/auth/session";
import {
  cancelSession,
  getMySessions,
  getSessions,
} from "../../features/sessions/api";
import type { MySession, Session } from "../../features/sessions/types";
import PeriodFilter, { periodBounds, type PeriodRange } from "./PeriodFilter";

const demoReservation: MySession = {
  sessionId: 101,
  startTime: new Date(Date.now() + 86_400_000).toISOString(),
  sessionStatus: "RECRUITING",
  myStatus: "APPLIED",
  alias: "햇살",
  appliedAt: new Date().toISOString(),
};
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

/** 예약 한 건의 상태 뱃지. 내 신청 상태가 먼저, 신청 중이면 세션 상태를 보여준다 */
function statusBadge(item: MySession): { label: string; tone?: "ready" } | null {
  switch (item.myStatus) {
    case "CANCELLED":
      return { label: "예약 취소" };
    case "ATTENDED":
      return { label: "참여 완료", tone: "ready" };
    case "NO_SHOW":
      return { label: "불참" };
    case "LEFT":
      return { label: "중도 퇴장" };
  }
  // 세션 자체가 취소돼도 내 신청 상태는 APPLIED로 남는다
  if (item.sessionStatus === "CANCELLED") return { label: "취소된 세션" };
  if (item.sessionStatus === "READY") return { label: "진행 확정", tone: "ready" };
  if (item.sessionStatus === "IN_PROGRESS") return { label: "진행 중", tone: "ready" };
  if (item.sessionStatus === "COMPLETED") return { label: "종료" };
  return null;
}

// 서버 규칙(신청 마감 10분 전, 진행 조건, RefundPolicy, 로비 시간)을 바꾸면 이 문구도 같이 고친다
const policySections = [
  {
    title: "예약 규정",
    items: [
      "예약은 세션 시작 10분 전까지 할 수 있어요.",
      "성별마다 정원이 있고, 내 성별 자리가 다 차면 예약할 수 없어요.",
      "예약할 때 참가비와 보증금(보석)이 함께 차감돼요.",
      "예약 시 소개팅에서 사용할 닉네임이 자동으로 정해져요.",
    ],
  },
  {
    title: "진행 확정 규정",
    items: [
      "세션 시작 10분 전에 진행 여부가 결정돼요.",
      "예약 인원이 총 5명 이상이고 남녀 인원 차이가 1명 이하면 진행이 확정돼요.",
      "조건을 만족시키지 못한 세션은 취소되고, 참가비와 보증금이 전액 환불돼요.",
    ],
  },
  {
    title: "취소 규정",
    items: [
      "예약 취소는 세션 시작 10분 전까지 할 수 있어요.",
      "진행이 확정된 뒤(시작 10분 전 이후)에는 취소할 수 없어요.",
      "취소한 소개팅은 신청 기간 안이면 다시 예약할 수 있어요.",
    ],
  },
  {
    title: "환불 규정",
    items: [
      "세션 시작 24시간 전까지 취소하면 참가비와 보증금의 100%를 환불해 드려요.",
      "시작 24시간 전 ~ 12시간 전에 취소하면 참가비와 보증금의 50%를 환불해 드려요. (소수점 올림)",
      "시작 12시간 전 이후에 취소하면 환불되지 않아요.",
      "인원 미달이나 운영 사정으로 세션이 취소되면 참가비와 보증금을 전액 환불해 드려요.",
    ],
  },
  {
    title: "입장(출석) 규정",
    items: [
      "대기실은 세션 시작 10분 전에 열리고 시작 시각에 닫혀요. 첫 대화는 시작 15초 후에 시작돼요.",
      "대기실이 닫힐 때 접속해 있지 않으면 불참으로 처리되고, 참가비와 보증금은 환불되지 않아요.",
      "대기실이 닫힐 때 출석 인원이 진행 조건(총 5명 이상, 남녀 차이 1명 이하)에 못 미치면 세션이 취소돼요. 이때 출석한 분만 참가비와 보증금 전액을 환불받아요.",
    ],
  },
  {
    title: "완주 반환",
    items: ["마지막 투표까지 마치면 보증금을 보석으로 돌려드려요."],
  },
];

export default function Reservation({ demo = false }: { demo?: boolean }) {
  const [reservations, setReservations] = useState<MySession[]>(
    demo ? [demoReservation] : [],
  );
  const [sessions, setSessions] = useState<Session[]>([]);
  const [message, setMessage] = useState(demo ? "시연용 예약 내역이에요." : "");
  const [busy, setBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(!demo);
  const [loginRequired, setLoginRequired] = useState(false);
  const [range, setRange] = useState<PeriodRange>("6");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (demo) return;
    if (!getAccessToken()) {
      // 안내 문구를 잠깐 보여준 뒤 로그인 화면으로 보낸다
      setLoading(false);
      setLoginRequired(true);
      const timer = window.setTimeout(() => {
        window.history.pushState(null, "", "/login");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, 1500);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    setLoading(true);
    Promise.all([
      getMySessions(periodBounds(range, startDate, endDate)),
      getSessions(),
    ])
      .then(([mine, all]) => {
        if (!active) return;
        // 선택한 기간(세션 시작 시각 기준)의 예약 기록 전부. 취소·불참·참여 완료도 뱃지로 구분해서 보여준다
        setReservations(mine);
        setSessions(all);
        setMessage("");
      })
      .catch((cause) => {
        if (active)
          setMessage(
            cause instanceof Error
              ? cause.message
              : "예약 내역을 불러오지 못했어요.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demo, range, startDate, endDate]);

  async function cancel(reservation: MySession) {
    if (demo) {
      setReservations((current) =>
        current.filter((item) => item.sessionId !== reservation.sessionId),
      );
      setMessage("시연 예약을 취소했어요.");
      return;
    }
    setBusy(reservation.sessionId);
    setMessage("");
    try {
      const { refundedGem } = await cancelSession(reservation.sessionId);
      // 기간별 예약 기록이라 목록에서 지우지 않고 취소 상태로 바꾼다
      setReservations((current) =>
        current.map((item) =>
          item.sessionId === reservation.sessionId
            ? { ...item, myStatus: "CANCELLED" as const }
            : item,
        ),
      );
      setMessage(
        refundedGem > 0
          ? `예약을 취소했어요. 보석 ${refundedGem}개가 환불됐어요.`
          : "예약을 취소했어요. 환불된 보석은 없어요.",
      );
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "예약 취소에 실패했어요.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <MyPageFrame title="예약 확인" demo={demo}>
      <Panel>
        <h2>기간 선택</h2>
        <PeriodFilter
          label="예약 내역 기간"
          range={range}
          startDate={startDate}
          endDate={endDate}
          onRangeChange={setRange}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </Panel>
      {loading || loginRequired || reservations.length === 0 ? (
        <Panel>
          <h2>예약 내역</h2>
          <p className="hint" role="status">
            {loading
              ? "예약 내역을 불러오는 중이에요…"
              : loginRequired
                ? "예약 내역을 보려면 로그인이 필요해요."
                : "선택한 기간에 예약 내역이 없어요."}
          </p>
        </Panel>
      ) : (
        reservations.map((item) => {
          const badge = statusBadge(item);
          // 신청 중인데 세션이 취소된 경우만 흐리게. 내가 취소한 기록·지난 기록은 그대로 읽히게 둔다
          const cancelled =
            item.myStatus === "APPLIED" && item.sessionStatus === "CANCELLED";
          // 서버도 모집 중(RECRUITING)인 세션의 신청만 본인 취소를 받는다
          const cancellable =
            item.myStatus === "APPLIED" && item.sessionStatus === "RECRUITING";
          // 현재 인원·취소 영역은 아직 열리지 않은 예약(모집 중·진행 확정)에만 보여준다
          const upcoming =
            item.myStatus === "APPLIED" &&
            (item.sessionStatus === "RECRUITING" ||
              item.sessionStatus === "READY");
          const session = sessions.find(
            (value) => value.sessionId === item.sessionId,
          );
          const attendance = session
            ? `${session.capacityPerGender - session.maleRemaining}:${session.capacityPerGender - session.femaleRemaining}`
            : "인원 정보 없음";
          return (
            <ReservationPanel
              key={item.sessionId}
              data-cancelled={cancelled || undefined}
              aria-disabled={cancelled || undefined}
            >
              <h2>
                세션 예약
                {badge && (
                  <span className={badge.tone ? `badge ${badge.tone}` : "badge"}>
                    {badge.label}
                  </span>
                )}
              </h2>
              <p className="hint">예약일자</p>
              <strong>{dateLabel(item.appliedAt)}</strong>
              <p className="hint" style={{ marginTop: "1.5rem" }}>
                세션 일자
              </p>
              <strong>{dateLabel(item.startTime)}</strong>
              {cancelled ? (
                <p className="hint" style={{ marginTop: "1.5rem" }}>
                  인원 미달 또는 운영 사정으로 취소되어 참가비와 보증금이 전액
                  환불됐어요.
                </p>
              ) : !upcoming ? null : (
                <>
                  <p className="hint" style={{ marginTop: "1.5rem" }}>
                    현재 인원 (남:여)
                  </p>
                  <strong>{attendance}</strong>
                  {!cancellable ? (
                    // 진행 확정 뒤에는 서버도 본인 취소를 받지 않는다
                    <p className="hint" style={{ marginTop: "1.8rem" }}>
                      진행이 확정된 세션은 예약을 취소할 수 없어요.
                    </p>
                  ) : (
                    <div style={{ marginTop: "1.8rem" }}>
                      <Action
                        type="button"
                        disabled={busy === item.sessionId}
                        onClick={() => void cancel(item)}
                      >
                        {busy === item.sessionId ? "취소 중…" : "예약취소"}
                      </Action>
                    </div>
                  )}
                </>
              )}
            </ReservationPanel>
          );
        })
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      <Policy>
        <summary>예약·취소·환불 규정</summary>
        {policySections.map((section) => (
          <section key={section.title}>
            <h3>{section.title}</h3>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </Policy>
    </MyPageFrame>
  );
}

const ReservationPanel = styled(Panel)`
  h2 {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }
  .badge {
    padding: 0.3rem 0.8rem;
    border-radius: 99rem;
    background: #eef1ec;
    color: #647065;
    font-size: 1.05rem;
    font-weight: 700;
  }
  .badge.ready {
    background: var(--green);
    color: #273219;
  }
  &[data-cancelled] {
    opacity: 0.55;
    pointer-events: none;
    user-select: none;
  }
`;

const Policy = styled.details`
  margin-top: 2.4rem;
  padding: 1.6rem 1.8rem;
  border: 0.1rem solid #e1e8dc;
  border-radius: 1.6rem;
  background: #fff;
  summary {
    color: #2f3a32;
    font-size: 1.35rem;
    font-weight: 700;
    cursor: pointer;
  }
  section {
    margin-top: 1.6rem;
  }
  h3 {
    margin-bottom: 0.6rem;
    color: #2f5d43;
    font-size: 1.2rem;
    font-weight: 700;
  }
  ul {
    display: grid;
    gap: 0.4rem;
    padding-left: 1.6rem;
  }
  li {
    color: #69756b;
    font-size: 1.15rem;
    line-height: 1.6;
    word-break: keep-all;
  }
`;
