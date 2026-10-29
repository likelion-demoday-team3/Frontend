import { useCallback, useEffect, useId, useRef, useState } from "react";
import styled from "styled-components";
import {
  getHeartStatus,
  getContactRequests,
  respondToContactRequest,
  type ContactRequest,
} from "../../features/sessions/interactionApi";
import { getContactShares, type ContactShare } from "../../features/records/api";

type SessionNotiProps = {
  className?: string;
  sessionId?: number;
  recipientId?: number | null;
};

export default function SessionNoti({
  className = "",
  sessionId,
  recipientId,
}: SessionNotiProps) {
  const previewParams = new URLSearchParams(window.location.search);
  const notificationPreview =
    previewParams.get("preview") === "notifications" &&
    (import.meta.env.DEV || previewParams.has("showTest"));
  const previewNotice = notificationPreview
    ? previewParams.get("notice")
    : null;
  const [open, setOpen] = useState(false);
  const [heartSenders, setHeartSenders] = useState<string[]>([]);
  const [receivedContacts, setReceivedContacts] = useState<ContactShare[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);
  const [arrivalQueue, setArrivalQueue] = useState<
    Array<"heart" | "contact" | "contact-accepted" | "contact-share">
  >(() => {
    const noticeTypes = {
      heart: "heart",
      contact: "contact",
      accepted: "contact-accepted",
      share: "contact-share",
    } as const;
    return previewNotice && previewNotice in noticeTypes
      ? [noticeTypes[previewNotice as keyof typeof noticeTypes]]
      : [];
  });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const previousHeartCount = useRef<number | null>(null);
  const previousRequestIds = useRef<Set<number> | null>(null);
  const previousContactShareIds = useRef<Set<number> | null>(null);
  const previousOutgoingRequestStatuses = useRef<Map<number, ContactRequest["status"]>>(new Map());

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
      const apiHeartCount =
        heartResult.status === "fulfilled"
          ? heartResult.value?.receivedCount ?? 0
          : 0;
      const nextHeartCount = notificationPreview ? 2 : apiHeartCount;
      const nextHeartSenders = notificationPreview
        ? ["구름산책", "달빛수집가"]
        : Array.from(
            { length: Math.min(nextHeartCount, 50) },
            () => "상대방",
          );
      const apiContacts =
        contactResult.status === "fulfilled"
          ? contactResult.value.items.filter(
              (item) => !sessionId || item.sessionId === sessionId,
            )
          : [];
      const testContact: ContactShare = {
        id: -2,
        sessionId: sessionId ?? 1,
        senderId: 2,
        receiverId: recipientId ?? 1,
        contactType: "PHONE",
        contactValue: "010-1234-5678",
        shareType: "REQUEST_ACCEPTED",
        createdAt: new Date().toISOString(),
        sessionStartTime: new Date().toISOString(),
        senderAlias: "구름산책",
        receiverAlias: null,
      };
      const nextContacts = notificationPreview ? [testContact] : apiContacts;
      const requestHistory =
        requestResult.status === "fulfilled"
          ? requestResult.value.items.filter(
              (item) => !sessionId || item.sessionId === sessionId,
            )
          : [];
      const apiRequests =
        requestResult.status === "fulfilled"
          ? requestHistory.filter(
              (item) =>
                item.status === "PENDING" &&
                recipientId != null && item.targetId === recipientId,
            )
          : [];
      const testRequest: ContactRequest = {
        id: -1,
        sessionId: sessionId ?? 1,
        requesterId: 2,
        targetId: recipientId ?? 1,
        contactType: "PHONE",
        status: "PENDING",
        chargedGem: 0,
        createdAt: new Date().toISOString(),
        respondedAt: null,
      };
      const nextRequests = notificationPreview
        ? [...apiRequests, testRequest]
        : apiRequests;
      if (announceArrival) {
        const arrivals: Array<
          "heart" | "contact" | "contact-accepted" | "contact-share"
        > = [];
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
        if (
          contactResult.status === "fulfilled" &&
          previousContactShareIds.current &&
          nextContacts.some((contact) => !previousContactShareIds.current?.has(contact.id))
        ) {
          arrivals.push("contact-share");
        }
        if (requestResult.status === "fulfilled" && recipientId != null) {
          const acceptedOutgoingRequest = requestHistory.some((request) =>
            request.requesterId === recipientId &&
            request.status === "ACCEPTED" &&
            previousOutgoingRequestStatuses.current.get(request.id) === "PENDING",
          );
          if (acceptedOutgoingRequest) arrivals.push("contact-accepted");
        }
        if (arrivals.length && !open)
          setArrivalQueue((current) => [...current, ...arrivals]);
      }
      if (heartResult.status === "fulfilled") {
        previousHeartCount.current = nextHeartCount;
      }
      if (requestResult.status === "fulfilled") {
        previousRequestIds.current = new Set(nextRequests.map((request) => request.id));
        if (recipientId != null) {
          previousOutgoingRequestStatuses.current = new Map(
            requestHistory
              .filter((request) => request.requesterId === recipientId)
              .map((request) => [request.id, request.status]),
          );
        }
      }
      if (contactResult.status === "fulfilled") {
        previousContactShareIds.current = new Set(nextContacts.map((contact) => contact.id));
      }
      setHeartSenders(nextHeartSenders);
      setIncomingRequests(nextRequests);
      setReceivedContacts(nextContacts);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "알림을 불러오지 못했어요.",
      );
    } finally {
      setLoading(false);
    }
  }, [notificationPreview, open, recipientId, sessionId]);

  useEffect(() => {
    if (sessionId == null || recipientId == null) return;
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(true), 10_000);
    return () => window.clearInterval(interval);
  }, [loadNotifications, recipientId, sessionId]);

  async function answerRequest(request: ContactRequest, accept: boolean) {
    if (request.id < 0) {
      setIncomingRequests((items) => items.filter((item) => item.id !== request.id));
      return;
    }
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
      <button
        className="refresh-button"
        type="button"
        aria-label="알림 새로고침"
        title="알림 새로고침"
        disabled={loading}
        onClick={() => void loadNotifications()}
      >
        ↻
      </button>
      <button className="close-button" type="button" aria-label="알림 닫기" onClick={() => setOpen(false)}>×</button>
      {loading ? <p>알림을 불러오는 중이에요…</p> : <>
        {error && <p role="alert">{error}</p>}
        <section className="notification-group">
          <h3>하트</h3>
          <div className="notification-list">
            {heartSenders.map((sender, index) => (
              <p className="heart-notification" key={`heart-${index}`}>
                <strong>{sender}</strong>{sender === "상대방" ? "" : "님"}이{" "}
                <i aria-hidden="true">♥</i>를 보냈어요
              </p>
            ))}
          </div>
        </section>
        <section className="notification-group contact-group">
          <h3>연락처</h3>
          <div className="notification-list">
            {incomingRequests.map((request) => (
              <article className="contact-request-item" key={request.id}>
                <p>
                  <strong>{requestSenderName(request)}</strong>
                  {requestSenderName(request) === "상대방" ? "" : "님"}이 연락처 요청을 보냈어요
                </p>
                <div className="notification-actions">
                  <button
                    type="button"
                    className="accept-request"
                    aria-label={`${requestSenderName(request)} 연락처 요청 수락`}
                    disabled={busyRequestId === request.id}
                    onClick={() => void answerRequest(request, true)}
                  >수락</button>
                  <button
                    type="button"
                    className="decline-request"
                    aria-label={`${requestSenderName(request)} 연락처 요청 거절`}
                    disabled={busyRequestId === request.id}
                    onClick={() => void answerRequest(request, false)}
                  >거절</button>
                </div>
              </article>
            ))}
            {receivedContacts.map((contact) => (
              <article className="contact-share-item" key={contact.id}>
                <p>
                  <strong>{contact.senderAlias ?? "상대방"}</strong>
                  {contact.senderAlias ? "님" : ""}의 연락처가 도착했어요
                </p>
                <div className="contact-value">
                  <span>{contact.contactType === "PHONE" ? "전화번호" : "인스타그램"}</span>
                  <strong>{contact.contactValue ?? "연락처 정보가 없어요."}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      </>}
    </NoticeDialog>
    {arrivalQueue[0] && !open && (
      <ArrivalPopover role="alertdialog" aria-labelledby={`${titleId}-arrival-title`}>
        <h2 id={`${titleId}-arrival-title`}>
          <span>띠롱!</span>
          <span>새로운 알림이 있어요.</span>
        </h2>
        <button type="button" onClick={openNotifications}>알림창 열기</button>
      </ArrivalPopover>
    )}
  </>
}

function requestSenderName(request: ContactRequest) {
  if (request.id < 0) return "구름산책";
  try {
    const stored = sessionStorage.getItem(`kiiwee.session-context:${request.sessionId}`);
    const context = stored ? JSON.parse(stored) as { partners?: Array<{ memberId: number; nickname: string; roundNumber: number }> } : null;
    const partner = context?.partners?.find((item) => item.memberId === request.requesterId);
    if (partner) return partner.nickname;
  } catch {
    // If the session context is unavailable, keep a generic label.
  }
  return "상대방";
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
  left: max(calc((100vw - 43rem) / 2 + 1.6rem), 1.6rem);
  right: auto;
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
  font-family: var(--font-body);
  box-shadow: 0 1.6rem 7rem #1113;
  &::backdrop { background: #222b2533; }
  &::after { position: absolute; top: -0.8rem; left: 2.6rem; width: 1.6rem; height: 1.6rem; background: var(--background); content: ""; transform: rotate(45deg); }
  h2 { margin: 0; padding: 0 3.6rem 1.2rem 0; border-bottom: 0.2rem solid #9aa49b; font: 600 1.8rem/1.4 var(--display-font); }
  button.close-button { position: absolute; top: 1.2rem; right: 1.4rem; display: grid; width: 3.2rem; min-height: 3.2rem; place-items: center; margin: 0; padding: 0; border: 0; background: transparent; color: var(--ink); font: 400 2.8rem/1 var(--font-body); cursor: pointer; }
  button.refresh-button { position: absolute; top: 1.4rem; right: 5.2rem; display: grid; width: 3.2rem; height: 3.2rem; min-height: 3.2rem; place-items: center; margin: 0; padding: 0; border: 0; border-radius: 50%; background: transparent; color: #66705f; font: 400 2rem/1 var(--font-body); cursor: pointer; }
  button.refresh-button:hover:not(:disabled) { background: #edf2e8; }
  button.refresh-button:disabled { opacity: 0.45; cursor: wait; }
  p { margin-top: 1.2rem; color: var(--text-secondary); font-size: 1.4rem; line-height: 1.6; }
  button { display: grid; width: 100%; min-height: 4.2rem; place-items: center; margin-top: 1.6rem; border: 0.1rem solid var(--ink); border-radius: 1rem; background: var(--green); color: var(--ink); font: 500 1.4rem var(--font-body); }
  .notification-group { margin-top: 1.2rem; }
  .notification-group + .notification-group { margin-top: 1rem; padding-top: 1rem; border-top: 0.2rem solid #9aa49b; }
  .notification-group h3 { margin: 0; padding-bottom: 0.8rem; border-bottom: 0.1rem solid #dfe4df; font: 500 1.4rem/1.4 var(--display-font); text-align: center; }
  .notification-list { display: grid; gap: 1rem; padding-top: 1rem; }
  .heart-notification,
  .contact-request-item > p,
  .contact-share-item > p { margin: 0; color: var(--ink); font-size: 1.35rem; font-weight: 400; line-height: 1.5; }
  .heart-notification strong,
  .contact-request-item strong,
  .contact-share-item > p strong { font-weight: 700; }
  .heart-notification i { color: #f14b79; font: 700 1.5rem/1 var(--font-body); }
  .contact-request-item { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .contact-share-item { padding-top: 1rem; border-top: 0.1rem solid #dfe4df; }
  .notification-actions { display: flex; flex: 0 0 auto; gap: 0.7rem; }
  .notification-actions button { display: grid; min-width: 5rem; min-height: 3.4rem; place-items: center; margin: 0; padding: 0 1rem; border: 0; border-radius: 999px; font: 600 1.15rem/1 var(--font-body); cursor: pointer; }
  .notification-actions .accept-request { background: #dfff83; color: #4f7820; }
  .notification-actions .decline-request { background: #e6e9e3; color: #7d8579; }
  .notification-actions button:disabled { opacity: 0.55; cursor: wait; }
  .contact-value { display: grid; gap: 0.35rem; margin-top: 0.8rem; padding: 1rem 1.2rem; border: 0.1rem solid #dfe4df; border-radius: 1rem; background: #f7f9f4; }
  .contact-value span { color: var(--text-secondary); font-size: 1.1rem; }
  .contact-value strong { color: var(--ink); font-size: 1.25rem; font-weight: 600; overflow-wrap: anywhere; }
`

const ArrivalPopover = styled.aside`
  position: fixed;
  z-index: 20;
  top: 7rem;
  left: max(calc((100vw - 43rem) / 2 + 1.6rem), 1.6rem);
  width: min(34rem, calc(100vw - 3.2rem));
  padding: 1.8rem 2rem;
  border: 0;
  border-radius: 2rem;
  background: var(--background);
  color: var(--ink);
  font-family: var(--font-body);
  box-shadow: 0 1.6rem 7rem #1113;
  display: grid;
  gap: 1rem;
  h2 { display: flex; flex-direction: column; gap: 0.05rem; margin: 0; font: 600 1.7rem/1.3 var(--display-font); }
  > button:last-child { display: grid; width: 100%; min-height: 3.8rem; place-items: center; margin: 0; padding: 0.6rem 1rem; border: 0; border-radius: 1rem; background: #011020; color: #fff; font: 600 1.3rem var(--font-body); cursor: pointer; }
  > button:last-child:hover { background: #172532; }
  @media (max-width: 34rem) {
    gap: 0.8rem;
    padding: 1.6rem 1.4rem;
    h2 { font-size: 1.45rem; }
    > button:last-child { min-height: 3.6rem; font-size: 1.2rem; }
  }
`
