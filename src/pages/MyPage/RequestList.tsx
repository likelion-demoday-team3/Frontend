import { useEffect, useState } from "react";
import styled from "styled-components";
import { getAccessToken } from "../../features/auth/session";
import { getMyMember } from "../../features/members/api";
import {
  getContactRequests,
  respondToContactRequest,
  type ContactRequest,
  type ContactType,
} from "../../features/sessions/interactionApi";
import MyPageFrame, { Panel } from "./MyPageFrame";

type Tab = "SENT" | "RECEIVED";

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
const contactLabel = { PHONE: "전화번호", INSTAGRAM: "인스타그램" } as const;
const statusLabel = {
  PENDING: "응답 대기 중",
  ACCEPTED: "수락됨",
  REJECTED: "거절됨",
} as const;

/** 마이페이지 > 소개팅 기록 > 연락처 요청 기록. 보낸 요청과 받은 요청의 상태를 보고, 받은 요청에는 여기서 응답한다 */
export default function RequestList() {
  const [tab, setTab] = useState<Tab>("SENT");
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [myContactTypes, setMyContactTypes] = useState<ContactType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      setError("로그인 후 기록을 확인할 수 있어요.");
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([getContactRequests(), getMyMember()])
      .then(([history, member]) => {
        if (!active) return;
        setRequests(history.items);
        setMyContactTypes([
          ...(member.phoneNumber ? ["PHONE" as const] : []),
          ...(member.instagramId ? ["INSTAGRAM" as const] : []),
        ]);
        setError("");
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "기록을 불러오지 못했어요.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  async function respond(request: ContactRequest, accept: boolean) {
    setBusyId(request.id);
    setActionError("");
    try {
      const updated = await respondToContactRequest(
        request.sessionId,
        request.id,
        accept,
      );
      setRequests((items) =>
        items.map((item) =>
          item.id === request.id
            ? { ...item, status: updated.status, respondedAt: updated.respondedAt }
            : item,
        ),
      );
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "연락처 요청에 응답하지 못했어요.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const visible = requests.filter((item) => item.direction === tab);
  const pendingReceived = requests.filter(
    (item) => item.direction === "RECEIVED" && item.status === "PENDING",
  ).length;

  return (
    <MyPageFrame title="연락처 요청 기록" backHref="/mypage/record">
      <Panel>
        <Tabs aria-label="요청 방향">
          {(
            [
              { value: "SENT", label: "보낸 요청" },
              {
                value: "RECEIVED",
                label: pendingReceived
                  ? `받은 요청 (${pendingReceived})`
                  : "받은 요청",
              },
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              type="button"
              className={tab === item.value ? "selected" : ""}
              aria-pressed={tab === item.value}
              onClick={() => setTab(item.value)}
            >
              {item.label}
            </button>
          ))}
        </Tabs>
        {actionError && (
          <p className="error" role="alert">
            {actionError}
          </p>
        )}
        {loading ? (
          <Empty role="status">기록을 불러오는 중이에요…</Empty>
        ) : error ? (
          <Empty role="alert">
            {error}
            <br />
            <button type="button" onClick={() => setReload((value) => value + 1)}>
              다시 불러오기
            </button>
          </Empty>
        ) : visible.length ? (
          <Rows>
            {visible.map((item) => {
              const partnerAlias =
                (tab === "SENT" ? item.targetAlias : item.requesterAlias) ??
                "상대방";
              const canAnswer = tab === "RECEIVED" && item.status === "PENDING";
              const canAccept = myContactTypes.includes(item.contactType);
              return (
                <li key={item.id}>
                  <div className="row">
                    <div className="copy">
                      {item.sessionStartTime && (
                        <time dateTime={item.sessionStartTime}>
                          {dateLabel(item.sessionStartTime)} 소개팅
                        </time>
                      )}
                      <strong>
                        {tab === "SENT"
                          ? `${partnerAlias}님에게 ${contactLabel[item.contactType]} 요청`
                          : `${partnerAlias}님이 내 ${contactLabel[item.contactType]} 요청`}
                      </strong>
                      {tab === "SENT" && item.status === "ACCEPTED" && (
                        <a
                          className="link"
                          href={`/mypage/record/received?sessionId=${item.sessionId}&from=${item.targetId}`}
                        >
                          받은 연락처 보기 ›
                        </a>
                      )}
                    </div>
                    <span className={`badge ${item.status.toLowerCase()}`}>
                      {statusLabel[item.status]}
                    </span>
                  </div>
                  {canAnswer && (
                    <div className="answer">
                      {!canAccept && (
                        <p className="hint">
                          {contactLabel[item.contactType]}가 등록되어 있지 않아요.{" "}
                          <a href="/mypage/me">마이페이지에서 등록</a>하면 수락할 수
                          있어요.
                        </p>
                      )}
                      <div className="buttons">
                        <button
                          type="button"
                          disabled={!canAccept || busyId === item.id}
                          aria-label={`${partnerAlias} 연락처 요청 수락`}
                          onClick={() => void respond(item, true)}
                        >
                          수락
                        </button>
                        <button
                          type="button"
                          className="reject"
                          disabled={busyId === item.id}
                          aria-label={`${partnerAlias} 연락처 요청 거절`}
                          onClick={() => void respond(item, false)}
                        >
                          거절
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </Rows>
        ) : (
          <Empty role="status">
            {tab === "SENT"
              ? "보낸 연락처 요청이 없어요."
              : "받은 연락처 요청이 없어요."}
          </Empty>
        )}
        <Note>
          연락처 요청은 상대가 수락할 때만 요청한 사람의 보석 1개가 차감돼요.
        </Note>
      </Panel>
    </MyPageFrame>
  );
}

const Tabs = styled.div`
  display: flex;
  gap: 0.7rem;
  button {
    flex: 1;
    min-height: 3.8rem;
    border: 0.1rem solid #dfe5dc;
    border-radius: 99px;
    background: #fff;
    color: #536057;
    font-size: 1.2rem;
  }
  button.selected {
    border-color: var(--green);
    background: var(--green);
    color: #273219;
    font-weight: 700;
  }
`;

const Empty = styled.p`
  margin-top: 1.8rem;
  padding: 3.2rem 1rem;
  border-radius: 1rem;
  background: #f7f9f4;
  color: #7d877a;
  font-size: 1.2rem;
  line-height: 1.7;
  text-align: center;
  button {
    margin-top: 1rem;
    padding: 0.8rem 1.4rem;
    border: 0;
    border-radius: 1rem;
    background: var(--green);
    color: #273219;
    font-weight: 700;
  }
`;

const Rows = styled.ul`
  display: grid;
  gap: 0.9rem;
  margin-top: 1.8rem;
  padding: 0;
  list-style: none;
  li {
    display: grid;
    gap: 1rem;
    padding: 1.4rem;
    border: 0.1rem solid #e1e8dc;
    border-radius: 1.2rem;
    background: #fff;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .copy {
    display: grid;
    min-width: 0;
    gap: 0.5rem;
  }
  time {
    color: #7d877a;
    font-size: 1.1rem;
  }
  strong {
    overflow-wrap: anywhere;
    color: #202820;
    font-size: 1.3rem;
  }
  .link {
    color: #2f5d43;
    font-size: 1.15rem;
    font-weight: 600;
    text-decoration: none;
  }
  .badge {
    flex: 0 0 auto;
    padding: 0.4rem 0.9rem;
    border-radius: 99px;
    background: #f0f2ed;
    color: #7d877a;
    font-size: 1.05rem;
    font-weight: 700;
  }
  .badge.accepted {
    background: #f2ffd1;
    color: #5f7a22;
  }
  .badge.rejected {
    background: #fbeeec;
    color: #b0574c;
  }
  .answer {
    display: grid;
    gap: 0.8rem;
  }
  .hint {
    color: #8a7a5c;
    font-size: 1.05rem;
    line-height: 1.5;
  }
  .hint a {
    color: inherit;
    text-decoration: underline;
  }
  .buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }
  .buttons button {
    min-height: 4rem;
    border: 0;
    border-radius: 1rem;
    background: var(--green);
    color: #273219;
    font-size: 1.2rem;
    font-weight: 700;
  }
  .buttons button.reject {
    border: 0.1rem solid #e2e8dc;
    background: #fff;
  }
  .buttons button:disabled {
    background: #f0f2ed;
    color: #a1a89c;
  }
`;

const Note = styled.p`
  margin-top: 1.4rem;
  color: #8a938b;
  font-size: 1.05rem;
  line-height: 1.6;
`;
