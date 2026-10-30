import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import PageHeader from "../components/common/PageHeader";
import { getMyWallet } from "../features/wallet/api";
import { getMyMember } from "../features/members/api";
import { connectLiveSession } from "../features/live/stomp";
import { getContactShares, type ContactShare } from "../features/records/api";
import {
  getContactRequests,
  closeResultsWindow,
  requestContact,
  sendContact,
  type ContactRequest,
  type ContactType,
} from "../features/sessions/interactionApi";

type Partner = { memberId: number; nickname: string; roundNumber: number };

export default function Contact() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = Number(params.get("sessionId"));
  const preview =
    params.has("preview") && (import.meta.env.DEV || params.has("showTest"));
  const [gems, setGems] = useState(0);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [shares, setShares] = useState<ContactShare[]>([]);
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [myMemberId, setMyMemberId] = useState<number | null>(null);
  const [contactType, setContactType] = useState<ContactType>("PHONE");
  const [availableContactTypes, setAvailableContactTypes] = useState<ContactType[]>([]);
  const [contactTarget, setContactTarget] = useState<{
    partner: Partner;
    action: "send" | "request";
  } | null>(null);
  const [instagramFallbackTarget, setInstagramFallbackTarget] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [wallet, sent, received, requestHistory, member] = await Promise.all([
      getMyWallet(),
      getContactShares("SENT"),
      getContactShares("RECEIVED"),
      getContactRequests(),
      getMyMember(),
    ]);
    setGems(wallet.gemBalance);
    setShares([...sent.items, ...received.items]);
    setRequests(requestHistory.items);
    setAvailableContactTypes([
      ...(member.phoneNumber ? ["PHONE" as const] : []),
      ...(member.instagramId ? ["INSTAGRAM" as const] : []),
    ]);
  }, []);

  useEffect(() => {
    if (preview) {
      setPartners([
        { memberId: 2, nickname: "구름산책", roundNumber: 1 },
        { memberId: 3, nickname: "달빛수집가", roundNumber: 2 },
      ]);
      setMyMemberId(1);
      setGems(5);
      setAvailableContactTypes(["PHONE", "INSTAGRAM"]);
      setRequests([
        {
          id: 900,
          sessionId: 1,
          requesterId: 3,
          targetId: 1,
          contactType: "PHONE",
          status: "PENDING",
          chargedGem: 0,
          createdAt: new Date().toISOString(),
          respondedAt: null,
        },
      ]);
      setLoading(false);
      return;
    }
    const stored = sessionId
      ? sessionStorage.getItem(`kiiwee.session-context:${sessionId}`)
      : null;
    if (stored) {
      try {
        const context = JSON.parse(stored) as {
          partners?: Partner[];
          myMemberId?: number;
        };
        setPartners(context.partners ?? []);
        setMyMemberId(context.myMemberId ?? null);
      } catch {
        /* 잘못된 임시 화면 상태는 무시하고 안내를 표시 */
      }
    }
    let active = true;
    refresh()
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "연락처 정보를 불러오지 못했어요.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId, preview, refresh]);

  useEffect(() => {
    const reload = () => {
      void refresh().catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "연락처 정보를 불러오지 못했어요.",
        ),
      );
    };
    window.addEventListener("kiiwee:contact-updated", reload);
    return () => window.removeEventListener("kiiwee:contact-updated", reload);
  }, [refresh]);

  useEffect(() => {
    if (!sessionId || preview) return;
    const live = connectLiveSession(
      sessionId,
      (message) => {
        if (
          message.kind !== "heart-received" &&
          message.kind !== "contact-requested" &&
          message.kind !== "contact-request-answered" &&
          message.kind !== "contact-received"
        ) {
          return;
        }
        window.dispatchEvent(
          new CustomEvent("kiiwee:live-notification", { detail: message }),
        );
        if (message.kind !== "heart-received") {
          void refresh().catch((cause) =>
            setError(
              cause instanceof Error
                ? cause.message
                : "연락처 정보를 불러오지 못했어요.",
            ),
          );
        }
      },
      () => {},
      () => {},
      { joinSession: false },
    );
    return () => live?.disconnect();
  }, [preview, refresh, sessionId]);

  async function runAction(
    memberId: number,
    action: "send" | "request",
    selectedType = contactType,
  ) {
    setBusyId(memberId);
    setError("");
    try {
      if (preview) {
        const now = new Date().toISOString();
        if (action === "send") {
          setShares((items) => [
            ...items,
            {
              id: Date.now(),
              sessionId,
              senderId: 1,
              receiverId: memberId,
              contactType: selectedType,
              contactValue:
                selectedType === "PHONE" ? "010-1234-5678" : "@kiiwee_demo",
              shareType: "MANUAL",
              createdAt: now,
              sessionStartTime: now,
              senderAlias: "내 닉네임",
              receiverAlias:
                partners.find((person) => person.memberId === memberId)
                  ?.nickname ?? null,
            },
          ]);
        } else {
          setRequests((items) => [
            ...items,
            {
              id: Date.now(),
              sessionId,
              requesterId: 1,
              targetId: memberId,
              contactType: selectedType,
              status: "PENDING",
              chargedGem: 0,
              createdAt: now,
              respondedAt: null,
            },
          ]);
        }
        return true;
      }
      await closeResultsWindow(sessionId);
      if (action === "send")
        await sendContact(sessionId, memberId, selectedType);
      else await requestContact(sessionId, memberId, selectedType);
      await refresh();
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      if (
        action === "request" &&
        selectedType === "INSTAGRAM" &&
        isInstagramUnavailable(cause, message)
      ) {
        const partner = partners.find((item) => item.memberId === memberId);
        if (partner) {
          setInstagramFallbackTarget(partner);
          return false;
        }
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "연락처 교환을 처리하지 못했어요.",
      );
      return false;
    } finally {
      setBusyId(null);
    }
  }

  function openContactTarget(partner: Partner, action: "send" | "request") {
    setError("");
    setContactType(
      action === "send" && !availableContactTypes.includes("PHONE") &&
        availableContactTypes.includes("INSTAGRAM")
        ? "INSTAGRAM"
        : "PHONE",
    );
    setContactTarget({ partner, action });
  }

  return (
    <ContactPage>
      <PageHeader
        title="마지막 단계"
        gems={gems}
        onGemsChange={setGems}
        sessionId={sessionId > 0 ? sessionId : undefined}
        recipientId={myMemberId}
      />

      <main>
        <section className="intro">
          <h2>연락처 주고받기</h2>
          <p>마음이 통했다면 연락처를 교환해보세요.</p>
          {preview && (
            <span className="preview-badge">화면 미리보기 · 샘플 데이터</span>
          )}
          {sessionId > 0 && !preview && (
            <button
              type="button"
              className="refresh"
              onClick={() => {
                setLoading(true);
                refresh()
                  .catch((cause) =>
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "연락처 정보를 불러오지 못했어요.",
                    ),
                  )
                  .finally(() => setLoading(false));
              }}
            >
              새로고침
            </button>
          )}
        </section>

        {!sessionId ? (
          <section className="pending-card" role="status">
            <h2>세션 정보가 없어요</h2>
            <p>결과 화면에서 연락처 교환을 열어주세요.</p>
          </section>
        ) : loading ? (
          <section className="pending-card" role="status">
            <p>연락처 정보를 불러오는 중이에요…</p>
          </section>
        ) : (
          <>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {!partners.length && (
              <section className="pending-card" role="status">
                <h2>대화 상대 정보가 없어요</h2>
                <p>
                  세션 화면에서 대화 상대 정보가 전달되지 않았습니다. 세션을
                  다시 열고 결과 화면으로 이동해주세요.
                </p>
              </section>
            )}
            <section className="partner-list" aria-label="대화 상대 목록">
              {partners.map((partner, index) => {
                const sent = shares.some(
                  (item) =>
                    item.sessionId === sessionId &&
                    item.senderId === myMemberId &&
                    item.receiverId === partner.memberId,
                );
                const received = shares.some(
                  (item) =>
                    item.sessionId === sessionId &&
                    item.receiverId === myMemberId &&
                    item.senderId === partner.memberId,
                );
                const outgoingRequest = requests.some(
                  (item) =>
                    item.sessionId === sessionId &&
                    item.requesterId === myMemberId &&
                    item.targetId === partner.memberId &&
                    item.status === "PENDING",
                );
                return (
                  <article className="partner-card" key={partner.memberId}>
                    <div
                      className={`avatar tone-${index % 2}`}
                      aria-label={`${partner.nickname} 프로필 사진`}
                    >
                      <span>{Array.from(partner.nickname)[0]}</span>
                    </div>
                    <div className="partner-info">
                      <span className="round">
                        {partner.roundNumber}번째 대화
                      </span>
                      <h2>{partner.nickname}</h2>
                      {received &&
                        shares
                          .filter(
                            (item) =>
                              item.sessionId === sessionId &&
                              item.receiverId === myMemberId &&
                              item.senderId === partner.memberId,
                          )
                          .map((item) => (
                            <small key={item.id}>
                              받은 연락처 ·{" "}
                              {item.contactValue ?? "삭제된 연락처"}
                            </small>
                          ))}
                    </div>
                    <div className="actions">
                      <button
                        type="button"
                        className={sent ? "receive sent" : ""}
                        disabled={
                          !myMemberId ||
                          busyId === partner.memberId ||
                          sent ||
                          gems < 1
                        }
                        onClick={() => {
                          if (!sent) openContactTarget(partner, "send");
                        }}
                      >
                        {sent ? "전송 완료" : "연락처 보내기"}
                      </button>
                      <button
                        type="button"
                        className={`receive${outgoingRequest ? " pending" : ""}`}
                        disabled={
                          !myMemberId ||
                          received ||
                          outgoingRequest ||
                          busyId === partner.memberId
                        }
                        onClick={() => {
                          if (!outgoingRequest && !received)
                            openContactTarget(partner, "request");
                        }}
                      >
                        {received
                          ? "받음"
                          : outgoingRequest
                            ? "응답 대기 중"
                            : "연락처 요청하기"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}

        <section className="guide" aria-label="연락처 교환 안내">
          <p>
            내 연락처 보내기는 보석 1개를 사용합니다. 연락처 요청은 상대가
            수락하면 요청자에게 보석 1개가 차감됩니다. 매칭된 상대의 연락처는
            무료로 공유될 수 있습니다.
          </p>
          <p>
            주고받은 연락처는 마이페이지에서 확인할 수 있습니다. 세션이 종료되면
            세션 정보는 삭제되지만 연락처 기록은 남습니다.
          </p>
          <span>연락처 주고받기에는 보석이 사용됩니다.</span>
        </section>
      </main>

      {contactTarget && !instagramFallbackTarget && (
        <div
          className="send-modal-backdrop"
          role="presentation"
          onClick={() => setContactTarget(null)}
        >
          <section
            className="send-contact-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-contact-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="send-modal-close"
              type="button"
              aria-label="닫기"
              onClick={() => setContactTarget(null)}
            >
              ×
            </button>
            <p className="send-modal-round">
              {contactTarget.partner.roundNumber}번째 대화에서 만났어요
            </p>
            <h2 id="send-contact-title">{contactTarget.partner.nickname}</h2>
            {contactTarget.action === "send" ? (
              <div className="gem-cost">
                <span>차감 보석</span>
                <strong>
                  <span aria-hidden="true">◆</span> 1개
                </strong>
              </div>
            ) : (
              <p className="request-cost-note">
                상대방이 연락처 요청을 수락하면 보석 1개가 차감돼요.
              </p>
            )}
            <p className="contact-type-label">
              {contactTarget.action === "send"
                ? "보낼 연락처 종류를 선택해주세요"
                : "요청할 연락처 종류를 선택해주세요"}
            </p>
            <div
              className="contact-type-picker"
              role="group"
              aria-label={
                contactTarget.action === "send"
                  ? "보낼 연락처 종류"
                  : "요청할 연락처 종류"
              }
            >
              <button
                type="button"
                disabled={contactTarget.action === "send" && !availableContactTypes.includes("PHONE")}
                aria-pressed={contactType === "PHONE"}
                className={contactType === "PHONE" ? "selected" : ""}
                onClick={() => setContactType("PHONE")}
              >
                전화번호
              </button>
              <button
                type="button"
                disabled={contactTarget.action === "send" && !availableContactTypes.includes("INSTAGRAM")}
                aria-pressed={contactType === "INSTAGRAM"}
                className={contactType === "INSTAGRAM" ? "selected" : ""}
                onClick={() => setContactType("INSTAGRAM")}
              >
                인스타그램
              </button>
            </div>
            {contactTarget.action === "send" && availableContactTypes.length === 0 && (
              <p className="dialog-error" role="alert">
                보낼 연락처가 등록되어 있지 않아요. <a href="/mypage/me">마이페이지에서 전화번호나 인스타그램을 등록해주세요.</a>
              </p>
            )}
            {error && (
              <p className="dialog-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="send-contact-confirm"
              type="button"
              disabled={
                busyId === contactTarget.partner.memberId ||
                (contactTarget.action === "send" &&
                  (gems < 1 || !availableContactTypes.includes(contactType)))
              }
              onClick={async () => {
                const target = contactTarget;
                const completed = await runAction(
                  target.partner.memberId,
                  target.action,
                  contactType,
                );
                if (completed) setContactTarget(null);
              }}
            >
              {busyId === contactTarget.partner.memberId
                ? "처리 중…"
                : contactTarget.action === "send"
                  ? "연락처 보내기"
                  : "연락처 요청하기"}
            </button>
          </section>
        </div>
      )}

      {instagramFallbackTarget && (
        <div
          className="send-modal-backdrop"
          role="presentation"
          onClick={() => {
            setInstagramFallbackTarget(null);
            setContactTarget(null);
          }}
        >
          <section
            className="send-contact-dialog instagram-fallback-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="instagram-fallback-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="instagram-fallback-title">
              상대방의 인스타그램 아이디가 등록되어 있지 않아요.
            </h2>
            <p>대신 전화번호를 요청할까요?</p>
            <div className="instagram-fallback-actions">
              <button
                type="button"
                className="send-contact-confirm"
                disabled={busyId === instagramFallbackTarget.memberId}
                onClick={async () => {
                  const partner = instagramFallbackTarget;
                  setInstagramFallbackTarget(null);
                  setContactTarget(null);
                  await runAction(partner.memberId, "request", "PHONE");
                }}
              >예</button>
              <button
                type="button"
                className="send-contact-confirm fallback-cancel"
                onClick={() => {
                  setInstagramFallbackTarget(null);
                  setContactTarget(null);
                }}
              >아니요</button>
            </div>
          </section>
        </div>
      )}

      <a className="finish-button" href="/home">
        종료하기
      </a>
    </ContactPage>
  );
}

const ContactPage = styled.div`
  width: 100%;
  max-width: 43rem;
  min-height: 100dvh;
  margin: 0 auto;
  padding: calc(1.2rem + env(safe-area-inset-top)) 2.4rem
    calc(2.4rem + env(safe-area-inset-bottom));
  background: var(--background);
  color: var(--ink);
  box-shadow: 0 0 6rem #26372508;

  .intro {
    padding: 2.8rem 0 1.8rem;
    text-align: center;
  }
  .intro h2 {
    font: 400 2.3rem/1.3 var(--display-font);
  }
  .intro p {
    margin-top: 0.7rem;
    color: #899188;
    font-size: 1.2rem;
  }
  .refresh {
    margin-top: 0.8rem;
    padding: 0.6rem 1rem;
    border: 1px solid #e2e8dc;
    border-radius: 99px;
    background: #fff;
    color: #536057;
    font-size: 1rem;
  }
  .preview-badge {
    display: inline-block;
    margin-top: 0.8rem;
    padding: 0.4rem 0.8rem;
    border-radius: 99px;
    background: #f2ffd1;
    color: #6c832f;
    font-size: 1rem;
  }
  .pending-card {
    display: grid;
    min-height: 28rem;
    align-content: center;
    justify-items: center;
    gap: 1rem;
    padding: 2rem;
    border: 1px solid #e4e9df;
    border-radius: 1.8rem;
    background: white;
    text-align: center;
  }
  .error {
    margin-bottom: 1rem;
    color: #c7554a;
    font-size: 1.1rem;
  }
  .request-card {
    display: grid;
    gap: 1rem;
    margin: 1rem 0;
    padding: 1.3rem;
    border: 1px solid #e4e9df;
    border-radius: 1.2rem;
    background: #fff;
  }
  .pending-card h2 {
    font: 400 1.9rem/1.4 var(--display-font);
  }
  .pending-card p {
    max-width: 28rem;
    color: #818a7f;
    font-size: 1.25rem;
    line-height: 1.7;
  }
  .partner-list {
    display: grid;
    gap: 1rem;
  }
  .partner-card {
    display: grid;
    grid-template-columns: 5.4rem minmax(0, 1fr);
    align-items: center;
    gap: 1.2rem;
    padding: 1.4rem;
    border: 1px solid #e4e9df;
    border-radius: 1.8rem;
    background: #fff;
    box-shadow: 0 0.5rem 1.8rem #26372508;
  }
  .avatar {
    display: grid;
    width: 5.4rem;
    height: 5.4rem;
    place-items: center;
    border: 0.25rem solid #e2edc9;
    border-radius: 50%;
    background: #f0f7e2;
    color: #607d2f;
  }
  .avatar span {
    font: 400 2rem var(--display-font);
  }
  .avatar.tone-1 {
    border-color: #f0dfc9;
    background: #fff6e9;
    color: #8b6d51;
  }
  .partner-info {
    min-width: 0;
  }
  .round {
    color: #9ba494;
    font-size: 1rem;
  }
  .partner-info h2 {
    margin-top: 0.2rem;
    font: 400 1.6rem/1.3 var(--display-font);
  }
  .partner-info p {
    margin-top: 0.35rem;
    color: #8b938d;
    font-size: 1.05rem;
  }
  .partner-info p.accepted {
    color: #72932f;
  }
  .partner-info small {
    display: block;
    margin-top: 0.45rem;
    color: #72932f;
    font-size: 0.95rem;
    line-height: 1.4;
  }
  .actions {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }
  .actions button {
    display: flex;
    min-height: 4.2rem;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    border: 0;
    border-radius: 1rem;
    background: var(--green);
    color: var(--ink);
    font-size: 1.25rem;
    font-weight: 700;
  }
  .actions button.receive {
    border: 1px solid #e2e8dc;
    background: white;
  }
  .actions button.sent {
    background: #f0f2ed;
    color: #a1a89c;
  }
  .actions button.pending:disabled {
    border: 1px solid #e2e8dc;
    background: #fff;
    color: #a1a89c;
  }
  .actions button:disabled {
    border-color: #e5e8e2;
    background: #f0f2ed;
    color: #a1a89c;
  }
  .send-modal-backdrop {
    position: fixed;
    z-index: 60;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 2.4rem;
    background: #10161080;
  }
  .send-contact-dialog {
    position: relative;
    display: flex;
    width: min(100%, 34rem);
    max-height: calc(100dvh - 3.2rem);
    flex-direction: column;
    align-items: center;
    overflow-y: auto;
    padding: 3rem 2.4rem 2.4rem;
    border: 0.1rem solid #8b6d51;
    border-radius: 2rem;
    background: #fbfff1;
    color: #2b302c;
    box-shadow: 0 1rem 3rem #10161030;
    text-align: center;
  }
  .send-modal-close {
    position: absolute;
    top: 1rem;
    right: 1.2rem;
    display: grid;
    width: 3.2rem;
    height: 3.2rem;
    place-items: center;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #2b302c;
    font: 400 2.8rem/1 var(--font-body);
  }
  .send-modal-round {
    margin-top: 0.8rem;
    color: #899188;
    font: 500 1.4rem/1.4 var(--font-body);
  }
  .send-contact-dialog h2 {
    margin-top: 0.4rem;
    color: #2b302c;
    font: 700 2.4rem/1.3 var(--display-font);
  }
  .gem-cost {
    display: flex;
    width: 100%;
    min-height: 5.8rem;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 2rem;
    padding: 1.5rem 1.6rem;
    border-radius: 1.4rem;
    background: #f2f7e7;
    color: #899188;
    font: 400 1.4rem/1.4 var(--font-body);
    text-align: left;
  }
  .gem-cost strong {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    color: #2b302c;
    font-size: 1.8rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .gem-cost strong span {
    color: #31bfff;
  }
  .request-cost-note {
    width: 100%;
    margin-top: 1.6rem;
    color: #737e73;
    font-size: 1.1rem;
    line-height: 1.6;
  }
  .contact-type-label {
    margin: 1.8rem 0 0.9rem;
    color: #737e73;
    font-size: 1.2rem;
  }
  .contact-type-picker {
    display: grid;
    width: 100%;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }
  .contact-type-picker button {
    min-height: 4.5rem;
    border: 1px solid #e0e6dc;
    border-radius: 1.2rem;
    background: #fff;
    color: #536057;
    font-size: 1.2rem;
    font-weight: 650;
  }
  .contact-type-picker button.selected {
    border-color: #c8cec4;
    background: #e4e8df;
    color: #536057;
  }
  .dialog-error {
    margin-top: 1rem;
    color: #c7554a;
    font-size: 1.1rem;
    line-height: 1.5;
  }
  .send-contact-confirm {
    width: 100%;
    min-height: 5rem;
    margin-top: 1.6rem;
    border: 0;
    border-radius: 1.2rem;
    background: #e5ff76;
    color: #273219;
    font-size: 1.4rem;
    font-weight: 750;
  }
  .send-contact-confirm:disabled {
    background: #e4e8df;
    color: #929a8d;
  }
  .cancel-contact-dialog h2 {
    margin: 1rem 0 1.2rem;
  }
  .cancel-contact-dialog > p {
    color: #737e73;
    font-size: 1.2rem;
    line-height: 1.7;
  }
  .instagram-fallback-dialog h2 {
    margin: 1rem 0 0.8rem;
    font-size: 2rem;
    line-height: 1.5;
  }
  .instagram-fallback-dialog > p {
    color: #737e73;
    font-size: 1.35rem;
  }
  .instagram-fallback-actions {
    display: grid;
    width: 100%;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }
  .instagram-fallback-actions .send-contact-confirm {
    margin-top: 1.6rem;
  }
  .instagram-fallback-actions .fallback-cancel {
    border: 0.1rem solid #e0e6dc;
    background: #fff;
    color: #536057;
  }
  .guide {
    display: grid;
    gap: 1rem;
    margin-top: 1.4rem;
    padding: 1.5rem;
    border-radius: 1.4rem;
    background: #f5f8ef;
    color: #707a6e;
    font-size: 1.1rem;
    line-height: 1.7;
  }
  .guide span {
    color: #8a9b67;
    font-size: 1rem;
  }
  .finish-button {
    display: flex;
    min-height: 5.2rem;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
    border-radius: 1.4rem;
    background: #011020;
    color: white;
    font-weight: 700;
    text-decoration: none;
  }
  @media (max-width: 37.4rem) {
    padding-right: 2.4rem;
    padding-left: 2.4rem;
    .send-contact-dialog {
      padding: 3rem 2.4rem 2.4rem;
      border-radius: 2rem;
    }
  }
`;

function isInstagramUnavailable(cause: unknown, message: string) {
  const code =
    typeof cause === "object" && cause !== null && "code" in cause &&
    typeof cause.code === "string"
      ? cause.code
      : "";
  return (
    (/instagram|인스타그램/i.test(message) &&
      /(등록.{0,8}(없|않)|미등록|없어요|not.{0,12}registered|not.{0,12}found|unavailable|missing)/i.test(message)) ||
    /INSTAGRAM.*(NOT|MISSING|UNAVAILABLE|EMPTY)/i.test(code)
  );
}
