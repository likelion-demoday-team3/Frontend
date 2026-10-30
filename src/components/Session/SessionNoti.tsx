import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import styled from "styled-components";
import {
  getHeartStatus,
  getContactRequests,
  respondToContactRequest,
  type ContactRequest,
} from "../../features/sessions/interactionApi";
import {
  getContactShares,
  type ContactShare,
} from "../../features/records/api";
import type { LiveMessage } from "../../features/live/stomp";

type LiveNotificationMessage = Extract<
  LiveMessage,
  {
    kind:
      | "heart-received"
      | "contact-requested"
      | "contact-request-answered"
      | "contact-received";
  }
>;

type SessionNotiProps = {
  className?: string;
  sessionId?: number;
  recipientId?: number | null;
  unavailable?: boolean;
};

export default function SessionNoti({
  className = "",
  sessionId,
  recipientId,
  unavailable = false,
}: SessionNotiProps) {
  const previewParams = new URLSearchParams(window.location.search);
  const notificationPreview =
    (previewParams.get("preview") === "notifications" ||
      previewParams.get("preview") === "notifications-empty") &&
    (import.meta.env.DEV || previewParams.has("showTest"));
  const emptyNotificationPreview =
    notificationPreview && previewParams.get("preview") === "notifications-empty";
  const previewNotice = notificationPreview
    ? previewParams.get("notice")
    : null;
  const [open, setOpen] = useState(false);
  const [dialogSide, setDialogSide] = useState<"left" | "right">("right");
  const [dialogPosition, setDialogPosition] = useState<CSSProperties>({});
  const [heartSenders, setHeartSenders] = useState<string[]>([]);
  const [receivedContacts, setReceivedContacts] = useState<ContactShare[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ContactRequest[]>(
    [],
  );
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
  const bellRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const previousHeartCount = useRef<number | null>(null);
  const previousHeartSenderIds = useRef<Set<number> | null>(null);
  const previousRequestIds = useRef<Set<number> | null>(null);
  const previousContactShareIds = useRef<Set<number> | null>(null);
  const previousOutgoingRequestStatuses = useRef<
    Map<number, ContactRequest["status"]>
  >(new Map());
  const loadedContextKey = useRef<string | null>(null);

  const alignOverlayToBell = useCallback(() => {
    const bellBounds = bellRef.current?.getBoundingClientRect();
    if (!bellBounds) return;
    const viewportWidth = document.documentElement.clientWidth;
    const side =
      bellBounds.left + bellBounds.width / 2 < viewportWidth / 2
        ? "left"
        : "right";
    setDialogSide(side);
    setDialogPosition({
      top: `${bellBounds.bottom + 8}px`,
      left: side === "left" ? `${Math.max(16, bellBounds.left)}px` : "auto",
      right:
        side === "right"
          ? `${Math.max(16, viewportWidth - bellBounds.right)}px`
          : "auto",
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.showModal();
    return () => dialogRef.current?.close();
  }, [open]);

  const loadNotifications = useCallback(
    async (announceArrival = false) => {
      setLoading(true);
      setError("");
      try {
        const [heartResult, contactResult, requestResult] =
          await Promise.allSettled([
            sessionId ? getHeartStatus(sessionId) : Promise.resolve(null),
            getContactShares("RECEIVED"),
            getContactRequests(),
          ]);
        const apiHeartCount =
          heartResult.status === "fulfilled"
            ? (heartResult.value?.receivedCount ?? 0)
            : 0;
        const apiHeartSenders =
          heartResult.status === "fulfilled"
            ? (heartResult.value?.receivedFrom ?? [])
                .map((sender) => sender.senderAlias?.trim())
                .filter((alias): alias is string => Boolean(alias))
            : [];
        const nextHeartSenderIds =
          heartResult.status === "fulfilled"
            ? (heartResult.value?.receivedFrom ?? []).map(
                (sender) => sender.senderId,
              )
            : [];
        const previewHeartSenders = [
          "구름산책",
          "달빛수집가",
          "별빛산책",
          "포근한토끼",
          "노을빛",
          "초록정원",
          "말랑복숭아",
          "느긋한고양이",
          "바람결",
          "작은행성",
        ];
        const nextHeartCount = notificationPreview
          ? emptyNotificationPreview
            ? 0
            : previewHeartSenders.length
          : apiHeartCount;
        const nextHeartSenders = notificationPreview
          ? emptyNotificationPreview
            ? []
            : previewHeartSenders
          : apiHeartSenders.length > 0
            ? apiHeartSenders
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
        const previewContactData: Array<
          Pick<
            ContactShare,
            "id" | "senderId" | "senderAlias" | "contactType" | "contactValue"
          >
        > = [
          {
            id: -20,
            senderId: 6,
            senderAlias: "별빛산책",
            contactType: "PHONE",
            contactValue: "010-1234-5678",
          },
          {
            id: -21,
            senderId: 8,
            senderAlias: "초록정원",
            contactType: "INSTAGRAM",
            contactValue: "@green_garden",
          },
          {
            id: -22,
            senderId: 9,
            senderAlias: "바람결",
            contactType: "PHONE",
            contactValue: "010-9876-5432",
          },
        ];
        const previewContacts: ContactShare[] = previewContactData.map(
          (contact) => ({
            ...contact,
            sessionId: sessionId ?? 1,
            receiverId: recipientId ?? 1,
            shareType: "REQUEST_ACCEPTED",
            createdAt: new Date().toISOString(),
            sessionStartTime: new Date().toISOString(),
            receiverAlias: null,
          }),
        );
        const nextContacts = notificationPreview
          ? emptyNotificationPreview
            ? []
            : previewContacts
          : apiContacts;
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
                  recipientId != null &&
                  (item.targetId === recipientId ||
                    (item.requesterId === recipientId &&
                      (item.status === "ACCEPTED" ||
                        item.status === "DECLINED"))),
              )
            : [];
        const previewRequestData: Array<
          Pick<
            ContactRequest,
            "requesterId" | "targetId" | "status" | "contactType"
          >
        > = [
          {
            requesterId: 2,
            targetId: recipientId ?? 1,
            status: "PENDING",
            contactType: "PHONE",
          },
          {
            requesterId: 3,
            targetId: recipientId ?? 1,
            status: "PENDING",
            contactType: "INSTAGRAM",
          },
          {
            requesterId: 4,
            targetId: recipientId ?? 1,
            status: "ACCEPTED",
            contactType: "PHONE",
          },
          {
            requesterId: 5,
            targetId: recipientId ?? 1,
            status: "DECLINED",
            contactType: "PHONE",
          },
          {
            requesterId: recipientId ?? 1,
            targetId: 6,
            status: "ACCEPTED",
            contactType: "PHONE",
          },
          {
            requesterId: recipientId ?? 1,
            targetId: 7,
            status: "DECLINED",
            contactType: "INSTAGRAM",
          },
        ];
        const previewRequests: ContactRequest[] = previewRequestData.map(
          (request, index) => ({
            id: -(index + 1),
            sessionId: sessionId ?? 1,
            ...request,
            chargedGem: 0,
            createdAt: new Date(Date.now() - index * 60_000).toISOString(),
            respondedAt:
              request.status === "PENDING" ? null : new Date().toISOString(),
          }),
        );
        const nextRequests = notificationPreview
          ? emptyNotificationPreview
            ? []
            : [...apiRequests, ...previewRequests]
          : apiRequests;
        if (announceArrival) {
          const arrivals: Array<
            "heart" | "contact" | "contact-accepted" | "contact-share"
          > = [];
          if (
            heartResult.status === "fulfilled" &&
            previousHeartCount.current != null &&
            (nextHeartSenderIds.length > 0 &&
            previousHeartSenderIds.current != null
              ? nextHeartSenderIds.some(
                  (senderId) => !previousHeartSenderIds.current?.has(senderId),
                )
              : nextHeartCount > previousHeartCount.current)
          ) {
            arrivals.push("heart");
          }
          if (
            requestResult.status === "fulfilled" &&
            previousRequestIds.current &&
            nextRequests.some(
              (request) =>
                request.targetId === recipientId &&
                !previousRequestIds.current?.has(request.id),
            )
          ) {
            arrivals.push("contact");
          }
          if (
            contactResult.status === "fulfilled" &&
            previousContactShareIds.current &&
            nextContacts.some(
              (contact) => !previousContactShareIds.current?.has(contact.id),
            )
          ) {
            arrivals.push("contact-share");
          }
          if (requestResult.status === "fulfilled" && recipientId != null) {
            const respondedOutgoingRequest = requestHistory.some(
              (request) =>
                request.requesterId === recipientId &&
                (request.status === "ACCEPTED" ||
                  request.status === "DECLINED") &&
                previousOutgoingRequestStatuses.current.get(request.id) ===
                  "PENDING",
            );
            if (respondedOutgoingRequest) arrivals.push("contact-accepted");
          }
          if (arrivals.length && !open) {
            alignOverlayToBell();
            setArrivalQueue((current) => [...current, ...arrivals]);
          }
        }
        if (heartResult.status === "fulfilled") {
          previousHeartCount.current = nextHeartCount;
          if (heartResult.value?.receivedFrom) {
            previousHeartSenderIds.current = new Set(nextHeartSenderIds);
          }
        }
        if (requestResult.status === "fulfilled") {
          previousRequestIds.current = new Set(
            nextRequests.map((request) => request.id),
          );
          if (recipientId != null) {
            previousOutgoingRequestStatuses.current = new Map(
              requestHistory
                .filter((request) => request.requesterId === recipientId)
                .map((request) => [request.id, request.status]),
            );
          }
        }
        if (contactResult.status === "fulfilled") {
          previousContactShareIds.current = new Set(
            nextContacts.map((contact) => contact.id),
          );
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
    },
    [alignOverlayToBell, notificationPreview, open, recipientId, sessionId],
  );

  useEffect(() => {
    if (sessionId == null || recipientId == null) return;
    const contextKey = `${sessionId}:${recipientId}`;
    if (loadedContextKey.current !== contextKey) {
      loadedContextKey.current = contextKey;
      void loadNotifications();
    } else if (open) {
      void loadNotifications();
    }
  }, [loadNotifications, open, recipientId, sessionId]);

  useEffect(() => {
    const handleLiveNotification = (event: Event) => {
      const message = (event as CustomEvent<LiveNotificationMessage>).detail;
      if (!message || message.sessionId !== sessionId) return;

      let arrival: (typeof arrivalQueue)[number];
      if (message.kind === "heart-received") {
        arrival = "heart";
        previousHeartCount.current = message.receivedCount;
        previousHeartSenderIds.current ??= new Set();
        previousHeartSenderIds.current.add(message.senderId);
      } else if (message.kind === "contact-requested") {
        arrival = "contact";
        previousRequestIds.current?.add(message.id);
      } else if (message.kind === "contact-request-answered") {
        arrival = "contact-accepted";
        previousRequestIds.current?.add(message.id);
        previousOutgoingRequestStatuses.current.set(
          message.id,
          message.status === "REJECTED" ? "DECLINED" : message.status,
        );
      } else {
        arrival = "contact-share";
        previousContactShareIds.current?.add(message.shareId);
      }

      if (!open) {
        alignOverlayToBell();
        setArrivalQueue((current) => [...current, arrival]);
      }
      void loadNotifications();
    };

    window.addEventListener("kiiwee:live-notification", handleLiveNotification);
    return () =>
      window.removeEventListener(
        "kiiwee:live-notification",
        handleLiveNotification,
      );
  }, [alignOverlayToBell, loadNotifications, open, sessionId]);

  useEffect(() => {
    if (arrivalQueue.length > 0 && !open) alignOverlayToBell();
  }, [alignOverlayToBell, arrivalQueue.length, open]);

  async function answerRequest(request: ContactRequest, accept: boolean) {
    if (request.id < 0) {
      setIncomingRequests((items) =>
        items.map((item) =>
          item.id === request.id
            ? { ...item, status: accept ? "ACCEPTED" : "DECLINED" }
            : item,
        ),
      );
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
    alignOverlayToBell();
    setArrivalQueue((current) => current.slice(1));
    setOpen(true);
    if (!unavailable) void loadNotifications();
  }

  const receivedRequests = incomingRequests.filter(
    (request) => request.targetId === recipientId,
  );
  const sentRequestResponses = incomingRequests.filter(
    (request) =>
      request.requesterId === recipientId && request.status !== "PENDING",
  );
  const contactsLinkedToResponses = new Set(
    sentRequestResponses
      .filter((request) => request.status === "ACCEPTED")
      .map(
        (request) =>
          receivedContacts.find(
            (contact) =>
              contact.sessionId === request.sessionId &&
              contact.senderId === request.targetId,
          )?.id,
      )
      .filter((id): id is number => id != null),
  );
  const standaloneReceivedContacts = receivedContacts.filter(
    (contact) => !contactsLinkedToResponses.has(contact.id),
  );

  return (
    <>
      <BellButton
        ref={bellRef}
        className={className}
        type="button"
        aria-label="알림함 열기"
        onClick={openNotifications}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
      </BellButton>
      {createPortal(
      <>
      <NoticeDialog
        style={dialogPosition}
        data-side={dialogSide}
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <h2 id={titleId}>알림함</h2>
        <button
          className="refresh-button"
          type="button"
          aria-label="알림함 새로고침"
          title="알림함 새로고침"
          disabled={loading || unavailable}
          onClick={() => void loadNotifications()}
        >
          ↻
        </button>
        <button
          className="close-button"
          type="button"
          aria-label="알림함 닫기"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
        {unavailable ? (
          <p>알림을 불러올 수 없습니다.</p>
        ) : loading ? (
          <p>알림을 불러오는 중이에요…</p>
        ) : (
          <>
            {error && <p role="alert">{error}</p>}
            <section className="notification-group">
              <h3>하트</h3>
              <div className="notification-list heart-notification-list">
                {heartSenders.length === 0 ? (
                  <p className="empty-notifications">도착한 알림이 없습니다.</p>
                ) : (
                  heartSenders.map((sender, index) => (
                    <p className="heart-notification" key={`heart-${index}`}>
                      <strong>{sender}</strong>
                      {sender === "상대방" ? "" : "님"}이{" "}
                      <i aria-hidden="true">♥</i>를 보냈어요
                    </p>
                  ))
                )}
              </div>
            </section>
            <section className="notification-group contact-group">
              <h3>연락처</h3>
              <div className="notification-list">
                {receivedRequests.length > 0 && (
                  <div
                    className="contact-notification-section"
                    aria-label="받은 연락처 요청"
                  >
                    {receivedRequests.map((request) => {
                      const partnerName = requestPartnerName(
                        request.sessionId,
                        request.requesterId,
                        request.id < 0,
                      );
                      return (
                        <article
                          className="contact-request-item"
                          key={request.id}
                        >
                          <p>
                            <strong>{partnerName}</strong>님이{" "}
                            {request.contactType === "PHONE"
                              ? "전화번호"
                              : "인스타그램"}{" "}
                            요청을 보냈어요
                          </p>
                          <div className="notification-actions">
                            {request.status === "PENDING" ? (
                              <>
                                <button
                                  type="button"
                                  className="accept-request"
                                  aria-label={`${partnerName} 연락처 요청 수락`}
                                  disabled={busyRequestId === request.id}
                                  onClick={() =>
                                    void answerRequest(request, true)
                                  }
                                >
                                  수락
                                </button>
                                <button
                                  type="button"
                                  className="decline-request"
                                  aria-label={`${partnerName} 연락처 요청 거절`}
                                  disabled={busyRequestId === request.id}
                                  onClick={() =>
                                    void answerRequest(request, false)
                                  }
                                >
                                  거절
                                </button>
                              </>
                            ) : (
                              <span className="request-response-label">
                                {request.status === "ACCEPTED"
                                  ? "수락했습니다"
                                  : "거절했습니다"}
                              </span>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
                {sentRequestResponses.length > 0 && (
                  <div
                    className="contact-notification-section"
                    aria-label="내가 보낸 요청 응답"
                  >
                    {sentRequestResponses.map((request) => {
                      const partnerName = requestPartnerName(
                        request.sessionId,
                        request.targetId,
                        request.id < 0,
                      );
                      const matchingContact =
                        request.status === "ACCEPTED"
                          ? receivedContacts.find(
                              (contact) =>
                                contact.sessionId === request.sessionId &&
                                contact.senderId === request.targetId,
                            )
                          : null;
                      return (
                        <article
                          className="contact-request-item"
                          key={request.id}
                        >
                          <div className="contact-request-copy">
                            <p>
                              <strong>{partnerName}</strong>님이 연락처 요청을{" "}
                              {request.status === "ACCEPTED"
                                ? "수락했어요"
                                : "거절했어요"}
                            </p>
                            {matchingContact && (
                              <div className="contact-value">
                                <span>
                                  {matchingContact.contactType === "PHONE"
                                    ? "전화번호"
                                    : "인스타그램"}
                                </span>
                                <strong>
                                  {matchingContact.contactValue ??
                                    "연락처 정보가 없어요."}
                                </strong>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
                {standaloneReceivedContacts.length > 0 && (
                  <div
                    className="contact-notification-section"
                    aria-label="받은 연락처"
                  >
                    {standaloneReceivedContacts.map((contact) => (
                      <article className="contact-share-item" key={contact.id}>
                        <p>
                          <strong>{contact.senderAlias ?? "상대방"}</strong>
                          {contact.senderAlias ? "님" : ""}이 보낸 연락처가
                          도착했어요
                        </p>
                        <div className="contact-value">
                          <span>
                            {contact.contactType === "PHONE"
                              ? "전화번호"
                              : "인스타그램"}
                          </span>
                          <strong>
                            {contact.contactValue ?? "연락처 정보가 없어요."}
                          </strong>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {receivedRequests.length === 0 &&
                  sentRequestResponses.length === 0 &&
                  standaloneReceivedContacts.length === 0 && (
                    <p className="empty-notifications">
                      도착한 알림이 없습니다.
                    </p>
                  )}
              </div>
            </section>
          </>
        )}
      </NoticeDialog>
      {arrivalQueue[0] && !open && (
        <ArrivalPopover
          style={dialogPosition}
          data-side={dialogSide}
          role="alertdialog"
          aria-labelledby={`${titleId}-arrival-title`}
        >
          <h2 id={`${titleId}-arrival-title`}>
            <span>띠롱!</span>
            <span>새로운 알림이 있어요.</span>
          </h2>
          <button type="button" onClick={openNotifications}>
            알림함 열기
          </button>
        </ArrivalPopover>
      )}
      </>,
      document.body,
      )}
    </>
  );
}

function requestPartnerName(
  sessionId: number,
  memberId: number,
  preview = false,
) {
  if (preview) {
    return (
      (
        {
          2: "구름산책",
          3: "달빛수집가",
          4: "별빛산책",
          5: "포근한토끼",
          6: "말랑복숭아",
          7: "노을빛",
        } as Record<number, string>
      )[memberId] ?? "상대방"
    );
  }
  try {
    const stored = sessionStorage.getItem(
      `kiiwee.session-context:${sessionId}`,
    );
    const context = stored
      ? (JSON.parse(stored) as {
          partners?: Array<{
            memberId: number;
            nickname: string;
            roundNumber: number;
          }>;
        })
      : null;
    const partner = context?.partners?.find(
      (item) => item.memberId === memberId,
    );
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
  &:hover {
    background: #2b302c08;
  }
  svg {
    width: 2.8rem;
    height: 2.8rem;
  }
`;

const NoticeDialog = styled.dialog`
  position: fixed;
  z-index: 10000;
  top: 7.2rem;
  right: max(calc((100vw - 43rem) / 2 + 1.6rem), 1.6rem);
  left: auto;
  bottom: auto;
  margin: 0;
  width: min(34rem, calc(100vw - 3.2rem));
  height: auto;
  max-height: min(80vh, 58rem);
  min-height: 0;
  display: none;
  flex-direction: column;
  overflow: visible;
  padding: 2rem;
  border: 0;
  border-radius: 2rem;
  background: var(--background);
  color: var(--ink);
  font-family: var(--font-body);
  box-shadow: 0 1.6rem 7rem #1113;
  &[open] {
    display: flex;
  }
  &::backdrop {
    background: #222b2533;
  }
  h2 {
    margin: 0;
    padding: 0 3.6rem 1.2rem 0;
    border-bottom: 0.2rem solid #9aa49b;
    font: 600 1.8rem/1.4 var(--display-font);
  }
  button.close-button {
    position: absolute;
    top: 1.2rem;
    right: 1.4rem;
    display: grid;
    width: 3.2rem;
    min-height: 3.2rem;
    place-items: center;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    font: 400 2.8rem/1 var(--font-body);
    cursor: pointer;
  }
  button.refresh-button {
    position: absolute;
    top: 1.4rem;
    right: 5.2rem;
    display: grid;
    width: 3.2rem;
    height: 3.2rem;
    min-height: 3.2rem;
    place-items: center;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #66705f;
    font: 400 2rem/1 var(--font-body);
    cursor: pointer;
  }
  button.refresh-button:hover:not(:disabled) {
    background: #edf2e8;
  }
  button.refresh-button:disabled {
    opacity: 0.45;
    cursor: wait;
  }
  p {
    margin-top: 1.2rem;
    color: var(--text-secondary);
    font-size: 1.4rem;
    line-height: 1.6;
  }
  button {
    display: grid;
    width: 100%;
    min-height: 4.2rem;
    place-items: center;
    margin-top: 1.6rem;
    border: 0.1rem solid var(--ink);
    border-radius: 1rem;
    background: var(--green);
    color: var(--ink);
    font: 500 1.4rem var(--font-body);
  }
  .notification-group {
    flex: 0 0 auto;
    margin-top: 1.2rem;
  }
  .notification-group + .notification-group {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 0.2rem solid #9aa49b;
  }
  .notification-group h3 {
    margin: 0;
    padding-bottom: 0.8rem;
    border-bottom: 0.1rem solid #dfe4df;
    font: 500 1.4rem/1.4 var(--display-font);
    text-align: center;
  }
  .notification-list {
    display: grid;
    gap: 1rem;
    padding: 1rem 1.2rem 0;
  }
  .empty-notifications {
    margin: 0;
    padding: 0.8rem 0;
    color: var(--text-secondary);
    font-size: 1.3rem;
  }
  .heart-notification-list {
    max-height: 8.1rem;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .contact-group {
    display: flex;
    min-height: 0;
    flex: 0 1 auto;
    flex-direction: column;
    overflow: hidden;
  }
  .contact-group > .notification-list {
    min-height: 0;
    max-height: min(40vh, 28rem);
    flex: 0 1 auto;
    overflow-y: auto;
    align-content: start;
    overscroll-behavior: contain;
  }
  .heart-notification-list,
  .contact-group > .notification-list {
    scrollbar-width: thin;
    scrollbar-color: #c7cec5 transparent;
  }
  .heart-notification-list::-webkit-scrollbar,
  .contact-group > .notification-list::-webkit-scrollbar {
    width: 0.4rem;
  }
  .heart-notification-list::-webkit-scrollbar-track,
  .contact-group > .notification-list::-webkit-scrollbar-track {
    background: transparent;
  }
  .heart-notification-list::-webkit-scrollbar-thumb,
  .contact-group > .notification-list::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: #c7cec5;
  }
  .contact-notification-section {
    display: grid;
    gap: 1rem;
  }
  .contact-notification-section + .contact-notification-section {
    padding-top: 1rem;
    border-top: 0.1rem solid #dfe4df;
  }
  .heart-notification,
  .contact-request-item > p,
  .contact-request-copy > p,
  .contact-share-item > p {
    margin: 0;
    color: var(--ink);
    font-size: 1.35rem;
    font-weight: 400;
    line-height: 1.5;
  }
  .heart-notification strong,
  .contact-request-item strong,
  .contact-share-item > p strong {
    font-weight: 700;
  }
  .heart-notification i {
    color: #f14b79;
    font: 700 1.5rem/1 var(--font-body);
  }
  .contact-request-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .contact-request-copy {
    min-width: 0;
    flex: 1;
  }
  .request-response-label {
    display: grid;
    width: 10.7rem;
    min-height: 3.4rem;
    flex: 0 0 auto;
    place-items: center;
    color: var(--text-secondary);
    font-size: 1.15rem;
    text-align: center;
  }
  .contact-share-item {
    padding: 0;
  }
  .notification-actions {
    display: flex;
    flex: 0 0 auto;
    gap: 0.7rem;
  }
  .notification-actions button {
    display: grid;
    min-width: 5rem;
    min-height: 3.4rem;
    place-items: center;
    margin: 0;
    padding: 0 1rem;
    border: 0;
    border-radius: 999px;
    font: 600 1.15rem/1 var(--font-body);
    cursor: pointer;
  }
  .notification-actions .accept-request {
    background: #dfff83;
    color: #4f7820;
  }
  .notification-actions .decline-request {
    background: #e6e9e3;
    color: #7d8579;
  }
  .notification-actions button:disabled {
    opacity: 0.55;
    cursor: wait;
  }
  .contact-value {
    display: grid;
    gap: 0.35rem;
    margin-top: 0.8rem;
    padding: 1rem 1.2rem;
    border: 0.1rem solid #dfe4df;
    border-radius: 1rem;
    background: #f7f9f4;
  }
  .contact-value span {
    color: var(--text-secondary);
    font-size: 1.1rem;
  }
  .contact-value strong {
    color: var(--ink);
    font-size: 1.25rem;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
`;

const ArrivalPopover = styled.aside`
  position: fixed;
  z-index: 10000;
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
  h2 {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
    margin: 0;
    font: 600 1.7rem/1.3 var(--display-font);
  }
  > button:last-child {
    display: grid;
    width: 100%;
    min-height: 3.8rem;
    place-items: center;
    margin: 0;
    padding: 0.6rem 1rem;
    border: 0;
    border-radius: 1rem;
    background: #011020;
    color: #fff;
    font: 600 1.3rem var(--font-body);
    cursor: pointer;
  }
  > button:last-child:hover {
    background: #172532;
  }
  @media (max-width: 34rem) {
    gap: 0.8rem;
    padding: 1.6rem 1.4rem;
    h2 {
      font-size: 1.45rem;
    }
    > button:last-child {
      min-height: 3.6rem;
      font-size: 1.2rem;
    }
  }
`;
