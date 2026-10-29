import { useCallback, useEffect, useId, useRef, useState } from "react";
import styled from "styled-components";
import {
  getHeartStatus,
  getContactRequests,
  respondToContactRequest,
  type ContactRequest,
} from "../../features/sessions/interactionApi";
import { getContactShares, type ContactShare } from "../../features/records/api";

type NotificationButtonProps = {
  className?: string;
  sessionId?: number;
  recipientId?: number | null;
};

export default function NotificationButton({
  className = "",
  sessionId,
  recipientId,
}: NotificationButtonProps) {
  const [open, setOpen] = useState(false);
  const [heartCount, setHeartCount] = useState(0);
  const [receivedContacts, setReceivedContacts] = useState<ContactShare[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);
  const [arrivalQueue, setArrivalQueue] = useState<Array<"heart" | "contact">>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const previousHeartCount = useRef<number | null>(null);
  const previousRequestIds = useRef<Set<number> | null>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.showModal();
    return () => dialogRef.current?.close();
  }, [open]);

  const loadNotifications = useCallback(async (announceArrival = false) => {
    setLoading(true);
    setError("");
    try {
      const [heartResult, contactResult, requestResult] = await Promise.allSettled([
        sessionId ? getHeartStatus(sessionId) : Promise.resolve(null),
        getContactShares("RECEIVED"),
        getContactRequests(),
      ]);
      const nextHeartCount =
        heartResult.status === "fulfilled"
          ? heartResult.value?.receivedCount ?? 0
          : 0;
      const nextContacts =
        contactResult.status === "fulfilled"
          ? contactResult.value.items.filter(
              (item) => !sessionId || item.sessionId === sessionId,
            )
          : [];
      const nextRequests =
        requestResult.status === "fulfilled"
          ? requestResult.value.items.filter(
              (item) =>
                item.status === "PENDING" &&
                (!sessionId || item.sessionId === sessionId) &&
                recipientId != null && item.targetId === recipientId,
            )
          : [];
      if (announceArrival) {
        const arrivals: Array<"heart" | "contact"> = [];
        if (
          heartResult.status === "fulfilled" &&
          previousHeartCount.current != null &&
          nextHeartCount > previousHeartCount.current
        ) {
          arrivals.push("heart");
        }
        if (
          requestResult.status === "fulfilled" &&
          previousRequestIds.current &&
          nextRequests.some((request) => !previousRequestIds.current?.has(request.id))
        ) {
          arrivals.push("contact");
        }
        if (arrivals.length) setArrivalQueue((current) => [...current, ...arrivals]);
      }
      if (heartResult.status === "fulfilled") {
        previousHeartCount.current = nextHeartCount;
      }
      if (requestResult.status === "fulfilled") {
        previousRequestIds.current = new Set(nextRequests.map((request) => request.id));
      }
      setHeartCount(nextHeartCount);
      setReceivedContacts(nextContacts);
      setIncomingRequests(nextRequests);
      const failedCount = [heartResult, contactResult, requestResult].filter(
        (result) => result.status === "rejected",
      ).length;
      if (failedCount) setError("일부 알림을 불러오지 못했어요.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "알림을 불러오지 못했어요.",
      );
    } finally {
      setLoading(false);
    }
  }, [recipientId, sessionId]);

  useEffect(() => {
    if (sessionId == null || recipientId == null) return;
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(true), 10_000);
    return () => window.clearInterval(interval);
  }, [loadNotifications, recipientId, sessionId]);

  async function answerRequest(request: ContactRequest, accept: boolean) {
    setBusyRequestId(request.id);
    setError("");
    try {
      await respondToContactRequest(request.sessionId, request.id, accept);
      window.dispatchEvent(new Event("kiiwee:contact-updated"));
      await loadNotifications();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "요청에 응답하지 못했어요.",
      );
    } finally {
      setBusyRequestId(null);
    }
  }

  function openNotifications() {
    setArrivalQueue((current) => current.slice(1));
    setOpen(true);
    void loadNotifications();
  }

  return <>
    <BellButton className={className} type="button" aria-label="알림 열기" onClick={openNotifications}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
    </BellButton>
    <NoticeDialog ref={dialogRef} aria-labelledby={titleId} onCancel={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false) }}>
      <h2 id={titleId}>알림</h2>
      {loading ? <p>알림을 불러오는 중이에요…</p> : <>
        {error && <p role="alert">{error}</p>}
        {sessionId != null && <section className="notification-section">
          <h3>받은 하트 수</h3>
          <p><span className="heart-icon" aria-hidden="true">♥</span> {heartCount}개</p>
        </section>}
        {incomingRequests.length > 0 && <section className="notification-section">
          <h3>받은 연락처 요청</h3>
          {incomingRequests.map(request => <article className="notification-item" key={request.id}>
            <small>{formatNotificationTime(request.createdAt)}</small>
            <p>{requestConversationLabel(request)}</p>
            <div className="notification-actions">
              <button type="button" disabled={busyRequestId === request.id} onClick={() => void answerRequest(request, true)}>수락</button>
              <button type="button" className="secondary" disabled={busyRequestId === request.id} onClick={() => void answerRequest(request, false)}>거절</button>
            </div>
          </article>)}
        </section>}
        {receivedContacts.length > 0 && <section className="notification-section">
          <h3>받은 연락처</h3>
          {receivedContacts.map(item => <p className="notification-item" key={item.id}>
            {item.senderAlias ?? "상대방"} · {item.contactType === "PHONE" ? "전화번호" : "인스타그램"}{item.contactValue ? ` ${item.contactValue}` : ""}
          </p>)}
        </section>}
        {!heartCount && !incomingRequests.length && !receivedContacts.length && <p>새 알림이 없어요.</p>}
      </>}
      <button type="button" onClick={() => setOpen(false)}>확인</button>
    </NoticeDialog>
    {arrivalQueue[0] && !open && (
      <ArrivalPopover role="alertdialog" aria-labelledby={`${titleId}-arrival-title`}>
        <button className="arrival-close" type="button" aria-label="닫기" onClick={() => setArrivalQueue((current) => current.slice(1))}>×</button>
        <h2 id={`${titleId}-arrival-title`}>
          {arrivalQueue[0] === "heart" ? "하트가 도착했습니다!" : "연락처 요청이 왔습니다."}
        </h2>
        <p>
          {arrivalQueue[0] === "heart"
            ? "알림창에서 받은 하트의 수를 확인하세요."
            : "알림창에서 요청 목록을 확인하고 수락 또는 거절을 선택하세요."}
        </p>
        <button type="button" onClick={openNotifications}>알림창 열기</button>
      </ArrivalPopover>
    )}
  </>
}

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function requestConversationLabel(request: ContactRequest) {
  try {
    const stored = sessionStorage.getItem(`kiiwee.session-context:${request.sessionId}`);
    const context = stored ? JSON.parse(stored) as { partners?: Array<{ memberId: number; nickname: string; roundNumber: number }> } : null;
    const partner = context?.partners?.find((item) => item.memberId === request.requesterId);
    if (partner) return `${partner.roundNumber}번째 대화 · ${partner.nickname}`;
  } catch {
    // If the session context is unavailable, keep a generic label.
  }
  return request.contactType === "PHONE" ? "전화번호 요청" : "인스타그램 요청";
}

const BellButton = styled.button`
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #00111f;
  cursor: pointer;
  &:hover { background: #2b302c08; }
  svg { width: 2.8rem; height: 2.8rem; }
`

const NoticeDialog = styled.dialog`
  position: fixed;
  top: 7.2rem;
  right: auto;
  left: max(calc((100vw - 43rem) / 2 + 1.6rem), 1.6rem);
  bottom: auto;
  margin: 0;
  width: min(34rem, calc(100vw - 3.2rem));
  max-height: min(80vh, 58rem);
  overflow-y: auto;
  padding: 2rem;
  border: 0;
  border-radius: 2rem;
  background: var(--background);
  color: var(--ink);
  box-shadow: 0 1.6rem 7rem #1113;
  &::backdrop { background: #222b2533; }
  &::after { position: absolute; top: -0.8rem; left: 2.6rem; width: 1.6rem; height: 1.6rem; background: var(--background); content: ""; transform: rotate(45deg); }
  h2 { font: 600 1.8rem/1.4 var(--font-body); }
  p { margin-top: 1.2rem; color: var(--text-secondary); font-size: 1.4rem; line-height: 1.6; }
  button { display: grid; width: 100%; min-height: 4.2rem; place-items: center; margin-top: 1.6rem; border: 0.1rem solid var(--ink); border-radius: 1rem; background: var(--green); color: var(--ink); font: 500 1.4rem var(--font-body); }
  .notification-item { padding: 1.2rem; border: 0.1rem solid var(--border-card); border-radius: 1.2rem; }
  .notification-section { margin-top: 1.4rem; padding-top: 1.2rem; border-top: 0.1rem solid var(--border-card); }
  .notification-section h3 { margin: 0; font: 600 1.4rem/1.4 var(--font-body); }
  .notification-section > p { padding: 1.2rem; }
  .heart-icon { color: #f14b79; }
  .notification-actions { display: flex; gap: 0.8rem; }
  .notification-actions button { flex: 1; }
  .notification-actions .secondary { background: var(--white); }
`

const ArrivalPopover = styled.aside`
  position: fixed;
  z-index: 20;
  top: 7rem;
  left: max(calc((100vw - 43rem) / 2 + 1.6rem), 1.6rem);
  width: min(34rem, calc(100vw - 3.2rem));
  padding: 2rem;
  border: 0.1rem solid var(--border-card);
  border-radius: 2rem;
  background: var(--background);
  color: var(--ink);
  box-shadow: 0 1.6rem 7rem #1113;
  &::before { position: absolute; top: -0.8rem; left: 2.6rem; width: 1.6rem; height: 1.6rem; border-top: 0.1rem solid var(--border-card); border-left: 0.1rem solid var(--border-card); background: var(--background); content: ""; transform: rotate(45deg); }
  h2 { margin: 0 2.4rem 0 0; font: 700 2rem/1.4 var(--display-font); }
  p { margin: 0.8rem 0 1.6rem; color: var(--text-secondary); font-size: 1.3rem; line-height: 1.6; }
  > button:last-child { display: grid; width: 100%; min-height: 4.4rem; place-items: center; border: 0; border-radius: 1rem; background: var(--green); color: var(--ink); font: 600 1.4rem var(--font-body); }
  .arrival-close { position: absolute; top: 0.8rem; right: 1rem; border: 0; background: transparent; color: var(--ink); font-size: 2.4rem; cursor: pointer; }
`
